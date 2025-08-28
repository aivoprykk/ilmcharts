#!/usr/bin/env python3
# filepath: /Users/aivo/Downloads/Arendus/Ilmajaam/ilmcharts/bin/get_emhi_with_common_main.py

"""
EMHI Weather Data Parser using common main() function with hooks
"""

import urllib.request
import urllib.error
import argparse
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

# Import common utilities
from weather_common import (
    BaseConfig, common_main, common_process_stations, create_common_parser, configure_common_args,
    format_timestamp, round_timestamp_down, normalize_value,
    get_last_data, get_last_timestamp, save_metadata, compare_data_values,
    check_force_save_due_to_time, save_data_files, determine_base_path,
    has_any_observations, safe_name_function, http_request
)

class EMHIConfig(BaseConfig):
    """EMHI-specific configuration extending BaseConfig"""
    def __init__(self):
        super().__init__()
        # EMHI-specific settings
        self.data_dir = "emhi_data_new"
        self.baseurl = 'https://ilmateenistus.ee'
        self.source = '/ilma_andmed/xml/observations.php'
        
        # Override base config with EMHI-specific defaults
        self.data['force_save_minutes'] = 18

# Parser-specific hook functions
def add_emhi_specific_args(parser):
    """Add EMHI-specific arguments to the common parser"""
    # EMHI currently has no parser-specific arguments - all moved to common
    return parser

def create_parser():
    """Create EMHI-specific argument parser"""
    return create_common_parser('EMHI Weather Data Parser', add_emhi_specific_args)

def configure_from_args(config, args):
    """Configure EMHI config from command line arguments"""
    # Configure common arguments first
    configure_common_args(config, args)
    
    # EMHI-specific configuration (none currently)
    pass

def download_data(config):
    """Download data - this is a hook function for common_main"""
    url = f"{config.baseurl}{config.source}"
    # EMHI returns XML bytes; request helper defaults to decode=True, but we want raw bytes here.
    return http_request(
        url,
        method='GET',
        headers={'X-Config-UA': getattr(config, 'user_agent', '//ilm.majasa.ee/')},
        decode=False,
        debug=getattr(config, 'debug', False),
    )

def parse_timestamp(timestamp_str):
    """Parse timestamp from EMHI XML"""
    try:
        # First try parsing as Unix timestamp (float)
        unix_ts = float(timestamp_str)
        return datetime.fromtimestamp(unix_ts)
    except ValueError:
        # If not Unix timestamp, try the original format
        try:
            return datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            print(f"Warning: Could not parse timestamp '{timestamp_str}' - using current time")
            return datetime.now()

def parse_emhi_xml(config, xml_data):
    """Parse EMHI XML data and return structured observations"""
    if not xml_data:
        return []

    try:
        root = ET.fromstring(xml_data)

        # Extract timestamp from observations element
        timestamp_str = None
        observations_elem = root.find('observations')
        
        if observations_elem is not None:
            timestamp_str = observations_elem.attrib.get('timestamp')
        else:
            timestamp_str = root.attrib.get('timestamp')
            
        if timestamp_str is None:
            timestamp_str = str(int(datetime.now().timestamp()))
            print(f"Warning: No timestamp found in XML, using current time")

        config.dt = parse_timestamp(timestamp_str)

        # Define the station attributes we want to preserve
        core_attributes = ['name', 'wmocode', 'longitude', 'latitude']
        stations = []

        for station in root.findall('.//station'):
            station_data = {
                'ts': format_timestamp(config.dt),
                'unix_ts': int(config.dt.timestamp()),
            }

            # Add core attributes
            for attr in core_attributes:
                elem = station.find(attr)
                station_data[attr] = elem.text.strip() if elem is not None and elem.text else ''

            # Add all other observation values
            for observation in station:
                if observation.tag not in core_attributes:
                    station_data[observation.tag] = observation.text.strip() if observation.text else ''
            
            stations.append(station_data)

        return stations
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}")
        return []

def parse_data(config, xml_data):
    """Parse data - this is a hook function for common_main"""
    return parse_emhi_xml(config, xml_data)

def get_metadata_value(field, station_data, config):
    """Get the value for a metadata field - EMHI specific implementation"""
    if field == 'first_record':
        return config.dt.strftime('%Y-%m-%d')
    elif field == 'source':
        return config.baseurl + '/ilm/ilmavaatlused/vaatlusandmed/'
    else:
        # For name, wmocode, longitude, latitude
        return station_data.get(field, '')

def process_stations(config, stations):
    """Process EMHI station data using common infrastructure"""
    
    # Define EMHI-specific hooks for common_process_stations
    def get_station_name(station):
        return station.get('name', 'Unknown')
    
    def get_metadata_func(config):
        def metadata_func(field, station_data):
            return get_metadata_value(field, station_data, config)
        return metadata_func
    
    def format_timestamp_func(config):
        """EMHI-specific timestamp formatting with rounding"""
        if config.data['enable_rounding']:
            dt_to_format = round_timestamp_down(config.dt, config.data['round_minutes'])
        else:
            dt_to_format = config.dt
        return format_timestamp(dt_to_format)
    
    emhi_hooks = {
        'get_station_name': get_station_name,
        'get_metadata_func': get_metadata_func,
        'format_timestamp_func': format_timestamp_func,
        'get_safe_name': safe_name_function,  # EMHI uses safe name function
    }
    
    # Use common processing with EMHI-specific hooks
    common_process_stations(config, stations, emhi_hooks)

# Hook configuration for common_main
emhi_hooks = {
    'create_parser': create_parser,
    'configure_from_args': configure_from_args,
    'download_data': download_data,
    'parse_data': parse_data,
    'process_stations': process_stations,
    'config_class': EMHIConfig,
    'script_file': __file__
}

def main():
    """EMHI main function using common infrastructure"""
    return common_main(emhi_hooks)

if __name__ == "__main__":
    main()
