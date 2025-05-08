#!/bin/bash

# TabX Session Management Script
# Usage: ./.tabx/scripts/session.sh [start|end]

# Set text formatting variables
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the current date
DATE=$(date +"%Y-%m-%d")

# Function to initialize current session content
initialize_session_content() {
  local SESSION_FILE=$1
  local CURRENT_DATE=$2

  # Get repo name for project context
  REPO_NAME=$(basename -s .git `git config --get remote.origin.url` 2>/dev/null || basename "$PWD")

  # Check if the current session file contains template placeholders
  if grep -q "\[Date\]" "$SESSION_FILE" || grep -q "\[Vision\/Structure\/Build\]" "$SESSION_FILE"; then
    echo -e "${YELLOW}Session file contains template placeholders. Initializing with default content...${NC}"

    # Replace date placeholder
    sed -i "s/\[Date\]/$CURRENT_DATE/g" "$SESSION_FILE"

    # Replace other common placeholders
    sed -i "s/\[Vision\/Structure\/Build\]/Vision/g" "$SESSION_FILE"
    sed -i "s/\[Brief description of what we're working on\]/Resuming project work after interruption/g" "$SESSION_FILE"
    sed -i "s/\[List the specific principles most relevant to this work\]/Accessibility First, User-Centered Design, Sustainable Code/g" "$SESSION_FILE"

    # Update the Completed section
    if ! grep -q "- TabX framework initialized" "$SESSION_FILE"; then
      sed -i "/### Completed/a - TabX framework initialized\n- Basic directory structure created" "$SESSION_FILE"
    fi

    # Update the In Progress section
    if ! grep -q "- TabX documentation customization" "$SESSION_FILE"; then
      sed -i "/### In Progress/a - TabX documentation customization\n  - Filling out principles and system documentation\n  - Setting up initial project context" "$SESSION_FILE"
    fi

    # Update the Next Up section
    if ! grep -q "- Feature planning" "$SESSION_FILE"; then
      sed -i "/### Next Up/a - Feature planning\n- Project architecture documentation\n- Initial feature implementation" "$SESSION_FILE"
    fi

    # Clean up key decisions placeholder
    sed -i "/| \[Decision made\] | \[Why this decision was made\] | \[Which principles influenced this\] | \[Date\] |/d" "$SESSION_FILE"

    # Add a key decision about resuming
    if ! grep -q "Resumed development session" "$SESSION_FILE"; then
      sed -i "/## Key Decisions/a | Resumed development session | To maintain continuity after interruption | Sustainable Code | $CURRENT_DATE |" "$SESSION_FILE"
    fi

    # Add principle alignment if placeholders exist
    if grep -q "\[How today's work upheld this principle\]" "$SESSION_FILE"; then
      sed -i "/### Accessibility First/a - Continuing to prioritize accessibility in all aspects\n- Planning to validate accessibility of current components" "$SESSION_FILE"

      sed -i "/### User-Centered Design/a - Focusing on user needs as primary driver of development\n- Planning to review current user stories and requirements" "$SESSION_FILE"

      sed -i "/### Sustainable Code/a - Maintaining development continuity through session management\n- Ensuring knowledge preservation across interruptions" "$SESSION_FILE"
    fi

    # Update technical context if placeholders exist
    if grep -q "\`\[path\/to\/file\]\`: \[Current state\/purpose\]" "$SESSION_FILE"; then
      sed -i "/\`\[path\/to\/file\]\`: \[Current state\/purpose\]/d" "$SESSION_FILE"
      sed -i "/## Technical Context/a **Key Files**:\n- \`.tabx/docs/principles.md\`: Core project principles\n- \`.tabx/docs/system.md\`: System architecture documentation\n- \`.tabx/sessions/current.md\`: Current session tracking" "$SESSION_FILE"
    fi

    if grep -q "\[Component\]: \[Current state\/purpose\]" "$SESSION_FILE"; then
      sed -i "/\[Component\]: \[Current state\/purpose\]/d" "$SESSION_FILE"
      sed -i "/## Technical Context/a **Components in Focus**:\n- Session Management: Ensuring development continuity\n- Documentation: Maintaining project knowledge base" "$SESSION_FILE"
    fi

    # Update next session preparation
    sed -i "s/\[Vision\/Structure\/Build\]/Structure/g" "$SESSION_FILE"

    if grep -q "\[Important information to remember\]" "$SESSION_FILE"; then
      sed -i "/## Next Session Preparation/a **Critical Context**:\n- Session resumption after interruption\n- Need to review latest state of project\n- Continue from where we left off" "$SESSION_FILE"
    fi

    if grep -q "\[Links or paths to relevant documentation\]" "$SESSION_FILE"; then
      sed -i "/## Next Session Preparation/a **Reference Materials**:\n- \`.tabx/sessions/archive/\`: Previous session details\n- \`.tabx/docs/principles.md\`: Project principles reference" "$SESSION_FILE"
    fi

    # Update session reflections
    if grep -q "\[Positive aspects of this session\]" "$SESSION_FILE"; then
      sed -i "/## Session Reflections/a **What Went Well**:\n- Successfully resumed development\n- Maintained project context across interruption\n- Preserved knowledge continuity" "$SESSION_FILE"
    fi

    if grep -q "\[Areas for improvement\]" "$SESSION_FILE"; then
      sed -i "/## Session Reflections/a **What Could Improve**:\n- More detailed handoff documentation\n- Better interruption handling\n- Clearer entry points for resumption" "$SESSION_FILE"
    fi

    if grep -q "\[Notes on how well we aligned with our cultural values\]" "$SESSION_FILE"; then
      sed -i "/## Session Reflections/a **Cultural Observations**:\n- Session management helps maintain principle focus\n- Structured approach preserves cultural continuity\n- Explicit principles prevent drift during interruptions" "$SESSION_FILE"
    fi

    echo -e "${GREEN}✓ Session file initialized with contextual content${NC}"
  else
    echo -e "${GREEN}✓ Session file already contains customized content${NC}"
  fi
}

# Function to start a new session
start_session() {
  echo -e "${BLUE}Starting new TabX session...${NC}"

  # Check if there's an active session to archive
  if [ -s .tabx/sessions/current.md ]; then
    # Get the date from the current session file
    SESSION_DATE=$(head -n 1 .tabx/sessions/current.md | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || echo "unknown-date")

    # Create archive directory if it doesn't exist
    mkdir -p .tabx/sessions/archive

    # Archive the current session
    cp .tabx/sessions/current.md .tabx/sessions/archive/session-${SESSION_DATE}.md
    echo -e "${GREEN}Previous session archived to .tabx/sessions/archive/session-${SESSION_DATE}.md${NC}"
  fi

  # Update the current session with today's date in the header and key decisions table
  sed -i "" "1s/^# Current Session: .*/# Current Session: $DATE/" .tabx/sessions/current.md
  sed -i "" "s/| [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} |/| $DATE |/g" .tabx/sessions/current.md

  # Initialize the session content if needed
  initialize_session_content ".tabx/sessions/current.md" "$DATE"

  echo -e "${GREEN}New session started for $DATE${NC}"
  echo -e "Session file: ${BOLD}.tabx/sessions/current.md${NC}"
}

# Function to end a session
end_session() {
  echo -e "${BLUE}Ending TabX session...${NC}"

  # Check if there's an active session
  if [ ! -s .tabx/sessions/current.md ]; then
    echo -e "${YELLOW}No active session found.${NC}"
    return 1
  fi

  # Get the date from the current session file
  SESSION_DATE=$(head -n 1 .tabx/sessions/current.md | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || echo "$DATE")

  # Create archive directory if it doesn't exist
  mkdir -p .tabx/sessions/archive

  # Archive the current session
  cp .tabx/sessions/current.md .tabx/sessions/archive/session-${SESSION_DATE}.md

  echo -e "${GREEN}Session archived to .tabx/sessions/archive/session-${SESSION_DATE}.md${NC}"
  echo -e "${YELLOW}Don't forget to update the Next Session Preparation section.${NC}"
}

# Main execution
if [ $# -lt 1 ]; then
  echo -e "${YELLOW}Usage: $0 [start|end]${NC}"
  exit 1
fi

case "$1" in
  "start")
    start_session
    ;;
  "end")
    end_session
    ;;
  *)
    echo -e "${YELLOW}Unknown command: $1${NC}"
    echo -e "Usage: $0 [start|end]"
    exit 1
    ;;
esac
