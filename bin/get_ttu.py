#!/usr/bin/env python3
# filepath: /Users/aivo/Downloads/Arendus/Ilmajaam/ilmcharts/bin/get_ttu_with_common_main.py

"""
TTU Weather Data Parser using common main() function with hooks
"""

from logging import config
import urllib.request
import urllib.parse
import urllib.error
import argparse
import sys
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from html.parser import HTMLParser

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

class TTUConfig(BaseConfig):
    """TTU-specific configuration extending BaseConfig"""
    def __init__(self):
        super().__init__()
        # TTU-specific settings
        self.stations = {
            'rapina': 'laaksaare', 
            'pirita': 'vanasadam', 
            'rohuneeme': 'leppneeme', 
            'parnu': 'parnu', 
            'rohukyla': 'rohukyla', 
            'paatsalu': 'virtsusadam', 
            'saaretirp': 'heltermaa', 
            'koipsi': 'muuga'
        }
        self.data_dir = "ttu_data_new"
        self.baseurl = 'http://on-line.msi.ttu.ee'
        self.source = '/metoc/infowindow.php'
        
        # TTU-specific timestamp options
        self.force_save_minutes = 18
        self.force_save = False
        self.use_5min_intervals = True
        self.use_system_time = False
        self.system_time_round_minutes = 5

class TTUHTMLParser(HTMLParser):
    """Simple HTML parser to extract table data"""
    def __init__(self):
        super().__init__()
        self.in_marker_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row = []
        self.rows = []
        self.current_data = ""
        
    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            for attr_name, attr_value in attrs:
                if attr_name == 'class' and 'marker_tbl' in attr_value:
                    self.in_marker_table = True
        elif tag == 'tr' and self.in_marker_table:
            self.in_row = True
            self.current_row = []
        elif tag == 'td' and self.in_row:
            self.in_cell = True
            self.current_data = ""
            
    def handle_endtag(self, tag):
        if tag == 'table':
            self.in_marker_table = False
        elif tag == 'tr' and self.in_row:
            self.in_row = False
            if self.current_row:
                self.rows.append(self.current_row)
        elif tag == 'td' and self.in_cell:
            self.in_cell = False
            self.current_row.append(self.current_data.strip())
            
    def handle_data(self, data):
        if self.in_cell:
            self.current_data += data

# Parser-specific hook functions
def add_ttu_specific_args(parser):
    """Add TTU-specific arguments to the common parser"""
    parser.add_argument('--station', help='TTU station ID (for direct station access)', type=str)
    parser.add_argument('--place', help='Place name from places.conf', type=str)
    parser.add_argument('--config', help='Path to places.conf file', type=str)
    parser.add_argument('--all', help='Process all TTU stations from places.conf', action='store_true')
    parser.add_argument('--no-5min-intervals', help='Disable 5-minute interval timestamp adjustment', action='store_true')
    parser.add_argument('--use-system-time', help='Use current system time instead of TTU HTML timestamp', action='store_true')
    parser.add_argument('--system-time-round', help='Round system time down to this interval in minutes', type=int, default=5)
    parser.add_argument('--allow-older-data', help='Allow saving data with timestamps older than last saved (for historical backfill)', action='store_true')
    parser.add_argument('--sequential-timestamps', help='Force sequential 5-minute intervals even for older data (for testing)', action='store_true')
    return parser

def create_parser():
    """Create TTU-specific argument parser"""
    return create_common_parser('TTU Weather Data Parser', add_ttu_specific_args)

def configure_from_args(config, args):
    """Configure TTU config from command line arguments"""
    # Configure common arguments first
    configure_common_args(config, args)
    
    # TTU-specific configuration
    config.use_5min_intervals = not args.no_5min_intervals
    config.use_system_time = args.use_system_time
    config.system_time_round_minutes = args.system_time_round
    config.allow_older_data = args.allow_older_data
    config.sequential_timestamps = args.sequential_timestamps
    
    # Store TTU-specific command line arguments for processing
    config.all_stations = getattr(args, 'all', True)
    config.place_name = getattr(args, 'place', None)
    config.station_id = getattr(args, 'station', None)
    config.config_path = getattr(args, 'config', None)
    config.local_file = getattr(args, 'local', None)

# Note: use common weather_common.read_local_file for local file reads

def apply_ttu_timestamp_adjustment(config, station_data, station_name):
    """Delegate to generic timestamp adjustment with default +5 minute bump."""
    return apply_generic_timestamp_adjustment(config, station_data, station_name, increment_minutes=5)

# No separate downloader function needed; we'll inline the request at call sites.

def download_data(config):
    """Download data - this is a hook function for common_main
    
    For TTU multistation mode, we return a special marker.
    Individual station downloads happen in process_stations.
    """
    if config.debug:
        print("TTU download_data called - returning multistation mode marker")
    
    # For TTU multi-station processing, return marker
    return "TTU_MULTISTATION_MODE"

def extract_station_name_from_html(html_data):
    """Extract station name from TTU HTML data"""
    try:
        pattern = r"<font\s+style=['\"]font-size:\s*17px;?['\"]>([^<]+)</font>"
        match = re.search(pattern, html_data, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        else:
            return ''
    except Exception as e:
        print(f"Error extracting station name from HTML: {e}")
        return ''

def convert_dms_to_decimal(dms_string):
    """Convert DMS to decimal degrees"""
    try:
        pattern = r"(\d+)°\s*(\d+)'\s*(\d+)''\s*([NSEW])"
        match = re.search(pattern, dms_string)
        
        if not match:
            return ''
        
        degrees = int(match.group(1))
        minutes = int(match.group(2))
        seconds = int(match.group(3))
        direction = match.group(4)
        
        decimal = degrees + minutes/60 + seconds/3600
        
        if direction in ['S', 'W']:
            decimal = -decimal
            
        return f"{decimal:.4f}"
        
    except (ValueError, AttributeError) as e:
        return ''

def extract_location_from_html(html_data):
    """Extract location coordinates from TTU HTML data"""
    try:
        pattern = r"(\d+°\s*\d+'\s*\d+''\s*[NS])(?:&nbsp;|\s)*(?:&nbsp;|\s)*(?:&nbsp;|\s)*(\d+°\s*\d+'\s*\d+''\s*[EW])"
        
        match = re.search(pattern, html_data)
        if match:
            latitude_dms = match.group(1).strip()
            longitude_dms = match.group(2).strip()
            
            latitude_dms = re.sub(r'\s+', ' ', latitude_dms)
            longitude_dms = re.sub(r'\s+', ' ', longitude_dms)
            
            latitude_decimal = convert_dms_to_decimal(latitude_dms)
            longitude_decimal = convert_dms_to_decimal(longitude_dms)
            
            return {
                'latitude': latitude_decimal,
                'longitude': longitude_decimal
            }
        else:
            return {
                'latitude': '',
                'longitude': ''
            }
            
    except Exception as e:
        print(f"Error extracting location from HTML: {e}")
        return {
            'latitude': '',
            'longitude': ''
        }

def parse_ttu_html(config, html_data):
    """Parse TTU HTML data and extract weather observations"""
    if not html_data:
        return None

    try:
        parser = TTUHTMLParser()
        parser.feed(html_data)
        config.dt = None  # Reset datetime

        if not parser.rows:
            print("Could not find marker_tbl table in HTML")
            return None
        
        # Extract location coordinates from HTML using regex
        location_coords = extract_location_from_html(html_data)
        
        # Extract station name from HTML
        station_name = extract_station_name_from_html(html_data)
        
        def get_val(label):
            """Extract value from table based on label"""
            for row in parser.rows:
                if len(row) >= 2 and label in row[0]:
                    return row[1].strip()
            return ''
        
        # Extract datetime from HTML or use system time
        if config.use_system_time:
            # Use current system time rounded down to specified interval
            current_time = datetime.now()
            config.dt = round_timestamp_down(current_time, config.system_time_round_minutes)
            if config.debug:
                print(f"Using system time: {current_time} -> rounded: {config.dt}")
        else:
            # Extract datetime from TTU HTML
            datetime_str = get_val('Last data:')  # e.g., "30.07.2025 16:10"
            if not datetime_str:
                print("Could not find 'Last data:' timestamp")
                return None
            
            # Parse datetime: "30.07.2025 16:10" -> datetime object
            try:
                parts = re.split(r'[\s.:]', datetime_str)  # ["30", "07", "2025", "16", "10"]
                if len(parts) >= 5:
                    config.dt = datetime(int(parts[2]), int(parts[1]), int(parts[0]), 
                                int(parts[3]), int(parts[4]))
                    if config.debug:
                        print(f"Using TTU timestamp: {datetime_str} -> {config.dt}")
                else:
                    print(f"Invalid datetime format: {datetime_str}")
                    return None
            except (ValueError, IndexError) as e:
                print(f"Error parsing datetime {datetime_str}: {e}")
                return None
        
        # Extract weather data
        wind_str = get_val('Wind speed / gust:') or '0'  # e.g., "7.3 / 10.4 m/s"
        wind_dir_str = get_val('Wind direction:') or '0'  # e.g., "194° (degrees)"
        sealevel_str = get_val('Sealevel') or ''  # e.g., "+36 / +17 cm"
        air_temp_str = get_val('Air temperature:') or '0'
        water_temp_str = get_val('Water temperature:') or '0'
        humidity_str = get_val('Humidity:') or '0'
        pressure_str = get_val('Air pressure:') or '0'
        rain_str = get_val('Rain accumulation:') or '0'
        
        # Parse values
        def extract_numbers(text):
            """Extract numbers from text, return list"""
            numbers = re.findall(r'[\d.]+', text)
            return [float(n) if n else 0 for n in numbers]
        
        # Parse wind speeds (avg/gust)
        wind_nums = extract_numbers(wind_str)
        wind_avg = wind_nums[0] if len(wind_nums) > 0 else 0
        wind_gust = wind_nums[1] if len(wind_nums) > 1 else wind_avg
        
        # Parse wind direction
        wind_dir_nums = extract_numbers(wind_dir_str)
        wind_dir = int(wind_dir_nums[0]) if wind_dir_nums else 0
        
        # Parse sea level (current/reference)
        sealevel_nums = extract_numbers(sealevel_str)
        sealevel_current = sealevel_nums[1] if len(sealevel_nums) > 1 else 0
        sealevel_ref = sealevel_nums[0] if len(sealevel_nums) > 0 else 0
        
        # Parse other values
        air_temp = extract_numbers(air_temp_str)[0] if extract_numbers(air_temp_str) else 0
        water_temp = extract_numbers(water_temp_str)[0] if extract_numbers(water_temp_str) else 0
        humidity = extract_numbers(humidity_str)[0] if extract_numbers(humidity_str) else 0
        pressure = extract_numbers(pressure_str)[0] if extract_numbers(pressure_str) else 0
        rain = extract_numbers(rain_str)[0] if extract_numbers(rain_str) else 0
        
        station_data = {
            'timestamp': config.dt,
            'name': station_name,  # Extracted from HTML
            'wmocode': '',
            'longitude': location_coords.get('longitude', ''),
            'latitude': location_coords.get('latitude', ''),
            'waterlevel': sealevel_current,
            'waterlevel_eh2000': sealevel_ref,
            'watertemperature': water_temp,
            'airtemperature': air_temp,
            'windspeed': wind_avg,
            'windspeedmax': wind_gust,
            'winddirection': wind_dir,
            'precipitations': rain,
            'relativehumidity': humidity,
            'airpressure': pressure,
            'uvindex': '',  # Not available from TTU
            'sunshineduration': ''  # Not available from TTU
        }
        
        return station_data
        
    except Exception as e:
        print(f"Error parsing TTU HTML data: {e}")
        return None

def parse_data(config, data):
    """Parse data - this is a hook function for common_main
    
    For TTU, parsing happens per station, so this returns a placeholder for multistation mode
    and handles actual parsing for local files
    """
    if config.debug:
        print(f"parse_data called with data type: {type(data)}")
        if isinstance(data, str):
            print(f"Data content preview: {data[:100] if len(data) > 100 else data}")
    
    if data == "TTU_MULTISTATION_MODE":
        if config.debug:
            print("TTU multistation mode detected, returning placeholder")
        # Return a placeholder to ensure process_stations gets called
        return [{'_multistation_mode': True}]
    else:
        # Handle local file case
        if config.debug:
            print("Parsing single station data")
        station_data = parse_ttu_html(config, data)
        return [station_data] if station_data else []

def get_metadata_value(field, station_data, config, place_name=None):
    """Get the value for a metadata field - TTU specific implementation"""
    if field == 'name':
        # Use the extracted station name from HTML, fallback to place_name if empty
        return station_data.get('name', '') or (place_name if place_name else '')
    elif field == 'first_record':
        return config.dt.strftime('%Y-%m-%d')
    elif field == 'source':
        return f"{config.baseurl}/{place_name if place_name else 'station'}"
    else:
        return station_data.get(field, '')

def process_stations(config, stations):
    """Process TTU station data - handles multi-station downloads and processing"""
    
    if config.debug:
        print(f"process_stations called with {len(stations)} stations")
        print(f"Station data: {stations}")
    
    # Load places.conf once and reuse
    ttu_stations = load_places_config(config, getattr(config, 'config_path', None), 12)
    
    # Check if we're in multistation mode (placeholder from parse_data)
    if stations and len(stations) == 1 and stations[0].get('_multistation_mode'):
        if config.debug:
            print("Entering TTU multistation processing mode")
        if config.debug:
            print(f"Available TTU stations: {ttu_stations}")
        
        # Determine which stations to process based on command line args
        # This requires access to command line args, which we'll need to store in config
        stations_to_process = []
        
        if getattr(config, 'all_stations', False):
            # Process all stations
            stations_to_process = [(place, station_id) for place, station_id in ttu_stations.items()]
        elif getattr(config, 'place_name', None):
            # Process specific place
            place = config.place_name
            if place in ttu_stations:
                stations_to_process = [(place, ttu_stations[place])]
            else:
                print(f"Place '{place}' not found in stations. Available: {list(ttu_stations.keys())}")
                return
        elif getattr(config, 'station_id', None):
            # Direct station access: reverse-lookup place by station_id; fallback to id
            place_name = next((p for p, sid in ttu_stations.items() if str(sid) == str(config.station_id)), config.station_id)
            stations_to_process = [(place_name, config.station_id)]
        else:
            # Default behavior: process all stations
            if config.debug:
                print("No --place/--station provided; defaulting to process all TTU stations")
            stations_to_process = [(place, station_id) for place, station_id in ttu_stations.items()]
        
        # Process each station individually
        saved_count = 0
        skipped_count = 0
        
        for place_name, station_id in stations_to_process:
            try:
                # Set current place name for metadata
                config.current_place_name = place_name
                
                if config.debug:
                    print(f"Processing TTU station: {place_name} (ID: {station_id})")
                
                # Download data for this specific station
                if getattr(config, 'local_file', None):
                    html_data = read_local_file(config.local_file)
                else:
                    # Inline POST request for TTU
                    html_data = http_request(
                        f"{config.baseurl}{config.source}",
                        method='POST',
                        data={'station': station_id},
                        headers={'Content-Type': 'application/x-www-form-urlencoded', 'X-Config-UA': getattr(config, 'user_agent', '//ilm.majasa.ee/')},
                        decode=True,
                        debug=getattr(config, 'debug', False),
                    )
                
                if not html_data:
                    print(f"No data for station {station_id}")
                    skipped_count += 1
                    continue
                
                # Parse data for this station
                station_data = parse_ttu_html(config, html_data)
                
                if not config.dt or not station_data:
                    print(f"Failed to parse data for station {station_id}")
                    skipped_count += 1
                    continue
                
                # Adjust timestamp based on data comparison and possibly skip
                skipped, _action, _orig, _adj = handle_ts_adjustment(config, station_data, station_id, increment_minutes=5)
                if skipped:
                    skipped_count += 1
                    continue
                
                # Process this single station using common infrastructure
                ttu_hooks = {
                    'get_station_name': lambda station: station_id,  # Use station_id for directory
                    'get_metadata_func': lambda cfg: lambda field, station_data: get_metadata_value(field, station_data, cfg, station_id),
                    'format_timestamp_func': lambda cfg: format_timestamp(cfg.dt),
                    'get_safe_name': lambda station_name: station_name,  # TTU uses names directly
                }
                
                # Process the single station
                from weather_common import common_process_stations
                result = common_process_stations(config, [station_data], ttu_hooks)
                
                if result > 0:  # common_process_stations doesn't return a value, so this is always True
                    saved_count += 1
                else:
                    skipped_count += 1
                
            except KeyboardInterrupt:
                print("Script stopped by user")
                break
            except Exception as e:
                print(f"An error occurred processing {station_id}: {e}")
                if config.debug:
                    import traceback
                    traceback.print_exc()
                skipped_count += 1
        
        # Print summary
        total_stations = len(stations_to_process)
        if config.debug:
            print(f"Processed {total_stations} TTU stations: saved {saved_count}, skipped {skipped_count}")

    else:
        # Handle single station case (e.g., local file)
        # Apply timestamp adjustment based on data comparison
        # If a station_id is provided, resolve a human-readable place name using already loaded ttu_stations
        if getattr(config, 'station_id', None):
            resolved_place = next((p for p, sid in ttu_stations.items() if str(sid) == str(config.station_id)), None)
            if resolved_place:
                config.current_place_name = resolved_place
                if config.debug:
                    print(f"Resolved station {config.station_id} to place '{resolved_place}' for local processing")
        if stations and len(stations) > 0:
            stations_to_process = []
            for station_data in stations:
                # Use station name for directory (should be clean name now)
                station_name = getattr(config, 'station_id', None) or getattr(config, 'current_place_name', None) or station_data.get('name', 'unknown')
                
                skipped, _action, _orig, _adj = handle_ts_adjustment(config, station_data, station_name, increment_minutes=5)
                if skipped:
                    continue  # Skip this station

                # Add station to processing list when not skipped
                stations_to_process.append(station_data)
            
            # Update stations list to only include non-skipped stations
            stations = stations_to_process
        
        # Use common processing with TTU-specific hooks
        def get_station_name(station):
            # Prefer station_id for exactness; fallback to resolved current_place_name, then extracted name
            if getattr(config, 'station_id', None):
                return config.station_id
            place_name = getattr(config, 'current_place_name', None)
            if place_name:
                return place_name
            return station.get('name', 'unknown')
        
        def get_metadata_func(config):
            def metadata_func(field, station_data):
                # Prefer station_id for metadata context; fallback to resolved place
                place_name = getattr(config, 'station_id', None) or getattr(config, 'current_place_name', None)
                return get_metadata_value(field, station_data, config, place_name)
            return metadata_func
        
        def format_timestamp_func(config):
            """TTU-specific timestamp formatting"""
            return format_timestamp(config.dt)
        
        def get_safe_name_func():
            """TTU uses place names directly, no safe conversion needed"""
            return lambda name: name
        
        ttu_hooks = {
            'get_station_name': get_station_name,
            'get_metadata_func': get_metadata_func,
            'format_timestamp_func': format_timestamp_func,
            'get_safe_name': lambda station_name: station_name,  # TTU uses names directly
        }
        
        # Use common processing with TTU-specific hooks
        from weather_common import common_process_stations
        common_process_stations(config, stations, ttu_hooks)

# Hook configuration for common_main
ttu_hooks = {
    'create_parser': create_parser,
    'configure_from_args': configure_from_args,
    'download_data': download_data,
    'parse_data': parse_data,
    'process_stations': process_stations,
    'config_class': TTUConfig,
    'script_file': __file__
}

def main():
    """TTU main function using common infrastructure"""
    return common_main(ttu_hooks)

if __name__ == "__main__":
    main()
