#!/bin/bash

# MNT weather data parser - optimized bash version
# Converts parse_mnt.js functionality to bash with optimizations

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT="${SCRIPT_DIR}/../public/mnt_data/tamme/arc-file-tamme.html"
DEBUG=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input)
            INPUT="$2"
            shift 2
            ;;
        -d|--debug)
            DEBUG=1
            shift
            ;;
        *)
            INPUT="$1"
            shift
            ;;
    esac
done

# Check if input file exists and get real path
if [[ ! -f "$INPUT" ]]; then
    echo "Error: Could not find input file: $INPUT" >&2
    exit 1
fi

REAL_PATH=$(realpath "$INPUT" 2>/dev/null)
if [[ -z "$REAL_PATH" ]]; then
    echo "Error: Could not resolve input file path: $INPUT" >&2
    exit 1
fi

DIR=$(dirname "$REAL_PATH")/
CURRENT_TIME=$(date +%s)

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
    
    [[ "$DEBUG" -eq 1 ]] && echo "Debug: get_last - file=$file, last=$last, ret=$ret" >&2
    echo "$ret"
}

# Function to extract wind direction from arrow image
extract_wd() {
    local input="$1"
    local arrow_num
    
    if [[ "$input" =~ arrow_([0-9]+)\.gif ]]; then
        arrow_num="${BASH_REMATCH[1]}"
        case "$arrow_num" in
            1) echo "0" ;;
            2) echo "22.5" ;;
            3) echo "45" ;;
            4) echo "67.5" ;;
            5) echo "90" ;;
            6) echo "112.5" ;;
            7) echo "135" ;;
            8) echo "157.5" ;;
            9) echo "180" ;;
            10) echo "202.5" ;;
            11) echo "225" ;;
            12) echo "247.5" ;;
            13) echo "270" ;;
            14) echo "292.5" ;;
            15) echo "315" ;;
            16) echo "337.5" ;;
            *) echo "0" ;;
        esac
    else
        echo "0"
    fi
}

# Function to clean text value
clean_text() {
    local text="$1"
    # Remove everything after space, replace - with 0, trim whitespace
    echo "$text" | sed 's/\s.*$//' | sed 's/-/0/g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Function to process precipitation value
process_precip() {
    local text="$1"
    if [[ "$text" == "-" ]]; then
        echo "0"
    else
        echo "$text"
    fi
}

# Read and process the file
if [[ -f "$REAL_PATH" ]]; then
    declare -a wdata=()
    declare -a ret=()
    
    # Read file and process line by line
    while IFS=$'\t' read -r -a fields || [[ -n "${fields[0]}" ]]; do
        [[ ${#fields[@]} -lt 2 ]] && continue
        
        line="${fields[0]}"
        value="${fields[1]}"
        
        # Process first line (timestamp)
        if [[ ${#ret[@]} -eq 0 ]]; then
            # Convert date format: DD.MM.YY -> 20YYMMDD
            if [[ "$value" =~ ^([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{2})[[:space:]](.+)$ ]]; then
                day=$(printf "%02d" "${BASH_REMATCH[1]}")
                month=$(printf "%02d" "${BASH_REMATCH[2]}")
                year="20${BASH_REMATCH[3]}"
                time_part="${BASH_REMATCH[4]}"
                ret[0]="${year}${month}${day} ${time_part}"
            fi
            continue
        fi
        
        # Clean the text value
        text=$(clean_text "$value")
        
        # Process different field types
        case "$line" in
            "Air temp"*)     ret[1]="$text" ;;
            "Precip. int"*)  ret[2]=$(process_precip "$text") ;;
            "Air humidity"*) ret[3]="$text" ;;
            "Dew point"*)    ret[4]="$text" ;;
            "Max wind sp"*)  ret[5]="$text" ;;
            "Wind dir"*)     ret[6]=$(extract_wd "$value") ;;
            "Wind speed"*)   ret[7]="$text" ;;
            "Visibility"*)   ret[8]="$text" ;;
        esac
        
    done < "$REAL_PATH"
    
    # Create data row if we have data
    if [[ ${#ret[@]} -gt 0 ]]; then
        # Join array with tabs
        data_row=$(IFS=$'\t'; echo "${ret[*]}")
        wdata+=("$data_row")
        
        [[ "$DEBUG" -eq 1 ]] && echo "Debug: Data row: $data_row" >&2
    fi
    
    # Process the weather data
    if [[ ${#wdata[@]} -gt 0 ]]; then
        declare -A file_data=()
        
        current_date=$(date +%s)
        wd_array=($(timestr "$current_date"))
        current_datestr="${wd_array[0]}"
        
        last_timestamp=$(get_last "${DIR}ARC-${current_datestr}.txt")
        test_flag=false
        
        # Process data in reverse order (like the original JS)
        for ((j=${#wdata[@]}-1; j>=0; j--)); do
            row="${wdata[j]}"
            
            # Extract time from row
            if [[ "$row" =~ ^([0-9]{8})[[:space:]]+([0-9]{1,2}):([0-9]{2}) ]]; then
                date_part="${BASH_REMATCH[1]}"
                hour="${BASH_REMATCH[2]}"
                minute="${BASH_REMATCH[3]}"
                
                # Handle day rollover logic
                if [[ "$test_flag" == true && "$hour" =~ ^[12][0-9] ]]; then
                    test_flag=false
                    current_date=$((current_date - 24*3600))
                    wd_array=($(timestr "$current_date"))
                    current_datestr="${wd_array[0]}"
                    last_timestamp=$(get_last "${DIR}ARC-${current_datestr}.txt")
                fi
                
                if [[ "$hour" == "00" ]]; then
                    test_flag=true
                fi
                
                # Create full timestamp
                full_datetime="${current_datestr} $(printf "%02d" "$hour"):$(printf "%02d" "$minute")"
                row_timestamp=$(date -d "$full_datetime" +%s 2>/dev/null || echo 0)
                
                # Check if this is new data
                if [[ "$last_timestamp" -eq 0 || ("$row_timestamp" -gt 0 && "$row_timestamp" -gt "$last_timestamp") ]]; then
                    if [[ -z "${file_data[$current_datestr]}" ]]; then
                        file_data[$current_datestr]=""
                    fi
                    file_data[$current_datestr]="${row}\n${file_data[$current_datestr]}"
                    
                    [[ "$DEBUG" -eq 1 ]] && echo "Debug: Added row for $current_datestr: $row" >&2
                fi
            fi
        done
        
        # Write data to files
        for datestr in "${!file_data[@]}"; do
            if [[ -n "${file_data[$datestr]}" ]]; then
                # Remove trailing newline and reverse order
                data_to_write=$(echo -e "${file_data[$datestr]}" | sed '/^$/d' | tac)
                
                if [[ -n "$data_to_write" ]]; then
                    arc_file="${DIR}ARC-${datestr}.txt"
                    last_file="${DIR}last.txt"
                    
                    echo "$data_to_write" >> "$arc_file"
                    echo "$data_to_write" >> "$last_file"
                    
                    [[ "$DEBUG" -eq 1 ]] && echo "Debug: Written to $arc_file and $last_file" >&2
                    echo "Data processed successfully for $datestr"
                fi
            fi
        done
    else
        echo "No weather data found in file" >&2
        exit 1
    fi
else
    echo "Error: Could not read file: $REAL_PATH" >&2
    exit 1
fi
