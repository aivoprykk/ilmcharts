#!/usr/bin/env python3
# filepath: /Users/aivo/Downloads/Arendus/Ilmajaam/ilmcharts/bin/weather_common.py

"""
Common utilities for weather data parsers (EMHI and TTU)
"""

import csv
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Increase CSV field size limit
csv.field_size_limit(sys.maxsize)

class BaseConfig:
    """Base configuration class with common settings"""
    def __init__(self):
        self.debug = False
        self.user_agent = '//ilm.majasa.ee/'
        self.base_path = None
        self.data_dir = "data_new"
        self.dirmode = 'station'
        self.dt = None
        self.last_file_lines = 6
        self.source_is_local = False
        self.force_metadata = False

        # Common observation fields structure
        self.obs_fields = [
            'waterlevel', 'waterlevel_eh2000',
            'watertemperature', 'airtemperature',
            'windspeed', 'windspeedmax', 'winddirection',
            'precipitations', 'relativehumidity', 'airpressure',
            'uvindex', 'sunshineduration'
        ]

        self.meta_fields = [
            'name', 'wmocode', 'longitude', 'latitude', 'first_record', 'source'
        ]
        # EMHI-specific download and data settings
        self.download = {
            'enabled': True,
            'interval_minutes': 5,
            'force_download': True,
            'enable_rounding': False,
            'round_minutes': 10
        }
        self.data = {
            'enabled': True,
            'force_save': False,
            'force_save_minutes': 18,
            'enable_rounding': True,
            'round_minutes': 10
        }
        self.is_first_run = True

def format_timestamp(dt):
    """Format datetime as yyyymmdd hh:mm"""
    return dt.strftime("%Y%m%d %H:%M")

def round_timestamp_down(dt, round_minutes=5):
    """Round timestamp down to the nearest round_minutes interval"""
    minutes = dt.minute
    rounded_minutes = (minutes // round_minutes) * round_minutes
    return dt.replace(minute=rounded_minutes, second=0, microsecond=0)

def normalize_value(value):
    """Normalize a value for comparison/output.

    Rules:
    - Preserve numeric 0 (0, 0.0) as '0'
    - Preserve non-empty strings/numbers via str(value).strip()
    - Convert None to ''
    - Leave empty strings as ''
    """
    if value is None:
        return ''
    # Always return the string form; this preserves 0 -> '0' and keeps '' as ''
    return str(value).strip()

def safe_name_function(station_name):
    """Create safe directory/file name from station name"""
    # Replace parentheses with single space for cleaner conversion
    cleaned = station_name.replace('(', ' ').replace(')', ' ')
    # Replace any non-alphanumeric with underscore
    safe_name = "".join(c if c.isalnum() else '_' for c in cleaned)
    # Clean up multiple consecutive underscores
    safe_name = re.sub(r'_+', '_', safe_name).strip('_')
    return safe_name

def get_last_data(file_path):
    """Get the last data row from an existing file for comparison"""
    if not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            if lines:
                last_line = lines[-1].strip()
                if last_line:
                    # Parse the tab-separated values back into a dict for comparison
                    parts = last_line.split('\t')
                    if len(parts) >= 2:  # At least timestamp + some data
                        # Return all values except timestamp (first part for TTU: "yyyymmdd hh:mm", 
                        # first 2 parts for EMHI: "yyyymmdd" + "hh:mm")
                        # Check if first part contains both date and time (TTU format)
                        if len(parts[0]) > 8:  # "yyyymmdd hh:mm" format (TTU)
                            return parts[1:]  # Skip combined timestamp
                        else:  # "yyyymmdd" "hh:mm" format (EMHI)
                            return parts[1:]  # Skip date, keep time and data
    except Exception as e:
        print(f"Error reading last data from {file_path}: {e}")
    
    return None

def get_last_timestamp(file_path):
    """Get the last timestamp from an existing data file"""
    if not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            if lines:
                last_line = lines[-1].strip()
                if last_line:
                    # Extract timestamp from first column(s)
                    parts = last_line.split('\t')
                    if len(parts) >= 1:
                        # Check format: either "yyyymmdd hh:mm" or "yyyymmdd" + "hh:mm"
                        if len(parts[0]) > 8:  # Combined format "yyyymmdd hh:mm"
                            timestamp_str = parts[0]
                            try:
                                return datetime.strptime(timestamp_str, "%Y%m%d %H:%M")
                            except ValueError:
                                pass
                        elif len(parts) >= 2:  # Separate format "yyyymmdd" "hh:mm"
                            timestamp_str = f"{parts[0]} {parts[1]}"
                            try:
                                return datetime.strptime(timestamp_str, "%Y%m%d %H:%M")
                            except ValueError:
                                pass
    except Exception as e:
        print(f"Error reading last timestamp from {file_path}: {e}")
    
    return None

def save_metadata(station_dir, station_data, meta_fields, get_metadata_value_func, force_metadata=False, debug=False):
    """Save metadata file for the station"""
    meta_file = station_dir / "meta.csv"
    
    if not os.path.exists(meta_file) or force_metadata:
        try:
            with open(meta_file, 'w', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(meta_fields)
                data_row = [get_metadata_value_func(field, station_data) for field in meta_fields]
                writer.writerow(data_row)
            if debug:
                action = "Updated" if os.path.exists(meta_file) else "Created"
                station_name = station_data.get('name', 'Unknown')
                print(f"{action} metadata file for {station_name}")
        except Exception as e:
            print(f"Error creating meta file: {e}")

def compare_data_values(current_values, last_values, obs_fields, debug=False, station_name=""):
    """Compare current and last data values, return (data_changed, comparison_info)"""
    data_changed = True
    
    if last_values is not None:
        # Normalize last values the same way (just strip whitespace)
        normalized_last_values = [normalize_value(v) for v in last_values]
        
        # Ensure we compare the same number of fields
        min_length = min(len(normalized_last_values), len(current_values))
        if min_length > 0:
            current_compare = current_values[:min_length]
            last_compare = normalized_last_values[:min_length]
            data_changed = (current_compare != last_compare)
            
            # Debug output to see what's being compared
            if debug:
                print(f"Station: {station_name}")
                print(f"Fields: {obs_fields[:min_length]}")
                print(f"Current: {current_compare}")
                print(f"Last:    {last_compare}")
                print(f"Changed: {data_changed}")
                
            return data_changed, {
                'current': current_compare,
                'last': last_compare,
                'fields': obs_fields[:min_length]
            }
        else:
            data_changed = True  # If no valid data to compare, consider changed
            if debug:
                print(f"Station: {station_name} - No valid data to compare")
    else:
        if debug:
            print(f"Station: {station_name} - No previous data found")
    
    return data_changed, None

def check_force_save_due_to_time(current_dt, last_timestamp, force_save_minutes, debug=False, station_name=""):
    """Check if enough time has passed to force save even without data changes"""
    if last_timestamp is None:
        return False
    
    time_diff = current_dt - last_timestamp
    minutes_passed = time_diff.total_seconds() / 60
    
    if minutes_passed >= force_save_minutes:
        if debug:
            print(f"Force saving {station_name} - {minutes_passed:.1f} minutes passed since last save")
        return True
    
    return False

def update_last_file(last_file: Path, max_lines: int = 6, arc_file: Path | None = None, rewrite: bool = False, filter_pattern: str = r'^\d{6,}') -> None:
    """Maintain last.txt to contain only the last max_lines rows.

    Two modes:
    - rewrite=True and arc_file provided: rebuild last.txt from the tail of the archive file
      (optionally filtering lines by regex pattern to skip headers).
    - rewrite=False: trim the existing last.txt to keep the last max_lines lines.
    """
    try:
        if rewrite and arc_file and arc_file.exists():
            try:
                lines = arc_file.read_text(encoding='utf-8').splitlines()
            except Exception:
                # Fallback to binary read if encoding causes issues
                with open(arc_file, 'rb') as f:
                    lines = f.read().decode('utf-8', errors='ignore').splitlines()

            # Filter out headers or invalid rows if pattern provided
            if filter_pattern:
                try:
                    pat = re.compile(filter_pattern)
                    lines = [ln for ln in lines if pat.match(ln)]
                except re.error:
                    pass

            tail = lines[-max_lines:] if len(lines) > max_lines else lines
            last_file.parent.mkdir(parents=True, exist_ok=True)
            with open(last_file, 'w', encoding='utf-8') as f:
                f.write("\n".join(tail) + ("\n" if tail else ""))
            return

        # Default: trim last_file in-place
        if not last_file.exists():
            return
        with open(last_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        if len(lines) > max_lines:
            with open(last_file, 'w', encoding='utf-8') as f:
                f.writelines(lines[-max_lines:])
    except Exception as e:
        print(f"Warning: Could not maintain {last_file.name}: {e}")

def save_data_files(arc_file, last_file, data_row, max_last_lines=6, debug=False, station_name=""):
    """Save data to both archive and last files"""
    try:
        # Append to archive file
        with open(arc_file, 'a', encoding='utf-8') as f:
            f.write(data_row + '\n')
        
        # Append to last file
        with open(last_file, 'a', encoding='utf-8') as f:
            f.write(data_row + '\n')
        
        # Ensure last.txt contains only the last N rows (only when last_file is a last.txt)
        if Path(last_file).name == 'last.txt':
            update_last_file(Path(last_file), max_last_lines)
        
        if debug:
            # Extract timestamp from data_row for logging
            timestamp = data_row.split('\t')[0]
            print(f"Saved data: {station_name} at {timestamp}")
        
        return True

    except Exception as e:
        print(f"Error saving data to {arc_file}: {e}")
        return False

def determine_base_path(args_path, script_file):
    """Determine the base path for data storage"""
    if args_path:
        if args_path.startswith('./') or args_path.startswith('../'):
            # Relative path - make it relative to script directory
            script_dir = Path(script_file).parent
            if args_path.startswith('./'):
                relative_part = args_path[2:]
            else:
                relative_part = args_path
            return script_dir / relative_part
        else:
            # Absolute path or other relative path
            return Path(args_path)
    else:
        # Use script's directory as base path
        return Path(script_file).parent

    # End of determine_base_path

# --------------
# Generic utilities reused by parsers
# --------------

def parse_mysql_datetime(s: str):
    """Parse MySQL-like datetime string 'YYYY-MM-DD HH:MM:SS' to datetime"""
    return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')

def test_minute_boundary(m: int | None) -> bool:
    """Return True if minute is on a 5-minute boundary (0, 5, 10, 15, 20, etc.)"""
    if m is None:
        return False
    return (m % 5 == 0)

def s_mean(values):
    """Simple mean with rounding to 0.1"""
    try:
        vals = list(values) if values is not None else []
    except TypeError:
        vals = []
    if not vals:
        return 0.0
    return round(sum(vals) / len(vals), 1)

def wd_avg(directions, speeds):
    """Vector-average wind direction, weighting by speed (fallback 1.0 when speed missing)"""
    if not directions:
        return 0.0
    import math
    sins = 0.0
    coss = 0.0
    num = 0
    for i, wd in enumerate(directions):
        if wd is None:
            continue
        w = speeds[i] if (speeds is not None and i < len(speeds) and speeds[i]) else 1.0
        sins += w * math.sin(wd * math.pi / 180)
        coss += w * math.cos(wd * math.pi / 180)
        num += 1
    if num == 0:
        return 0.0
    as_ = (-1 * (1 / num) * sins)
    ac_ = (-1 * (1 / num) * coss)
    if as_ == 0:
        if ac_ < 0:
            c = 0.0
        elif ac_ > 0:
            c = 180.0
        else:
            c = 0.0
    else:
        c = 90 - (math.atan(ac_ / as_) * 180 / math.pi)
        if as_ > 0:
            c += 180
    return round(c if c else 0.0, 1)

def get_laststamp_seconds(path: Path) -> int:
    last_dt = get_last_timestamp(path)
    return int(last_dt.timestamp()) if last_dt else 0

def mkdirp(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

def add_content(path: Path, data: str, mode: str = 'a') -> None:
    # Ensure parent exists and append or write
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'a' if mode == 'a' else 'w', encoding='utf-8') as f:
        f.write(data)

def ensure_file_header(file_path: Path, header_line: str) -> None:
    """Ensure a file exists and starts with the given header line.

    Only writes the header when the file does not exist or is empty.
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if not file_path.exists() or file_path.stat().st_size == 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            # Ensure header ends with newline
            if not header_line.endswith('\n'):
                header_line = header_line + '\n'
            f.write(header_line)

def trim_last_file(last_file, max_lines=6):
    """Backward-compatible wrapper: trim last.txt in-place."""
    update_last_file(Path(last_file), max_lines)

def wrap_last_rows(big_file: Path, last_file: Path, keep: int = 6) -> None:
    """Backward-compatible wrapper: rebuild last.txt from archive tail."""
    update_last_file(Path(last_file), keep, arc_file=Path(big_file), rewrite=True)

def http_request(
    url: str,
    method: str = 'GET',
    params: dict | None = None,
    data: dict | bytes | None = None,
    headers: dict | None = None,
    timeout: int | float = 10,
    decode: bool = True,
    encoding: str = 'utf-8',
    debug: bool = False,
):
    """Generic HTTP request helper used by source downloaders.

    - Supports GET with optional query params and POST with form-encoded data.
    - Returns str when decode=True, else raw bytes.
    - Adds a default User-Agent if not provided.
    """
    import urllib.request
    import urllib.parse

    try:
        # Apply query params for GET-like requests
        if params:
            qs = urllib.parse.urlencode(params)
            sep = '&' if ('?' in url) else '?'
            url = f"{url}{sep}{qs}"

        # Prepare body for POST when dict provided
        body = None
        if data is not None:
            if isinstance(data, dict):
                body = urllib.parse.urlencode(data).encode('utf-8')
            elif isinstance(data, (bytes, bytearray)):
                body = data
            else:
                raise TypeError("data must be dict or bytes when provided")

        # Default headers
        ua = None
        # Allow callers to pass a config-like object via headers special key if needed
        if headers and 'X-Config-UA' in headers:
            ua = headers.pop('X-Config-UA')
        final_headers = {
            'User-Agent': ua or '//ilm.majasa.ee/'
        }
        if headers:
            final_headers.update(headers)

        if debug:
            dbg = f"HTTP {method} {url}"
            if params:
                dbg += f" params={params}"
            if isinstance(data, dict):
                dbg += f" data(keys)={list(data.keys())}"
            print(dbg)

        req = urllib.request.Request(url, data=body, headers=final_headers, method=method.upper())
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if getattr(resp, 'status', 200) == 200:
                raw = resp.read()
                return raw.decode(encoding, errors='replace') if decode else raw
            else:
                print(f"HTTP error {getattr(resp, 'status', 'unknown')}")
                return None
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def get_output_paths_for_dt(config, station_name: str, dt: datetime):
    """Convenience helper to get archive/last paths for a specific datetime.

    Returns (arc_file, last_file, station_dir)
    """
    date_str = dt.strftime('%Y-%m-%d')
    return get_output_paths(
        config.base_path, getattr(config, 'data_dir', 'data_new'), station_name,
        date_str, getattr(config, 'dirmode', 'station'), getattr(config, 'debug', False)
    )

def apply_generic_timestamp_adjustment(config, station_data: dict, station_name: str, increment_minutes: int = 5):
    """Generic timestamp adjustment logic used by multiple parsers.

    - If current timestamp equals last and data changed, bump by increment_minutes.
    - If current timestamp is older than last:
        * For local files: allow if allow_older_data, or bump sequentially if sequential_timestamps, else skip.
        * For live: accept as 'saved_older_live'.
    - If newer, accept as-is. If no previous, accept as first.

    Returns a tuple (original_dt, adjusted_dt, action).
    """
    if not getattr(config, 'use_5min_intervals', True) or 'timestamp' not in station_data:
        return None, None, 'no_adjustment'

    original_dt = station_data.get('timestamp')
    if not original_dt:
        return None, None, 'no_timestamp'

    current_dt = original_dt
    config.dt = current_dt

    # Resolve archive path for this datetime
    arc_file, _last_file, _station_dir = get_output_paths_for_dt(config, station_name, current_dt)

    # Read last timestamp and data row
    last_timestamp = get_last_timestamp(arc_file)
    last_data = get_last_data(arc_file) if last_timestamp else None

    if getattr(config, 'debug', False):
        print(f"Current data timestamp: {current_dt}")
        print(f"Last saved timestamp: {last_timestamp}")

    if last_timestamp and last_data:
        if current_dt == last_timestamp:
            # Compare values in the configured observation fields
            current_values = [normalize_value(station_data.get(field, '')) for field in config.obs_fields]
            data_changed, _ = compare_data_values(
                current_values, last_data, config.obs_fields, getattr(config, 'debug', False), station_name
            )
            if data_changed:
                adjusted_dt = current_dt + timedelta(minutes=increment_minutes)
                config.dt = adjusted_dt
                station_data['timestamp'] = adjusted_dt
                if getattr(config, 'debug', False):
                    print(f"Data changed with same timestamp {current_dt} -> adjusting to {adjusted_dt}")
                return original_dt, adjusted_dt, 'adjusted_same_timestamp_different_data'
            else:
                if getattr(config, 'debug', False):
                    print(f"Duplicate data with same timestamp {current_dt} - skipping")
                return original_dt, None, 'skipped_duplicate'
        elif current_dt < last_timestamp:
            is_local_file = hasattr(config, 'local_file') and config.local_file is not None
            if is_local_file:
                if getattr(config, 'allow_older_data', False):
                    if getattr(config, 'debug', False):
                        print(f"Allowing older data with original timestamp (local file): {current_dt}")
                    return original_dt, current_dt, 'saved_older'
                elif getattr(config, 'sequential_timestamps', False):
                    adjusted_dt = last_timestamp + timedelta(minutes=increment_minutes)
                    config.dt = adjusted_dt
                    station_data['timestamp'] = adjusted_dt
                    if getattr(config, 'debug', False):
                        print(f"Sequential mode (local file): Older data {current_dt} adjusted to {adjusted_dt}")
                    return original_dt, adjusted_dt, 'adjusted_sequential'
                else:
                    if getattr(config, 'debug', False):
                        print(f"Skipping older data from local file: {current_dt} < last saved {last_timestamp}")
                    return original_dt, None, 'skipped_older'
            else:
                if getattr(config, 'debug', False):
                    print(f"Warning: Live data has older timestamp {current_dt} < {last_timestamp}")
                return original_dt, current_dt, 'saved_older_live'
        else:
            if getattr(config, 'debug', False):
                print(f"Newer data timestamp {current_dt} > {last_timestamp} - using original")
            return original_dt, current_dt, 'saved_newer'
    else:
        if getattr(config, 'debug', False):
            print(f"No previous data - using original timestamp {current_dt}")
        return original_dt, current_dt, 'saved_first'

def handle_ts_adjustment(config, station_data: dict, label: str, increment_minutes: int = 5):
    """Common wrapper around apply_generic_timestamp_adjustment with debug/skip handling.

    Returns a tuple: (skipped: bool, action: str, original_dt: datetime|None, adjusted_dt: datetime|None)

    Behavior:
    - Calls apply_generic_timestamp_adjustment with given increment.
    - Emits consistent debug output about adjustments/saves/skips.
    - Returns skipped=True for 'skipped_older' and 'skipped_duplicate' actions.
    """
    original_dt, adjusted_dt, action = apply_generic_timestamp_adjustment(
        config, station_data, label, increment_minutes
    )

    debug = getattr(config, 'debug', False)
    if action in ['skipped_older', 'skipped_duplicate']:
        if debug:
            print(f"Skipped {label} - {action}: {original_dt}")
        return True, action, original_dt, adjusted_dt

    if debug:
        if action.startswith('adjusted') and adjusted_dt is not None and adjusted_dt != original_dt:
            print(f"Adjusted timestamp from {original_dt} to {adjusted_dt} ({action})")
        elif action.startswith('saved'):
            if adjusted_dt is not None and adjusted_dt != original_dt:
                print(f"Saved data with adjusted timestamp: {original_dt} -> {adjusted_dt} ({action})")
            else:
                print(f"Saved data with original timestamp: {original_dt} ({action})")
        print(f"Station: {label}, Time: {config.dt}")

    return False, action, original_dt, adjusted_dt

# --------------
# DB helpers for sources that use MySQL
# --------------

def read_php_db_config(conf_path: Path):
    """Read simple PHP-style DB config with $user, $password, $host, $database"""
    user = password = host = database = ''
    try:
        text = conf_path.read_text(encoding='utf-8')
        m = re.search(r"\$user\s*=\s*'([^']*)'", text)
        if m:
            user = m.group(1)
        m = re.search(r"\$password\s*=\s*'([^']*)'", text)
        if m:
            password = m.group(1)
        m = re.search(r"\$host\s*=\s*'([^']*)'", text)
        if m:
            host = m.group(1)
        m = re.search(r"\$database\s*=\s*'([^']*)'", text)
        if m:
            database = m.group(1)
    except Exception as e:
        print(f"Error reading db config: {e}")
    return host, user, password, database

def get_mysql_connection(host: str, user: str, password: str, database: str):
    """Return a MySQL connection using mysql-connector or PyMySQL as fallback"""
    try:
        import mysql.connector  # type: ignore
        return mysql.connector.connect(host=host, user=user, password=password, database=database)
    except Exception:
        try:
            import pymysql  # type: ignore
            return pymysql.connect(host=host, user=user, password=password, database=database, cursorclass=pymysql.cursors.Cursor)
        except Exception:
            print('No MySQL client installed. Install one of:')
            print('  pip install mysql-connector-python')
            print('  or')
            print('  pip install PyMySQL')
            raise

def has_any_observations(station_data, obs_fields):
    """Check if station has any non-empty observation values.

    Treat numeric 0 as a valid observation; only None or truly empty strings are empty.
    """
    for field in obs_fields:
        value = station_data.get(field, '')
        # Normalize and then check emptiness; normalize_value preserves 0 as '0'
        normalized = normalize_value(value)
        if normalized != '':
            return True
    return False

def get_last_download_timestamp(base_dir, debug=False):
    """Get the last download timestamp from the global last.txt file"""
    last_download_file = base_dir / "last.txt"
    
    if not os.path.exists(last_download_file):
        return None
    
    try:
        with open(last_download_file, 'r', encoding='utf-8') as f:
            timestamp_str = f.read().strip()
            if timestamp_str:
                return datetime.strptime(timestamp_str, "%Y%m%d %H:%M")
    except Exception as e:
        if debug:
            print(f"Error reading last download timestamp: {e}")
    
    return None

def save_last_download_timestamp(dt, base_dir, enable_rounding, round_minutes, debug=False):
    """Save the current download timestamp to the global last.txt file"""
    last_download_file = base_dir / "last.txt"

    # Create directory if it doesn't exist
    last_download_file.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        if enable_rounding:
            # Round down the timestamp before saving to global last.txt
            rounded_dt = round_timestamp_down(dt, round_minutes)
            formatted_timestamp = rounded_dt.strftime("%Y%m%d %H:%M")
            if debug:
                print(f"Saved last download timestamp: {formatted_timestamp} (rounded from {dt.strftime('%Y%m%d %H:%M')})")
        else:
            # Save original timestamp without rounding
            formatted_timestamp = dt.strftime("%Y%m%d %H:%M")
            if debug:
                print(f"Saved last download timestamp: {formatted_timestamp} (no rounding)")
        
        with open(last_download_file, 'w', encoding='utf-8') as f:
            f.write(formatted_timestamp)
    except Exception as e:
        print(f"Error saving last download timestamp: {e}")

def should_download(base_dir, force_download, interval_minutes, debug=False):
    """Check if enough time has passed since last download"""
    if force_download:
        return True  # Force download if flag is set

    last_download = get_last_download_timestamp(base_dir, debug=debug)
    if last_download is None:
        if debug:
            print("No previous download timestamp found - proceeding with download")
        return True
    
    current_time = datetime.now()
    time_diff = current_time - last_download
    minutes_passed = time_diff.total_seconds() / 60
    
    if minutes_passed >= interval_minutes:
        if debug:
            print(f"Download allowed - {minutes_passed:.1f} minutes passed since last download")
        return True
    else:
        remaining_minutes = interval_minutes - minutes_passed
        print(f"Download skipped - only {minutes_passed:.1f} minutes passed, need {remaining_minutes:.1f} more minutes")
        return False

def should_save_rounded_data(dt, base_dir, enable_rounding, round_minutes, is_first_run, debug=False):
    """Check if we should save data based on rounded timestamp logic for global last.txt"""
    # If global rounding is disabled, always save
    if not enable_rounding:
        return True
    
    # For first run, don't apply rounding to global last.txt check
    if is_first_run:
        is_first_run = False
        return True

    last_download = get_last_download_timestamp(base_dir, debug=debug)
    if last_download is None:
        return True
    
    # Round current XML timestamp down to nearest interval
    rounded_current = round_timestamp_down(dt, round_minutes)
    
    # Round last download timestamp down to nearest interval
    rounded_last = round_timestamp_down(last_download, round_minutes)
    
    # Only save if we've moved to a new rounded interval
    if rounded_current > rounded_last:
        if debug:
            print(f"Rounded save allowed - current: {rounded_current}, last: {rounded_last}")
        return True
    else:
        if debug:
            print(f"Rounded save skipped - current: {rounded_current}, last: {rounded_last}")
        return False

def common_main(parser_hooks):
    """
    Common main function for weather parsers using hooks for parser-specific behavior
    
    parser_hooks should be a dictionary containing:
    - 'create_parser': function() -> ArgumentParser
    - 'configure_from_args': function(config, args) -> None
    - 'download_data': function(args) -> bytes/str or None
    - 'parse_data': function(data) -> list of stations/data
    - 'process_stations': function(stations/data) -> None
    - 'should_download': function() -> bool (optional)
    - 'should_save': function() -> bool (optional)
    - 'config_class': Config class to instantiate
    """
    
    # Create parser using hook
    parser = parser_hooks['create_parser']()
    args = parser.parse_args()
    
    # Create config instance
    config = parser_hooks['config_class']()
    
    # Configure from args using hook
    parser_hooks['configure_from_args'](config, args)
    
    # Determine base path
    config.base_path = determine_base_path(args.path if hasattr(args, 'path') else None, 
                                         parser_hooks.get('script_file', __file__))
    
    if config.debug:
        print(f"Saving data to: {config.base_path}")
    
    try:
        # Check if should download (if hook provided)
        if 'should_download' in parser_hooks:
            if not parser_hooks['should_download'](config):
                return
        
        # Download data using hook
        if hasattr(args, 'local') and args.local:
            if config.debug:
                print(f"{datetime.now()}: Reading local file {args.local}...")
            data = read_local_file(args.local)
        else:
            if config.debug:
                print(f"{datetime.now()}: Downloading data...")
            data = parser_hooks['download_data'](config)
        
        # Create main data directory if it doesn't exist
        config.base_path.mkdir(parents=True, exist_ok=True)
        
        if data:
            # Parse data using hook
            stations = parser_hooks['parse_data'](config, data)
            
            # Check if should save (if hook provided)
            if 'should_save' in parser_hooks:
                if not parser_hooks['should_save'](config):
                    if config.debug:
                        print("Skipping save - waiting for next interval")
                    return
            
            if stations:
                # Process stations using hook
                parser_hooks['process_stations'](config, stations)
        
        return True
        
    except KeyboardInterrupt:
        print("Script stopped by user")
        return False
    except Exception as e:
        print(f"An error occurred: {e}")
        if config.debug:
            import traceback
            traceback.print_exc()
        return False

def read_local_file(file_path):
    """Read data from a local file (XML or HTML)"""
    try:
        if file_path.lower().endswith('.xml'):
            with open(file_path, 'rb') as f:
                return f.read()
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
    except IOError as e:
        print(f"Error reading local file {file_path}: {e}")
        return None

def create_common_parser(description, parser_specific_args_func=None):
    """
    Create a common argument parser with standard weather data arguments
    
    Args:
        description: Description for the parser
        parser_specific_args_func: Optional function to add parser-specific arguments
                                 Should accept parser as argument and return parser
    """
    import argparse
    
    parser = argparse.ArgumentParser(description=description)
    
    # Common file and path arguments
    parser.add_argument('--local', help='Path to local data file (XML/HTML)', type=str)
    parser.add_argument('--path', help='Path to save data', type=str)
    parser.add_argument('--dirmode', help='Directory structure: "date" or "station" based naming (default: station)', type=str, default='station', choices=['date', 'station'])
    
    # Common debug and control arguments
    parser.add_argument('--debug', help='Enable debug output', action='store_true')
    parser.add_argument('--force-metadata', help='Force resave metadata files', action='store_true')
    parser.add_argument('--force-save', help='Force save ignoring time interval', action='store_true')
    
    # Common download timing arguments
    parser.add_argument('--dl-time-interval', help='Download time interval in minutes (disables forced downloads)', type=int)
    parser.add_argument('--dl-time-round', help='Round last download timestamp to nearest minutes (5, 10, 15, 20)', type=int, choices=[5, 10, 15, 20])
    
    # Common data rounding arguments
    parser.add_argument('--data-round', help='Round data file timestamps to nearest minutes', type=int, choices=[5, 10, 15, 20])
    parser.add_argument('--data-no-round', help='Disable data file timestamp rounding (save exact timestamps)', action='store_true')
    parser.add_argument('--data-force-save', help='Force save data even when unchanged after specified time interval', action='store_true')
    
    # Add parser-specific arguments if function provided
    if parser_specific_args_func:
        parser = parser_specific_args_func(parser)
    
    return parser

def configure_common_args(config, args):
    """
    Configure common arguments that apply to all weather parsers
    
    Args:
        config: Config instance to modify
        args: Parsed command line arguments
    """
    # Basic configuration
    config.debug = args.debug
    config.force_metadata = args.force_metadata
    config.source_is_local = bool(args.local)
    config.dirmode = args.dirmode
    
    # Download timing configuration
    if args.dl_time_interval:
        if hasattr(config, 'download') and isinstance(config.download, dict):
            config.download['force_download'] = False
            config.download['interval_minutes'] = args.dl_time_interval
    
    if args.dl_time_round:
        if hasattr(config, 'download') and isinstance(config.download, dict):
            config.download['enable_rounding'] = True
            config.download['round_minutes'] = args.dl_time_round
    
    # Data timing configuration
    if args.data_force_save:
        if hasattr(config, 'data') and isinstance(config.data, dict):
            config.data['force_save'] = True
        elif hasattr(config, 'force_save'):
            config.force_save = True
    
    if args.force_save:  # Legacy --force-save support
        if hasattr(config, 'data') and isinstance(config.data, dict):
            config.data['force_save'] = True
        elif hasattr(config, 'force_save'):
            config.force_save = True
    
    # Data rounding configuration
    if args.data_round:
        if hasattr(config, 'data') and isinstance(config.data, dict):
            config.data['enable_rounding'] = True
            config.data['round_minutes'] = args.data_round
    elif args.data_no_round:
        if hasattr(config, 'data') and isinstance(config.data, dict):
            config.data['enable_rounding'] = False

def get_output_paths(base_dir, data_dir, station_name, date_str, dirmode='station', debug=False):
    """Get archive and last file paths based on dirmode"""
    if dirmode == 'date':
        # Date-based structure: data_dir/YYYY-MM-DD/station_name.txt
        date_dir = base_dir / data_dir / date_str
        arc_file = date_dir / f"{station_name}.txt"
        last_file = arc_file  # Same file for date mode
        station_dir = date_dir  # For metadata
    else:
        # Station-based structure: data_dir/station_name/ARC-YYYY-MM-DD.txt
        station_dir = base_dir / data_dir / station_name
        arc_file = station_dir / f"ARC-{date_str}.txt"
        last_file = station_dir / "last.txt"

    if debug:
        print(f"Output paths for {station_name}:")
        print(f"  Station dir : {station_dir}")
        print(f"  Archive file: {arc_file}")
        print(f"  Last file   : {last_file}")
    return arc_file, last_file, station_dir

def common_process_stations(config, stations, hooks):
    """
    Common station processing logic with hooks for parser-specific behavior
    
    hooks should contain:
    - 'get_station_name': function(station) -> str
    - 'get_metadata_func': function(config) -> metadata_function
    - 'should_skip_station': function(station, config) -> bool (optional)
    - 'format_timestamp_func': function(config) -> timestamp_string (optional)
    - 'get_safe_name': function(station_name) -> safe_name (optional, uses safe_name_function by default)
    """
    if not stations:
        print("No station data to process")
        return 0

    date_str = config.dt.strftime("%Y-%m-%d")
    saved_count = 0
    skipped_count = 0

    for station in stations:
        # Get station name using hook
        station_name = hooks['get_station_name'](station)
        
        # Create safe name
        if 'get_safe_name' in hooks:
            safe_name = hooks['get_safe_name'](station_name)
        else:
            safe_name = safe_name_function(station_name)
        
        # Check if should skip station (optional hook)
        if 'should_skip_station' in hooks:
            if hooks['should_skip_station'](station, config):
                if config.debug:
                    print(f"Skipping {station_name} - custom skip condition")
                skipped_count += 1
                continue
        
        # Default skip check: no observations
        if not has_any_observations(station, config.obs_fields):
            if config.debug:
                print(f"Skipping {station_name} - no observations")
            skipped_count += 1
            continue

        # Create directory structure based on dirmode
        arc_file, last_file, station_dir = get_output_paths(
            config.base_path, config.data_dir, safe_name, date_str, 
            getattr(config, 'dirmode', 'station'), config.debug
        )
        # Ensure directory exists
        station_dir.mkdir(parents=True, exist_ok=True)

        # Save metadata using hook for metadata function
        metadata_func = hooks['get_metadata_func'](config)
        save_metadata(
            station_dir, station, config.meta_fields, 
            metadata_func, config.force_metadata, config.debug
        )

        # Check timestamp (common logic with parser-specific conditions)
        should_skip_timestamp = False
        if hasattr(config, 'source_is_local') and config.source_is_local:
            last_timestamp = get_last_timestamp(arc_file)
            if last_timestamp is not None and config.dt <= last_timestamp:
                if config.debug:
                    print(f"Skipping {station_name} - timestamp not newer than last")
                should_skip_timestamp = True
        else:
            # For non-local sources, always check timestamp
            last_timestamp = get_last_timestamp(arc_file)
            if last_timestamp is not None and config.dt <= last_timestamp:
                if config.debug:
                    print(f"Skipping {station_name} - timestamp not newer than last")
                should_skip_timestamp = True

        if should_skip_timestamp:
            continue

        # Prepare current observation values (common logic)
        current_values = []
        for field in config.obs_fields:
            value = station.get(field, '')
            normalized_value = normalize_value(value)
            current_values.append(normalized_value)
        
        # Compare data using common function
        last_values = get_last_data(arc_file)
        data_changed, _ = compare_data_values(
            current_values, last_values, config.obs_fields, 
            config.debug, station_name
        )
        
        # Check force save (common logic with parser-specific config)
        force_save_due_to_time = False
        force_save_enabled = False
        force_save_minutes = 18  # default
        
        # Handle different config structures
        if hasattr(config, 'force_save'):
            force_save_enabled = config.force_save
            force_save_minutes = getattr(config, 'force_save_minutes', 18)
        elif hasattr(config, 'data') and isinstance(config.data, dict):
            force_save_enabled = config.data.get('force_save', False)
            force_save_minutes = config.data.get('force_save_minutes', 18)
        
        if not data_changed and force_save_enabled:
            last_timestamp = get_last_timestamp(arc_file)
            force_save_due_to_time = check_force_save_due_to_time(
                config.dt, last_timestamp, force_save_minutes,
                config.debug, station_name
            )
        
        if data_changed or force_save_due_to_time:
            # Format timestamp (use hook if provided, otherwise use common format)
            if 'format_timestamp_func' in hooks:
                formatted_timestamp = hooks['format_timestamp_func'](config)
            else:
                formatted_timestamp = format_timestamp(config.dt)
            
            data_row = f"{formatted_timestamp}\t" + "\t".join(current_values)
            
            if save_data_files(arc_file, last_file, data_row, config.last_file_lines,
                             config.debug, station_name):
                saved_count += 1

    # Print summary
    total_stations = len(stations)
    if config.debug:
        print(f"Skipped {skipped_count} of {total_stations} stations, saved {saved_count} new observations")
    return total_stations - skipped_count + saved_count

def load_places_config(config, config_path=None, field=12):
    """Load station mappings from places.conf"""
    if config_path is None:
        # Try to find places.conf relative to script location
        script_dir = Path(__file__).parent
        config_path = script_dir.parent / 'places.conf'
    
    stations = {}
    
    if not os.path.exists(config_path):
        print(f"Warning: places.conf not found at {config_path}")
        return config.stations  # Fall back to hardcoded stations

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('#') or not line:
                    continue
                
                parts = line.split(':')
                if len(parts) > field:  # Need at least 13 fields to access TTU field (index 12)
                    place_name = parts[0]
                    ttu_station_id = parts[field]  # TTU field is at index 12
                    
                    # Only add if TTU field is not empty
                    if ttu_station_id.strip():
                        stations[place_name] = ttu_station_id.strip()
        if config.debug:
            print(f"Loaded {len(stations)} stations from {config_path}")
        return stations
        
    except Exception as e:
        print(f"Error reading places.conf: {e}")
        return config.stations  # Fall back to hardcoded stations
