#!/bin/bash

# TabX AI Sequence Runner
# This script is designed to be invoked by AI assistants to run sequences
# Usage: ./.tabx/scripts/helpers/ai-sequence-runner.sh [sequence-name] [arg1] [arg2] ...

# Set text formatting variables
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ $# -lt 1 ]; then
  echo -e "${YELLOW}Usage: $0 [sequence-name] [arg1] [arg2] ...${NC}"
  exit 1
fi

SEQUENCE=$1
shift  # Remove the first argument (sequence name), leaving the rest as parameters

# Verify sequence exists
SEQUENCE_SCRIPT=".tabx/scripts/sequences/$SEQUENCE.sh"
if [ ! -f "$SEQUENCE_SCRIPT" ]; then
  echo -e "${RED}Sequence not found: $SEQUENCE${NC}"
  echo -e "Available sequences:"
  for script in .tabx/scripts/sequences/*.sh; do
    basename=$(basename "$script" .sh)
    echo -e "- $basename"
  done
  exit 1
fi

# Log AI invocation
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "[$TIMESTAMP] AI invoked sequence: $SEQUENCE $@" >> .tabx/scripts/helpers/ai-activity.log

# Run the sequence
echo -e "${BLUE}AI Assistant is running sequence:${NC} ${BOLD}$SEQUENCE${NC}"
$SEQUENCE_SCRIPT "$@"

echo -e "\n${GREEN}Sequence completed by AI Assistant.${NC}"
echo -e "The output of this sequence has been generated to help with the current task."
echo -e "You can review the sequence at $SEQUENCE_SCRIPT"
