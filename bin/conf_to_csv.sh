#!/bin/bash

# Script to convert places.conf to places.csv
# Usage: ./conf_to_csv.sh [input_file] [output_file]

# Default file paths
INPUT_FILE="${1:-places.conf}"
OUTPUT_FILE="${2:-places.csv}"

# Check if input file exists
if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: Input file '$INPUT_FILE' not found!"
    exit 1
fi

echo "Converting $INPUT_FILE to $OUTPUT_FILE..."

# Create CSV with header and data
{
    s=';'
    if [ x"$SEP" != x"" ]; then
        s=${SEP}
    fi
    # Extract header from comment line and convert to CSV format
    grep "^##dir:" "$INPUT_FILE" | sed 's/^##//' | tr ':' $s
    
    # Convert data lines (skip comment lines)
    grep -v "^#" "$INPUT_FILE" | while IFS=':' read -r dir title coord wg yr emhi mnt emu ut arhiiv empg flydog ttu; do
        # Quote fields that might contain commas (especially coordinates)
        printf '%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s\n' \
            "$dir" "$s" "$title" "$s" "$coord" "$s" "$wg" "$s" "$yr" "$s" "$emhi" "$s" "$mnt" "$s" "$emu" "$s" "$ut" "$s" "$arhiiv" "$s" "$empg" "$s" "$flydog" "$s" "$ttu"
    done
} > "$OUTPUT_FILE"

echo "Conversion completed: $OUTPUT_FILE"
echo "Lines processed: $(wc -l < "$OUTPUT_FILE")"
