#!/bin/bash

# TabX Feature Planning Sequence
# Usage: ./.tabx/scripts/sequences/feature-planning.sh "Feature Name"

# Set text formatting variables
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]; then
  echo -e "${YELLOW}Usage: $0 \"Feature Name\"${NC}"
  exit 1
fi

FEATURE_NAME=$1
FEATURE_SLUG=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
FILE_PATH=".tabx/plans/features/$FEATURE_SLUG.md"

echo -e "${BLUE}Creating feature plan for:${NC} ${BOLD}$FEATURE_NAME${NC}"

# Check if feature plan already exists
if [ -f "$FILE_PATH" ]; then
  echo -e "${YELLOW}Feature plan already exists at $FILE_PATH${NC}"
  read -p "Overwrite? (y/n): " OVERWRITE
  if [ "$OVERWRITE" != "y" ]; then
    echo "Aborting."
    exit 1
  fi
fi

# Copy template and fill in feature name
cp .tabx/plans/features/feature-template.md "$FILE_PATH"
sed -i "s/\[Feature Name\]/$FEATURE_NAME/g" "$FILE_PATH"

# Open the file in the default editor if available
if [ -n "$EDITOR" ]; then
  $EDITOR "$FILE_PATH"
elif command -v nano >/dev/null 2>&1; then
  nano "$FILE_PATH"
elif command -v vim >/dev/null 2>&1; then
  vim "$FILE_PATH"
else
  echo -e "${YELLOW}No editor found. Please edit $FILE_PATH manually.${NC}"
fi

echo -e "${GREEN}Feature plan created at:${NC} ${BOLD}$FILE_PATH${NC}"
echo -e "\nNext steps:"
echo -e "1. Complete the feature plan details"
echo -e "2. Review alignment with core principles"
echo -e "3. Share for feedback"
