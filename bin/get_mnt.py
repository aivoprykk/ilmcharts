#!/usr/bin/env python3
# filepath: /Users/aivo/Downloads/Arendus/Ilmajaam/ilmcharts/bin/get_mnt.py

"""
MNT (Estonian Roads Administration) Weather Data Parser
Based on the common main() function with hooks architecture
"""

import urllib.request
import urllib.parse
import urllib.error
import argparse
import sys
import os
import re
from datetime import datetime, timedelta
from pathlib import Path

# Import common utilities
from weather_common import (
    BaseConfig, common_main, common_process_stations, create_common_parser, configure_common_args,
    format_timestamp, get_output_paths_for_dt, round_timestamp_down, normalize_value,
    get_last_data, get_last_timestamp, save_metadata, compare_data_values,
    check_force_save_due_to_time, save_data_files, determine_base_path,
    has_any_observations, load_places_config, get_output_paths, read_local_file,
    http_request,
    apply_generic_timestamp_adjustment, handle_ts_adjustment
)

class MNTConfig(BaseConfig):
    """MNT-specific configuration extending BaseConfig"""
    def __init__(self):
        super().__init__()
        # MNT-specific settings
        self.data_dir = "mnt_data_new"
        self.baseurl = 'http://www.balticroads.net'
        self.source = '/?getstationdata=1&mapstation='
        self.stations = {
            'tartu': '56', 
            'uhmardu': '338', 
            'jogeva': '89', 
            'tamme': '43', 
            'rapina': '123', 
            'haademeeste': '357', 
            'sorve': '84', 
            'ristna': '110'
        }

        # MNT-specific timestamp options
        self.force_save_minutes = 18
        self.force_save = False
        self.use_5min_intervals = True
        self.use_system_time = False
        self.system_time_round_minutes = 5

# Parser-specific hook functions
def add_mnt_specific_args(parser):
    """Add MNT-specific arguments to the common parser"""
    parser.add_argument('--station', help='MNT station ID (for direct station access)', type=str)
    parser.add_argument('--place', help='Place name from places.conf', type=str)
    parser.add_argument('--config', help='Path to places.conf file', type=str)
    parser.add_argument('--all', help='Process all MNT stations from places.conf', action='store_true')
    parser.add_argument('--no-5min-intervals', help='Disable 5-minute interval timestamp adjustment', action='store_true')
    parser.add_argument('--use-system-time', help='Use current system time instead of MNT HTML timestamp', action='store_true')
    parser.add_argument('--system-time-round', help='Round system time down to this interval in minutes', type=int, default=5)
    parser.add_argument('--allow-older-data', help='Allow saving data with timestamps older than last saved (for historical backfill)', action='store_true')
    parser.add_argument('--sequential-timestamps', help='Force sequential 5-minute intervals even for older data (for testing)', action='store_true')
    return parser

def create_parser():
    """Create MNT-specific argument parser"""
    return create_common_parser('MNT Weather Data Parser', add_mnt_specific_args)

def configure_from_args(config, args):
    """Configure MNT config from command line arguments"""
    # Configure common arguments first
    configure_common_args(config, args)
    
    # MNT-specific configuration
    config.use_5min_intervals = not args.no_5min_intervals
    config.use_system_time = args.use_system_time
    config.system_time_round_minutes = args.system_time_round
    config.allow_older_data = args.allow_older_data
    config.sequential_timestamps = args.sequential_timestamps
    
    # Store MNT-specific command line arguments for processing
    config.all_stations = getattr(args, 'all', False)
    config.place_name = getattr(args, 'place', None)
    config.station_id = getattr(args, 'station', None)
    config.config_path = getattr(args, 'config', None)
    config.local_file = getattr(args, 'local', None)

# Note: use common weather_common.read_local_file for local file reads

def apply_mnt_timestamp_adjustment(config, station_data, station_name):
    """Delegate to generic timestamp adjustment with default +5 minute bump."""
    return apply_generic_timestamp_adjustment(config, station_data, station_name, increment_minutes=5)

# No separate downloader function needed; we'll inline the request at call sites.

def download_data(config):
    """Download data - this is a hook function for common_main
    
    For MNT multistation mode, we return a special marker.
    Individual station downloads happen in process_stations.
    """
    if config.debug:
        print("MNT download_data called - returning multistation mode marker")
    
    # For MNT multi-station processing, return marker
    return "MNT_MULTISTATION_MODE"

def extract_wind_direction_from_arrow(arrow_img):
    """Extract wind direction from arrow image filename"""
    try:
        # Extract arrow number from img src like "img/arrow_16.gif"
        match = re.search(r'arrow_(\d+)\.gif', arrow_img)
        if match:
            arrow_num = int(match.group(1))
            # Convert arrow number to degrees (based on parse_mnt.js logic)
            arrow_to_degrees = {
                1: 0.0, 2: 22.5, 3: 45.0, 4: 67.5, 5: 90.0, 6: 112.5, 7: 135.0, 8: 157.5,
                9: 180.0, 10: 202.5, 11: 225.0, 12: 247.5, 13: 270.0, 14: 292.5, 15: 315.0, 16: 337.5
            }
            return arrow_to_degrees.get(arrow_num, 0.0)
        # No match -> empty
        return ''
    except Exception as e:
        print(f"Error extracting wind direction: {e}")
        return ''

def parse_mnt_html(config, html_data):
    """Parse MNT HTML data and extract weather observations"""
    if not html_data:
        return None

    try:
        config.dt = None  # Reset datetime
        
        lines = html_data.strip().split('\n')
        if not lines:
            print("No data lines found in MNT HTML")
            return None
        
        # Initialize data structure
        station_data = {
            'timestamp': None,
            'name': '',
            'wmocode': '',
            'longitude': '',
            'latitude': '',
            'airtemperature': '',
            'relativehumidity': '',
            'windspeedmax': '',
            'winddirection': '',
            'windspeed': '',
            'visibility': '',
            'dewpoint': '',
            'precipitations': '',
            'roadtemperature': '',
            'roadstatus': '',
            # Fields not available from MNT
            'waterlevel': '',
            'waterlevel_eh2000': '',
            'watertemperature': '',
            'airpressure': '',
            'uvindex': '',
            'sunshineduration': ''
        }
        
        # Extract datetime from first line (format: "110	20.08.25 20:00		01.01.70 03:00")
        first_line = lines[0] if lines else ''
        datetime_match = re.search(r'(\d{2})\.(\d{2})\.(\d{2})\s+(\d{1,2}):(\d{2})', first_line)
        
        if config.use_system_time:
            # Use current system time rounded down to specified interval
            current_time = datetime.now()
            config.dt = round_timestamp_down(current_time, config.system_time_round_minutes)
            if config.debug:
                print(f"Using system time: {current_time} -> rounded: {config.dt}")
        elif datetime_match:
            # Parse datetime: "20.08.25 20:00" -> 2025-08-20 20:00:00
            day, month, year_short, hour, minute = datetime_match.groups()
            year = int('20' + year_short)  # Convert 25 -> 2025
            config.dt = datetime(year, int(month), int(day), int(hour), int(minute))
            if config.debug:
                print(f"Using MNT timestamp: {datetime_match.group(0)} -> {config.dt}")
        else:
            print("Could not extract timestamp from MNT data")
            return None
        
        station_data['timestamp'] = config.dt
        
    # Do not coerce empty values to 0; preserve empties
        
        # Parse data lines (tab-separated format)
        for line in lines[1:]:  # Skip first line with timestamp
            parts = line.split('\t')
            if len(parts) < 2:
                continue
                
            field_name = parts[0].strip()
            field_value = parts[1].strip()
            
            # Extract numeric value, removing units and non-numeric parts
            value_match = re.search(r'([-+]?\d*\.?\d+)', field_value)
            numeric_value = float(value_match.group(1)) if value_match else ''
            
            # Map MNT fields to our data structure
            if field_name.startswith('Air temp'):
                station_data['airtemperature'] = numeric_value
            elif field_name.startswith('Air humidity'):
                station_data['relativehumidity'] = numeric_value
            elif field_name.startswith('Max wind sp'):
                station_data['windspeedmax'] = numeric_value
            elif field_name.startswith('Wind dir'):
                # Extract wind direction from arrow image
                wind_dir_value = extract_wind_direction_from_arrow(field_value)
                # If no arrow detected, preserve empty; otherwise set numeric degrees (may be 0.0)
                station_data['winddirection'] = wind_dir_value if wind_dir_value != '' else ''
                if config.debug:
                    print(f"Wind direction: field_value='{field_value}' -> extracted={wind_dir_value}")
            elif field_name.startswith('Wind speed'):
                station_data['windspeed'] = numeric_value
            elif field_name.startswith('Visibility'):
                station_data['visibility'] = numeric_value
            elif field_name.startswith('Dew point'):
                station_data['dewpoint'] = numeric_value
            elif field_name.startswith('Precip'):
                # Only handle precipitation intensity lines, not type lines
                if 'int' in field_name.lower():
                    # Precipitation intensity: '-' means no rain -> treat as 0.0
                    # If a numeric value was parsed, use it; otherwise check for '-'
                    if value_match:
                        station_data['precipitations'] = float(value_match.group(1))
                    else:
                        fv_clean = field_value.strip().lower()
                        # Handle various hyphen representations meaning "no data/no rain"
                        if fv_clean == '-' or fv_clean.startswith('-') or ('mm/h' in fv_clean and '-' in fv_clean):
                            station_data['precipitations'] = 0
                        else:
                            # Leave empty when it's truly missing/unknown
                            station_data['precipitations'] = ''
                else:
                    # Ignore 'Precip. type' for numeric precipitation
                    pass
            elif field_name.startswith('Road temp'):
                station_data['roadtemperature'] = numeric_value
            elif field_name.startswith('Road status'):
                station_data['roadstatus'] = field_value.split()[0] if field_value else ''
        
        return station_data
        
    except Exception as e:
        print(f"Error parsing MNT HTML data: {e}")
        return None

def parse_data(config, data):
    """Parse data - this is a hook function for common_main
    
    For MNT, parsing happens per station, so this returns a placeholder for multistation mode
    and handles actual parsing for local files
    """
    if config.debug:
        print(f"parse_data called with data type: {type(data)}")
        if isinstance(data, str):
            print(f"Data content preview: {data[:100] if len(data) > 100 else data}")
    
    if data == "MNT_MULTISTATION_MODE":
        if config.debug:
            print("MNT multistation mode detected, returning placeholder")
        # Return a placeholder to ensure process_stations gets called
        return [{'_multistation_mode': True}]
    else:
        # Handle local file case
        if config.debug:
            print("Parsing single station data")
        station_data = parse_mnt_html(config, data)
        return [station_data] if station_data else []

def get_metadata_value(field, station_data, config, place_name=None):
    """Get the value for a metadata field - MNT specific implementation"""
    if field == 'name':
        # Use place_name as station name for MNT
        return place_name if place_name else ''
    elif field == 'first_record':
        return config.dt.strftime('%Y-%m-%d')
    elif field == 'source':
        return f"{config.baseurl}/?mapstation={place_name if place_name else 'station'}"
    else:
        return station_data.get(field, '')

def process_stations(config, stations):
    """Process MNT station data - handles multi-station downloads and processing"""
    
    if config.debug:
        print(f"process_stations called with {len(stations)} stations")
        print(f"Station data: {stations}")
    
    # Load places.conf once and reuse
    mnt_stations = load_places_config(config, getattr(config, 'config_path', None), 6)
    
    # Check if we're in multistation mode (placeholder from parse_data)
    if stations and len(stations) == 1 and stations[0].get('_multistation_mode'):
        if config.debug:
            print("Entering MNT multistation processing mode")
        
    # Determine which stations to process based on command line args
        stations_to_process = []

        if config.debug:
            print(f"Available MNT stations: {mnt_stations}")
        if getattr(config, 'station_id', None):
            # Reverse-lookup: find place by station_id; fallback to the id if not found
            place_name = next((place for place, sid in mnt_stations.items() if str(sid) == str(config.station_id)), config.station_id)
            stations_to_process = [(place_name, config.station_id)]
        else:
            if getattr(config, 'all_stations', False):
                stations_to_process = [(place, station_id) for place, station_id in mnt_stations.items()]
            elif getattr(config, 'place_name', None):
                place = config.place_name
                if place in mnt_stations:
                    stations_to_process = [(place, mnt_stations[place])]
                else:
                    print(f"Place '{place}' not found in stations. Available: {list(mnt_stations.keys())}")
                    return
            else:
                # Default behavior: process all stations
                if config.debug:
                    print("No --place/--station provided; defaulting to process all stations")
                stations_to_process = [(place, station_id) for place, station_id in mnt_stations.items()]
        
        # Process each station individually
        saved_count = 0
        skipped_count = 0
        
        for place_name, station_id in stations_to_process:
            try:
                # Set current place name for metadata
                config.current_place_name = place_name
                
                if config.debug:
                    print(f"Processing MNT station: {place_name} (ID: {station_id})")
                
                # Download data for this specific station
                if getattr(config, 'local_file', None):
                    html_data = read_local_file(config.local_file)
                else:
                    # Inline GET request for MNT
                    html_data = http_request(
                        f"{config.baseurl}{config.source}{station_id}",
                        method='GET',
                        headers={'X-Config-UA': getattr(config, 'user_agent', '//ilm.majasa.ee/')},
                        decode=True,
                        debug=getattr(config, 'debug', False),
                    )
                
                if not html_data:
                    print(f"No data for station {place_name}")
                    skipped_count += 1
                    continue
                
                # Parse data for this station
                station_data = parse_mnt_html(config, html_data)
                
                if not config.dt or not station_data:
                    print(f"Failed to parse data for station {place_name}")
                    skipped_count += 1
                    continue
                
                # Adjust timestamp based on data comparison and possibly skip
                skipped, _action, _orig, _adj = handle_ts_adjustment(config, station_data, place_name, increment_minutes=5)
                if skipped:
                    skipped_count += 1
                    continue
                
                # Process this single station using common infrastructure
                mnt_hooks = {
                    'get_station_name': lambda station: place_name,  # Use place_name for directory, not extracted name
                    'get_metadata_func': lambda cfg: lambda field, station_data: get_metadata_value(field, station_data, cfg, place_name),
                    'format_timestamp_func': lambda cfg: format_timestamp(cfg.dt),
                    'get_safe_name': lambda station_name: station_name,  # MNT uses names directly
                }
                
                # Process the single station
                from weather_common import common_process_stations
                result = common_process_stations(config, [station_data], mnt_hooks)
                
                if result > 0:  # common_process_stations doesn't return a value, so this is always True
                    saved_count += 1
                else:
                    skipped_count += 1
                
            except KeyboardInterrupt:
                print("Script stopped by user")
                break
            except Exception as e:
                print(f"An error occurred processing {place_name}: {e}")
                if config.debug:
                    import traceback
                    traceback.print_exc()
                skipped_count += 1
        
        # Print summary
        total_stations = len(stations_to_process)
        if config.debug:
            print(f"Processed {total_stations} MNT stations: saved {saved_count}, skipped {skipped_count}")

    else:
        # Handle single station case (e.g., local file)
        # Apply timestamp adjustment based on data comparison
        # If a station_id is provided, resolve a human-readable place name using already loaded mnt_stations
        if getattr(config, 'station_id', None):
            resolved_place = next((place for place, sid in mnt_stations.items() if str(sid) == str(config.station_id)), None)
            if resolved_place:
                config.current_place_name = resolved_place
                if config.debug:
                    print(f"Resolved station {config.station_id} to place '{resolved_place}' for local processing")

        if stations and len(stations) > 0:
            stations_to_process = []
            for station_data in stations:
                # Use station name for directory (should be clean name now)
                station_name = getattr(config, 'current_place_name', None) or getattr(config, 'station_id', None) or station_data.get('name', 'unknown')
                
                skipped, _action, _orig, _adj = handle_ts_adjustment(config, station_data, station_name, increment_minutes=5)
                if skipped:
                    continue  # Skip this station
                
                # Add station to processing list if not skipped
                stations_to_process.append(station_data)
            
            # Update stations list to only include non-skipped stations
            stations = stations_to_process
        
        # Use common processing with MNT-specific hooks
        def get_station_name(station):
            # For single station case, prefer resolved current_place_name, then station_id, then extracted name
            place_name = getattr(config, 'current_place_name', None)
            if place_name:
                return place_name
            if getattr(config, 'station_id', None):
                return config.station_id
            return station.get('name', 'unknown')
        
        def get_metadata_func(config):
            def metadata_func(field, station_data):
                # Prefer current_place_name when available, otherwise station_id
                place_name = getattr(config, 'current_place_name', None) or getattr(config, 'station_id', None)
                return get_metadata_value(field, station_data, config, place_name)
            return metadata_func
        
        def format_timestamp_func(config):
            """MNT-specific timestamp formatting"""
            return format_timestamp(config.dt)
        
        def get_safe_name_func():
            """MNT uses place names directly, no safe conversion needed"""
            return lambda name: name
        
        mnt_hooks = {
            'get_station_name': get_station_name,
            'get_metadata_func': get_metadata_func,
            'format_timestamp_func': format_timestamp_func,
            'get_safe_name': lambda station_name: station_name,  # MNT uses names directly
        }
        
        # Use common processing with MNT-specific hooks
        from weather_common import common_process_stations
        common_process_stations(config, stations, mnt_hooks)

# Hook configuration for common_main
mnt_hooks = {
    'create_parser': create_parser,
    'configure_from_args': configure_from_args,
    'download_data': download_data,
    'parse_data': parse_data,
    'process_stations': process_stations,
    'config_class': MNTConfig,
    'script_file': __file__
}

def main():
    """MNT main function using common infrastructure"""
    return common_main(mnt_hooks)

if __name__ == "__main__":
    main()
