#!/bin/bash

# AI Documentation Cleanup Script
# Automatically organizes, archives, and cleans up AI documentation

# Configuration
ARCHIVE_DAYS=30        # Files not used for this many days get archived
DELETE_DAYS=90         # Archived files older than this many days get deleted
TEMP_DIR="temp"        # Directory for temporary files
ARCHIVE_DIR="archive"  # Directory for archived files
PATTERNS_DIR="patterns" # Directory for patterns

echo "Starting AI documentation cleanup..."

# Clean temp directory - delete files older than 7 days
find "$(dirname "$0")/${TEMP_DIR}" -type f -mtime +7 -delete 2>/dev/null || echo "No temp files to clean"
echo "✓ Cleaned temporary files"

# Archive unused patterns
for pattern_file in $(find "$(dirname "$0")/${PATTERNS_DIR}" -type f -name "*.md" -mtime +${ARCHIVE_DAYS} 2>/dev/null || echo ""); do
  if [ -n "$pattern_file" ]; then
    # Extract metadata to check if file is still being referenced
    ref_count=$(grep -m 1 "references:" "${pattern_file}" | awk '{print $2}' 2>/dev/null || echo "0")
    
    # If references is 0 or not found, archive the file
    if [[ -z "${ref_count}" || "${ref_count}" -eq 0 ]]; then
      filename=$(basename "${pattern_file}")
      mv "${pattern_file}" "$(dirname "$0")/${ARCHIVE_DIR}/${filename}" 2>/dev/null && \
      echo "→ Archived unused pattern: ${filename}" || \
      echo "Could not archive: ${filename}"
    fi
  fi
done

# Delete very old archived files
find "$(dirname "$0")/${ARCHIVE_DIR}" -type f -mtime +${DELETE_DAYS} -delete 2>/dev/null || echo "No old archives to delete"
echo "✓ Removed old archived files"

echo "✓ Cleanup complete"
