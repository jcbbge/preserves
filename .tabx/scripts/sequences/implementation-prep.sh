#!/bin/bash

# TabX Implementation Preparation Sequence
# Usage: ./.tabx/scripts/sequences/implementation-prep.sh "Feature Name"

# Set text formatting variables
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]; then
  echo -e "${YELLOW}Usage: $0 \"Feature Name\"${NC}"
  exit 1
fi

FEATURE_NAME=$1
FEATURE_SLUG=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
FILE_PATH=".tabx/plans/features/$FEATURE_SLUG.md"

echo -e "${BLUE}Preparing implementation for:${NC} ${BOLD}$FEATURE_NAME${NC}"

# Check if feature plan exists
if [ ! -f "$FILE_PATH" ]; then
  echo -e "${RED}Feature plan not found at $FILE_PATH${NC}"
  echo -e "Please create a feature plan first using:"
  echo -e "./.tabx/scripts/sequences/feature-planning.sh \"$FEATURE_NAME\""
  exit 1
fi

# Extract files to modify from feature plan
echo -e "${BLUE}Files to modify based on plan:${NC}"
FILES=$(grep -o '`[^`]*`' "$FILE_PATH" | tr -d '`' | grep -v "^\[")
if [ -z "$FILES" ]; then
  echo -e "${YELLOW}No files identified in the feature plan. Please update the plan with specific files to modify.${NC}"
else
  for FILE in $FILES; do
    if [ -f "$FILE" ]; then
      echo -e "${GREEN}✓${NC} $FILE (exists)"
    else
      echo -e "${YELLOW}?${NC} $FILE (not found)"
    fi
  done
fi

# Extract principles from feature plan
echo -e "\n${BLUE}Principle considerations:${NC}"
if grep -q "### Accessibility First" "$FILE_PATH"; then
  echo -e "${GREEN}✓${NC} Accessibility First"
else
  echo -e "${YELLOW}?${NC} Accessibility First - Not explicitly addressed"
fi

if grep -q "### User-Centered Design" "$FILE_PATH"; then
  echo -e "${GREEN}✓${NC} User-Centered Design"
else
  echo -e "${YELLOW}?${NC} User-Centered Design - Not explicitly addressed"
fi

if grep -q "### Sustainable Code" "$FILE_PATH"; then
  echo -e "${GREEN}✓${NC} Sustainable Code"
else
  echo -e "${YELLOW}?${NC} Sustainable Code - Not explicitly addressed"
fi

# Check for implementation plan
if grep -q "## Implementation Plan" "$FILE_PATH"; then
  echo -e "\n${BLUE}Implementation plan found.${NC}"
else
  echo -e "\n${YELLOW}No implementation plan section found. Consider adding detailed steps.${NC}"
fi

# Update session file
echo -e "\n${BLUE}Updating current session with feature context...${NC}"
SESSION_FILE=".tabx/sessions/current.md"

# Update focus in session file
sed -i "s/^**Focus**: .*/**Focus**: Implementing $FEATURE_NAME/g" "$SESSION_FILE"

# Update mode in session file
sed -i "s/^**Mode**: .*/**Mode**: Build/g" "$SESSION_FILE"

# Add feature to in-progress in session file
if ! grep -q "$FEATURE_NAME" "$SESSION_FILE"; then
  sed -i "/### In Progress/a - $FEATURE_NAME implementation\n  - Setting up initial implementation\n  - Following feature plan at $FILE_PATH" "$SESSION_FILE"
fi

echo -e "\n${GREEN}Implementation preparation complete.${NC}"
echo -e "\nNext steps:"
echo -e "1. Review the feature plan in detail: $FILE_PATH"
echo -e "2. Implement the feature according to the plan"
echo -e "3. Validate against acceptance criteria and principles"
