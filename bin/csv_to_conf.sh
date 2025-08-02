#!/bin/bash

# Script to convert places.csv to places.conf
# Usage: ./csv_to_conf.sh [input_file] [output_file]

# Default file paths
INPUT_FILE="${1:-places.csv}"
OUTPUT_FILE="${2:-places.conf}"

# Check if input file exists
if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: Input file '$INPUT_FILE' not found!"
    exit 1
fi

echo "Converting $INPUT_FILE to $OUTPUT_FILE..."

# Create conf file with header and data
{
    sep=';'
    if [ x"$SEP" != x"" ]; then
        sep=${SEP}
    fi
    # Add comment sections
    echo "##dir:title:coord:wg:yr:emhi:mnt:emu:ut:arhiiv:empg:flydog:ttu"
    echo "##sisejarved"
    
    # Skip CSV header and convert data lines
    tail -n +2 "$INPUT_FILE" | while IFS=${sep} read -r dir title coord wg yr emhi mnt emu ut arhiiv empg flydog ttu; do
        # Remove quotes from fields
        dir=$(echo "$dir" | sed 's/^"//'${sep}'s/"$//')
        title=$(echo "$title" | sed 's/^"//'${sep}'s/"$//')
        coord=$(echo "$coord" | sed 's/^"//'${sep}'s/"$//')
        wg=$(echo "$wg" | sed 's/^"//'${sep}'s/"$//')
        yr=$(echo "$yr" | sed 's/^"//'${sep}'s/"$//')
        emhi=$(echo "$emhi" | sed 's/^"//'${sep}'s/"$//')
        mnt=$(echo "$mnt" | sed 's/^"//'${sep}'s/"$//')
        emu=$(echo "$emu" | sed 's/^"//'${sep}'s/"$//')
        ut=$(echo "$ut" | sed 's/^"//'${sep}'s/"$//')
        arhiiv=$(echo "$arhiiv" | sed 's/^"//'${sep}'s/"$//')
        empg=$(echo "$empg" | sed 's/^"//'${sep}'s/"$//')
        flydog=$(echo "$flydog" | sed 's/^"//'${sep}'s/"$//')
        ttu=$(echo "$ttu" | sed 's/^"//'${sep}'s/"$//')
        
        # Check if this is a sea location (basic heuristic based on known patterns)
        if [[ "$dir" =~ ^(pirita|rohuneeme|parnu|haapsalu|rohukyla|haademeeste|sorve|ristna|loksa|dirhami|paatsalu|saaretirp|koipsi)$ ]]; then
            if [[ "$ADDED_MERI" != "true" ]]; then
                echo "##meri"
                ADDED_MERI="true"
            fi
        fi
        
        # Output in conf format
        printf '%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s\n' \
            "$dir" "$title" "$coord" "$wg" "$yr" "$emhi" "$mnt" "$emu" "$ut" "$arhiiv" "$empg" "$flydog" "$ttu"
    done
} > "$OUTPUT_FILE"

echo "Conversion completed: $OUTPUT_FILE"
echo "Lines processed: $(grep -v "^##" "$OUTPUT_FILE" | wc -l)"
