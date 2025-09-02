#!/usr/bin/env python3
# filepath: /Users/aivo/Downloads/Arendus/Ilmajaam/ilmcharts/bin/get_wsds.py

"""
WSDS archive generator (Python port of wsds-archive-gen.php)

Features:
- Reads DB credentials from bin/jaamconf.php
- Queries wsds table for specified station(s) and time range
- Aggregates to 5-minute boundaries (vector-avg for wind direction weighted by wind speed,
  mean for wind_speed, max for wind_gust, mean for other numeric fields)
- Writes archives to public/arhiiv/<station>/ARC-YYYY-MM-DD.txt with a header
- Maintains public/arhiiv/<station>/last.txt with the last ~6 data rows

CLI examples:
- python bin/get_wsds.py --debug                       # default last 24h, all stations
- python bin/get_wsds.py --hours 48 --station vortsjarv_tamme
- python bin/get_wsds.py --time "2013-05-25 15:40:12" --hours 24 --station parnu_aloha
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

# Reuse common parser/config to align flags and use obs_fields ordering
from weather_common import (
    BaseConfig,
    common_main,
    common_process_stations,
    create_common_parser,
    configure_common_args,
    determine_base_path,
    get_last_timestamp,
    get_last_data,
    compare_data_values,
    get_output_paths,
    ensure_file_header,
    safe_name_function,
    # shared utils
    parse_mysql_datetime,
    test_minute_boundary,
    s_mean,
    wd_avg,
    get_laststamp_seconds,
    mkdirp,
    read_php_db_config,
    get_mysql_connection,
)


# ------------------------
# Station configuration
# ------------------------

class WSDSConfig(BaseConfig):
    """WSDS-specific configuration extending BaseConfig"""
    def __init__(self):
        super().__init__()
        # WSDS-specific settings
        self.data_dir = "wsds_data_new"
        self.baseurl = 'http://ilm.majasa.ee'
        
        # WSDS-specific timestamp options
        self.force_save_minutes = 18
        self.force_save = False
        self.use_5min_intervals = True
        self.use_system_time = False
        self.system_time_round_minutes = 5
        self.stations: Dict[str, str] = {
            'vortsjarv_tamme': 'TammeSurf',
            'vortsjarv_joesuu': 'Joesuu',
            'peipsi_nina': 'MobileSurf',
            'peipsi_rapina': 'Rapinasurf',
            'parnu_aloha': 'AlohaParnu',
            'saadjarv_saadjarve': 'Saadjarv',
        }

        # WSDS native fields from DB (for reference)
        self.WSDS_FIELDS: List[str] = [
            'temperature', 'heat_index', 'dewpoint', 'wind_direction',
            'wind_speed', 'wind_gust', 'humidity', 'pressure', 'rain'
        ]

        self.PUHVERAEG_SECONDS = 20 + 60 * 5  # 20 seconds + 5 minutes


# timestamp formatting uses weather_common.format_timestamp via common_process_stations

def add_wsds_specific_args(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument('--time', dest='time', type=str, help='MySQL datetime "YYYY-MM-DD HH:MM:SS" (defaults to now)')
    parser.add_argument('--hours', dest='hours', type=int, default=24, help='Time range in hours before --time (default: 24)')
    parser.add_argument('--station', dest='station', type=str, help='Station to process (folder name or index)')
    parser.add_argument('--all', dest='all', action='store_true', help='Process all stations (default if no --station)')
    parser.add_argument('--tz-shift', dest='tz_shift', type=int, default=0, help='Shift query window by N hours (useful if DB times are UTC)')
    return parser


def create_parser() -> argparse.ArgumentParser:
    return create_common_parser('WSDS archive generator (Python)', add_wsds_specific_args)


def configure_from_args(config: WSDSConfig, args: argparse.Namespace) -> None:
    """Configure WSDS config from command line arguments"""
    # Apply common flags
    configure_common_args(config, args)
    # WSDS-specific args we need later in hooks
    config.arg_time = getattr(args, 'time', None)
    config.arg_hours = getattr(args, 'hours', 24)
    config.arg_station = getattr(args, 'station', None)
    config.arg_all = getattr(args, 'all', False)
    config.tz_shift = getattr(args, 'tz_shift', 0)


def resolve_station_selection(arg_station: Optional[str], all_flag: bool, cfg) -> List[str]:
    station_keys = list(cfg.stations.keys())
    if arg_station:
        # Accept index or folder name
        if arg_station.isdigit():
            idx = int(arg_station)
            if 0 <= idx < len(station_keys):
                return [station_keys[idx]]
        if arg_station in station_keys:
            return [arg_station]
        print(f"Unknown station '{arg_station}'. Valid: {', '.join(station_keys)}")
        sys.exit(1)
    # Default all
    return station_keys


def download_data(_cfg: WSDSConfig):
    """No remote download for WSDS; return a truthy placeholder for the pipeline."""
    return True


def parse_data(config: WSDSConfig, _data_placeholder) -> List[str]:
    """Select stations and compute time window; return list of station folders."""
    # Compute time window
    end_time = parse_mysql_datetime(config.arg_time) if getattr(config, 'arg_time', None) else dt.datetime.now()
    start_time = end_time - dt.timedelta(hours=getattr(config, 'arg_hours', 24))
    # Apply optional timezone shift to query window
    if getattr(config, 'tz_shift', 0):
        shift = dt.timedelta(hours=int(config.tz_shift))
        end_time = end_time + shift
        start_time = start_time + shift
    config.dt = end_time  # For consistency with common modules (used in logs)
    config.wsds_start_time = start_time
    config.wsds_end_time = end_time

    # Resolve station selection
    stations = resolve_station_selection(config.arg_station, config.arg_all, config)
    if getattr(config, 'debug', False) and config.arg_station:
        print(f"Jaam: {config.arg_station}")
    if getattr(config, 'debug', False):
        print(f"Sisendaeg: {end_time}")
        print(f"Ajaraam: last {getattr(config, 'arg_hours', 24)} hours")
    return stations


def process_stations(config: WSDSConfig, stations: List[str]) -> None:
    """Connect to DB and process each station over the time window."""
    # Locate DB config
    conf_path = Path(__file__).resolve().parent / 'jaamconf.php'
    host, user, password, database = read_php_db_config(conf_path)
    if not host or not user or not database:
        print(f"DB credentials missing or invalid in {conf_path}")
        return

    try:
        conn = get_mysql_connection(host, user, password, database)
    except Exception:
        return

    base_dir = config.base_path if isinstance(config.base_path, Path) else determine_base_path(None, __file__)
    try:
        for station_folder in stations:
            if config.debug:
                print(f"Processing {station_folder} from {config.wsds_start_time} to {config.wsds_end_time}")
            process_station(
                conn,
                station_folder,
                base_dir,
                config.wsds_start_time,
                config.wsds_end_time,
                config.debug,
                cfg=config,
            )
    finally:
        try:
            conn.close()
        except Exception:
            pass


def query_rows(conn, station_db_id: str, start_dt: dt.datetime, end_dt: dt.datetime, debug: bool=False) -> List[Tuple]:
    sql = (
        "SELECT time, temperature, heat_index, dewpoint, wind_direction, wind_speed, wind_gust, humidity, pressure, rain "
        "FROM wsds WHERE station_id=%s AND time BETWEEN %s AND %s ORDER BY time ASC"
    )
    params = (station_db_id, start_dt.strftime('%Y-%m-%d %H:%M:%S'), end_dt.strftime('%Y-%m-%d %H:%M:%S'))
    rows: List[Tuple] = []
    # Use a generic cursor interface
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
    except Exception as e:
        print(f"DB query failed for {station_db_id}: {e}")
    if debug:
        print(f"Query {station_db_id}: {len(rows)} rows from {start_dt} to {end_dt}")
    return rows


def process_station(conn, station_folder: str, base_dir: Path, start_dt: dt.datetime, end_dt: dt.datetime, debug: bool=False, output_fields: Optional[List[str]] = None, cfg=None) -> None:
    assert cfg is not None, 'WSDSConfig (cfg) is required'
    station_db_id = cfg.stations.get(station_folder, station_folder)
    rows = query_rows(conn, station_db_id, start_dt, end_dt, debug)
    if not rows:
        if debug:
            # Try to discover min/max time in table for this station
            try:
                cur = conn.cursor()
                cur.execute("SELECT MIN(time), MAX(time) FROM wsds WHERE station_id=%s", (station_db_id,))
                r = cur.fetchone()
                cur.close()
                print(f"No rows for {station_folder} in window {start_dt}..{end_dt}. Station range: {r}")
            except Exception as e:
                print(f"No rows for {station_folder} and failed range check: {e}")
        return

    # Honor --dirmode similar to other get_*.py scripts
    station_dir = base_dir / cfg.data_dir
    
    # Aggregation buffers
    tdata: Dict[int, List[float]] = {}
    data_lines_per_date: Dict[str, List[str]] = {}
    laststamp_per_date: Dict[str, int] = {}

    prev_minute: Optional[int] = None
    prev_date_str: Optional[str] = None

    def flush_if_needed(now_dt: dt.datetime) -> None:
        nonlocal tdata, prev_minute, prev_date_str, output_fields
        date_str = now_dt.strftime('%Y-%m-%d')
        # Ensure directory exists for target files (common path will also handle it)
        out_path, last_path, station_dir_path = get_output_paths(
            base_dir, cfg.data_dir, station_folder, date_str, cfg.dirmode
        )
        mkdirp(out_path.parent)
        # Ensure header exists for archive file
        ensure_file_header(out_path, 'time\t' + "\t".join(cfg.obs_fields) + "\n")

        if date_str not in laststamp_per_date:
            laststamp_per_date[date_str] = get_laststamp_seconds(out_path)
        laststamp = laststamp_per_date[date_str]
        nowstamp = int(now_dt.replace(second=0, microsecond=0).timestamp())

        # Buffer guard: skip writing if same 5-minute boundary was already written
        if laststamp and laststamp == nowstamp:
            # Reset buffers to avoid duplicate write
            tdata = {}
            if debug:
                print(f"Skipping duplicate write for {now_dt.strftime('%H:%M')} (already written)")
            return

        # Aggregate WSDS-native values first
        temp = s_mean(tdata.get(1, [])) if tdata.get(1) else 0.0
        heat_index = s_mean(tdata.get(2, [])) if tdata.get(2) else 0.0
        dewpoint = s_mean(tdata.get(3, [])) if tdata.get(3) else 0.0
        wind_dir = wd_avg(tdata.get(4, []) or [], tdata.get(5, []) or []) if tdata.get(4) else 0.0
        wind_speed = s_mean(tdata.get(5, [])) if tdata.get(5) else 0.0
        wind_gust = round(max(tdata.get(6, [])) if tdata.get(6) else 0.0, 1)
        humidity = s_mean(tdata.get(7, [])) if tdata.get(7) else 0.0
        pressure = s_mean(tdata.get(8, [])) if tdata.get(8) else 0.0
        rain = s_mean(tdata.get(9, [])) if tdata.get(9) else 0

        # Map to common obs_fields keys
        mapped_values: Dict[str, Optional[float]] = {
            'airtemperature': temp,
            'winddirection': wind_dir,
            'windspeed': wind_speed,
            'windspeedmax': wind_gust,
            'relativehumidity': humidity,
            'airpressure': pressure,
            'precipitations': rain,
            # extras not in obs_fields but preserved
            'heat_index': heat_index,
            'dewpoint': dewpoint,
            'waterlevel': '',
            'waterlevel_eh2000': '',
            'watertemperature': '',
            'uvindex': '',
            'sunshineduration': ''
        }

    # Build a station dict to feed common_process_stations
        station_obj: Dict[str, object] = {'name': station_folder}
        # Set the framework timestamp used by common_process_stations
        cfg.dt = now_dt
        # Populate values in cfg.obs_fields order
        for key in cfg.obs_fields:
            station_obj[key] = mapped_values.get(key, '')
        # Process one station row via common path
        hooks = {
            'get_station_name': lambda st: st['name'],
            'get_metadata_func': lambda _cfg: (lambda field, st: ''),
            'get_safe_name': lambda name: name,
        }
        # Common function expects a list of station dicts
        common_process_stations(cfg, [station_obj], hooks)
        # Reset buffers
        tdata = {}

    for row in rows:
        # row[0] is datetime. Depending on connector, it may be dt, or str.
        try:
            row_dt = row[0] if isinstance(row[0], dt.datetime) else dt.datetime.strptime(str(row[0]), '%Y-%m-%d %H:%M:%S')
        except Exception:
            # Try alternate
            row_dt = dt.datetime.fromisoformat(str(row[0]))
        now_date_str = row_dt.strftime('%Y-%m-%d')
        now_minute = row_dt.minute

        # On date change, we will continue writing into a new file automatically at flush time
        if prev_date_str is None:
            prev_date_str = now_date_str

        # Improved flush logic: accumulate data in buckets by 5-minute boundaries
        # and flush when we move to a new boundary
        current_boundary = (now_minute // 5) * 5
        
        # Check if we need to flush accumulated data
        do_flush = False
        flush_dt = None
        
        if prev_minute is not None and tdata:
            prev_boundary = (prev_minute // 5) * 5
            
            # Flush if we've moved to a different 5-minute boundary
            if current_boundary != prev_boundary:
                do_flush = True
                # Calculate flush timestamp: use previous row's time rounded to boundary
                # We'll construct this from the previous minute and current row's date/hour
                flush_dt = row_dt.replace(minute=prev_boundary, second=0, microsecond=0)
                
                # Handle hour boundary crossing (e.g., from 59 to 0)
                if prev_minute >= 55 and now_minute <= 5:
                    # Crossed hour boundary, flush time should be in previous hour
                    flush_dt = flush_dt - dt.timedelta(hours=1)
                    flush_dt = flush_dt.replace(minute=prev_boundary)
                    
            # Also handle date changes and large gaps
            elif now_minute < prev_minute or (now_minute - prev_minute) > 10:
                do_flush = True
                flush_dt = row_dt.replace(minute=prev_boundary, second=0, microsecond=0)

        # Flush accumulated data BEFORE processing current row if boundary changed
        if do_flush and flush_dt:
            if debug:
                print(f"Flushing at {flush_dt.strftime('%H:%M')} (accumulated {sum(len(v) for v in tdata.values())} values)")
            flush_if_needed(flush_dt)

        # Accumulate values for this record
        for i in range(1, 9):
            v = row[i]
            if v is None or (isinstance(v, str) and not v.strip()):
                # store nothing
                continue
            try:
                num = float(v)
            except Exception:
                continue
            tdata.setdefault(i, []).append(num)

        prev_minute = now_minute
        prev_date_str = now_date_str

    # End: flush any remaining buffer
    if tdata:
        last_dt = rows[-1][0] if isinstance(rows[-1][0], dt.datetime) else dt.datetime.strptime(str(rows[-1][0]), '%Y-%m-%d %H:%M:%S')
        last_boundary = (last_dt.minute // 5) * 5
        last_boundary_time = last_dt.replace(minute=last_boundary, second=0, microsecond=0)
        
        # Determine if this is a CLI run (with --hours or --time) vs cron run
        # CLI runs typically have larger datasets or specific time windows
        is_cli_run = len(sys.argv) > 1 and ('--hours' in sys.argv or '--time' in sys.argv)
        is_small_dataset = len(rows) < 30
        
        if is_cli_run:
            # CLI Mode: Process specified time range, save up to last complete 5-min boundary
            # Always flush remaining data - CLI users want to process all available data
            if debug:
                print(f"CLI mode: Final flush at {last_boundary_time.strftime('%H:%M')} (accumulated {sum(len(v) for v in tdata.values())} values)")
            flush_if_needed(last_boundary_time)
        
        elif is_small_dataset:
            # Cron Mode with small dataset: likely catching up on recent data
            # Use next boundary for proper timestamp (e.g., 11:35 for data 11:31-11:34)
            flush_time = last_boundary_time + dt.timedelta(minutes=5)
            if debug:
                print(f"Cron mode (small): Final flush at {flush_time.strftime('%H:%M')} (accumulated {sum(len(v) for v in tdata.values())} values)")
            flush_if_needed(flush_time)
        
        else:
            # Cron Mode with large dataset: processing historical backlog
            # Use boundary time for historical data
            if debug:
                print(f"Cron mode (large): Final flush at {last_boundary_time.strftime('%H:%M')} (accumulated {sum(len(v) for v in tdata.values())} values)")
            flush_if_needed(last_boundary_time)

    # No manual write-out: lines were written via common_process_stations


def main() -> int:
    hooks = {
        'create_parser': create_parser,
        'configure_from_args': configure_from_args,
        'download_data': download_data,
        'parse_data': parse_data,
        'process_stations': process_stations,
        'config_class': WSDSConfig,
        'script_file': __file__,
    }
    ok = common_main(hooks)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
