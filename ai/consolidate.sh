#!/bin/bash

# AI Documentation Consolidation Script
# Helps merge related patterns to reduce duplication

PATTERNS_DIR="patterns"
TEMP_DIR="temp"

show_help() {
    echo "Usage: $0 [options] <file1> <file2> [output_name]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 patterns/forms.md patterns/validation.md forms-validation"
    echo ""
    exit 0
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
fi

if [[ $# -lt 2 ]]; then
    echo "Error: Please provide at least two files to merge"
    show_help
fi

FILE1="$1"
FILE2="$2"
OUTPUT_NAME="${3:-merged-pattern}"

if [[ ! -f "$FILE1" || ! -f "$FILE2" ]]; then
    echo "Error: One or more input files not found"
    exit 1
fi

# Create a temporary file with both contents
TEMP_FILE="$(dirname "$0")/${TEMP_DIR}/${OUTPUT_NAME}-temp.md"
OUTPUT_FILE="$(dirname "$0")/${PATTERNS_DIR}/${OUTPUT_NAME}.md"

echo "Merging files:"
echo "- $FILE1"
echo "- $FILE2"
echo "Into: $OUTPUT_NAME.md"

# Extract metadata from both files
NAME1=$(grep -m 1 "name:" "$FILE1" | cut -d':' -f2 | tr -d ' ')
NAME2=$(grep -m 1 "name:" "$FILE2" | cut -d':' -f2 | tr -d ' ')
CATEGORY1=$(grep -m 1 "category:" "$FILE1" | cut -d':' -f2 | tr -d ' ')
CATEGORY2=$(grep -m 1 "category:" "$FILE2" | cut -d':' -f2 | tr -d ' ')
REF1=$(grep -m 1 "references:" "$FILE1" | awk '{print $2}')
REF2=$(grep -m 1 "references:" "$FILE2" | awk '{print $2}')
REF_SUM=$((REF1 + REF2))

# Create new metadata header
cat > "$TEMP_FILE" << EOF
---
name: ${OUTPUT_NAME}
category: ${CATEGORY1}
created: $(date '+%Y-%m-%d')
last_used: $(date '+%Y-%m-%d')
references: ${REF_SUM}
merged_from:
  - ${NAME1}
  - ${NAME2}
components:
$(grep -A 10 "components:" "$FILE1" | grep -v "components:" | grep -v -- "---" | grep -v "^$")
$(grep -A 10 "components:" "$FILE2" | grep -v "components:" | grep -v -- "---" | grep -v "^$" | sort -u)
---

# ${OUTPUT_NAME^} Pattern
> This pattern was created by merging ${NAME1} and ${NAME2}

