#!/bin/bash

# TTU weather data parser - bash version
# Converts parse_ttu.js functionality to bash

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT="${SCRIPT_DIR}/../public/ttu_data/parnu/arc-file-parnu.html"
STATION=""
DEBUG=0
TIME=$(date +%s)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input)
            INPUT="$2"
            shift 2
            ;;
        -s|--station)
            STATION="$2"
            shift 2
            ;;
        -d|--debug)
            DEBUG=1
            shift
            ;;
        *)
            if [[ -z "$INPUT_SET" ]]; then
                INPUT="$1"
                INPUT_SET=1
            elif [[ -z "$STATION" ]]; then
                STATION="$1"
            elif [[ "$1" == "debug" ]]; then
                DEBUG=1
            fi
            shift
            ;;
    esac
done

# Check if input file exists
if [[ ! -f "$INPUT" ]]; then
    echo "Error: Could not find input file: $INPUT" >&2
    exit 1
fi

# Get real path and directory
REAL_PATH=$(realpath "$INPUT" 2>/dev/null)
if [[ -z "$REAL_PATH" ]]; then
    echo "Error: Could not resolve input file path: $INPUT" >&2
    exit 1
fi

DIR=$(dirname "$REAL_PATH")/

# Function to format time string
timestr() {
    local time_input="$1"
    local date_obj
    
    if [[ "$time_input" =~ ^[0-9]+$ ]]; then
        date_obj=$(date -r "$time_input" "+%Y-%m-%d %Y%m%d %d" 2>/dev/null)
    else
        date_obj=$(date -d "$time_input" "+%Y-%m-%d %Y%m%d %d" 2>/dev/null)
    fi
    
    if [[ -z "$date_obj" ]]; then
        date_obj=$(date "+%Y-%m-%d %Y%m%d %d")
    fi
    
    echo "$date_obj"
}

# Function to get last timestamp from file
get_last() {
    local file="$1"
    local last=""
    local ret=0
    
    if [[ -f "$file" ]]; then
        last=$(tail -n 1 "$file" 2>/dev/null | grep -oE '^[0-9]{8} [0-9]{2}:[0-9]{2}')
        if [[ -n "$last" ]]; then
            # Convert YYYYMMDD HH:MM to YYYY-MM-DD HH:MM format
            local formatted_date=$(echo "$last" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3/')
            ret=$(date -d "$formatted_date" +%s 2>/dev/null || echo 0)
        fi
    fi
    
    if [[ "$DEBUG" -eq 1 ]]; then
        echo "Debug: last=\"$last\", ret=\"$ret\", file=\"$file\"" >&2
    fi
    
    echo "$ret"
}

# Function to extract value from HTML using grep and sed
get_val() {
    local label="$1"
    local html_content="$2"
    
    # Look for the label and extract the next td content
    echo "$html_content" | grep -i "$label" | \
        grep -oE '<td[^>]*>[^<]*</td>' | \
        tail -n 1 | \
        sed 's/<[^>]*>//g' | \
        sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Read and process the HTML file
if [[ -f "$REAL_PATH" ]]; then
    HTML_CONTENT=$(cat "$REAL_PATH")
    
    # Extract datetime (Last data:)
    DATETIME=$(get_val "Last data:" "$HTML_CONTENT")
    
    if [[ -n "$DATETIME" ]]; then
        # Parse datetime format: 30.07.2025 16:10
        if [[ "$DATETIME" =~ ([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})[[:space:]]+([0-9]{1,2}):([0-9]{2}) ]]; then
            DAY="${BASH_REMATCH[1]}"
            MONTH="${BASH_REMATCH[2]}"
            YEAR="${BASH_REMATCH[3]}"
            HOUR="${BASH_REMATCH[4]}"
            MINUTE="${BASH_REMATCH[5]}"
            
            # Pad with zeros
            DAY=$(printf "%02d" "$DAY")
            MONTH=$(printf "%02d" "$MONTH")
            HOUR=$(printf "%02d" "$HOUR")
            
            FORMATTED_DATETIME="${YEAR}${MONTH}${DAY} ${HOUR}:${MINUTE}"
            FORMATTED_DATETIME2="${YEAR}-${MONTH}-${DAY} ${HOUR}:${MINUTE}"
            
            # Convert to timestamp
            TIMESTAMP=$(date -d "$FORMATTED_DATETIME2" +%s 2>/dev/null)
            
            if [[ -n "$TIMESTAMP" ]]; then
                # Get date components
                WD=$(timestr "$TIMESTAMP")
                DATESTR=$(echo "$WD" | cut -d' ' -f1)
                
                # Check last entry
                LAST_FILE="${DIR}ARC-${DATESTR}.txt"
                LAST_TIMESTAMP=$(get_last "$LAST_FILE")
                
                if [[ "$TIMESTAMP" -gt "$LAST_TIMESTAMP" ]]; then
                    # Extract weather data
                    WIND=$(get_val "Wind speed / gust:" "$HTML_CONTENT")
                    WIND_DIR=$(get_val "Wind direction:" "$HTML_CONTENT" | grep -oE '[0-9]+' | head -n 1)
                    SEALEVEL=$(get_val "Sealevel" "$HTML_CONTENT")
                    AIR_TEMP=$(get_val "Air temperature:" "$HTML_CONTENT" | grep -oE '[0-9]+\.?[0-9]*' | head -n 1)
                    WATER_TEMP=$(get_val "Water temperature:" "$HTML_CONTENT" | grep -oE '[0-9]+\.?[0-9]*' | head -n 1)
                    HUMID=$(get_val "Humidity:" "$HTML_CONTENT" | grep -oE '[0-9]+\.?[0-9]*' | head -n 1)
                    PRESSURE=$(get_val "Air pressure:" "$HTML_CONTENT" | grep -oE '[0-9]+\.?[0-9]*' | head -n 1)
                    RAIN=$(get_val "Rain accumulation:" "$HTML_CONTENT" | grep -oE '[0-9]+\.?[0-9]*' | head -n 1)
                    
                    # Parse sea level values
                    SL1=0
                    SL2=0
                    if [[ -n "$SEALEVEL" ]]; then
                        SL1=$(echo "$SEALEVEL" | grep -oE '[+-]?[0-9]+\.?[0-9]*' | head -n 1 | sed 's/[^0-9.-]//g')
                        SL2=$(echo "$SEALEVEL" | grep -oE '[+-]?[0-9]+\.?[0-9]*' | tail -n 1 | sed 's/[^0-9.-]//g')
                    fi
                    
                    # Parse wind values
                    WW1=0
                    WW2=0
                    if [[ -n "$WIND" ]]; then
                        WW1=$(echo "$WIND" | grep -oE '[0-9]+\.?[0-9]*' | head -n 1)
                        WW2=$(echo "$WIND" | grep -oE '[0-9]+\.?[0-9]*' | tail -n 1)
                    fi
                    
                    # Set defaults for empty values
                    WIND_DIR=${WIND_DIR:-0}
                    AIR_TEMP=${AIR_TEMP:-0}
                    WATER_TEMP=${WATER_TEMP:-0}
                    WW1=${WW1:-0}
                    WW2=${WW2:-0}
                    HUMID=${HUMID:-0}
                    PRESSURE=${PRESSURE:-0}
                    RAIN=${RAIN:-0}
                    SL1=${SL1:-0}
                    SL2=${SL2:-0}
                    
                    # Create data row
                    ROW="${FORMATTED_DATETIME}\t${SL2}\t${SL1}\t${WATER_TEMP}\t${AIR_TEMP}\t${WW1}\t${WW2}\t${WIND_DIR}\t${HUMID}\t${PRESSURE}\t${RAIN}"
                    
                    # Append to files
                    echo -e "$ROW" >> "$LAST_FILE"
                    echo -e "$ROW" >> "${DIR}last.txt"
                    
                    if [[ "$DEBUG" -eq 1 ]]; then
                        echo "Debug: Written data to $LAST_FILE" >&2
                        echo "Debug: Row: $ROW" >&2
                    fi
                    
                    echo "Data processed successfully for $FORMATTED_DATETIME2"
                else
                    if [[ "$DEBUG" -eq 1 ]]; then
                        echo "Debug: No new data (timestamp: $TIMESTAMP, last: $LAST_TIMESTAMP)" >&2
                    fi
                fi
            else
                echo "Error: Could not parse timestamp from: $DATETIME" >&2
                exit 1
            fi
        else
            echo "Error: Could not parse datetime format: $DATETIME" >&2
            exit 1
        fi
    else
        echo "Error: Could not find 'Last data:' field in HTML" >&2
        exit 1
    fi
else
    echo "Error: Could not read file: $REAL_PATH" >&2
    exit 1
fi
