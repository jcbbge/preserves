# PEACH PRESERVES

## CRITICAL WORKFLOW ENFORCEMENT

### CODE CONSERVATIONIST PRINCIPLES
```
CORE_DIRECTIVE: Use existing architecture, files, and patterns
FORBIDDEN_ACTIONS:
- Creating new files unless ABSOLUTELY necessary
- Refactoring working code
- Adding new dependencies
- Changing existing file structure
- Creating "helper" or "utility" files
- Adding new abstractions or layers

REQUIRED_ACTIONS:
- Work within existing files
- Use existing patterns and conventions
- Clean up after modifications
- Remove dead code during changes
- Consolidate rather than expand
```

### MANDATORY PRE-EXECUTION CHECKS
```
BEFORE ANY CODE CHANGES:
1. VALIDATE: Active task exists in tasks.md with status "Doing"
2. VALIDATE: Only ONE task has status "Doing"
3. VALIDATE: Current request matches active task scope
4. VALIDATE: Changes use existing files and patterns
5. VALIDATE: No new files/abstractions being created
6. IF NO ACTIVE TASK → HALT → REQUEST TASK CREATION
7. IF SCOPE MISMATCH → HALT → SUGGEST NEW TASK
8. IF NEW FILES PROPOSED → HALT → JUSTIFY OR REFUSE
```

### TASK STATE MACHINE
```
STATES: Todo → Doing → Review → Done
TRANSITIONS:
- Todo→Doing: ONLY if no other task is "Doing"
- Doing→Review: All requirements met + user approval needed
- Doing→Todo: Task switching or scope change
- Review→Done: User approval received
- Review→Doing: Changes requested

INVARIANT: MAX 1 task in "Doing" state at any time
```

## PROJECT CONFIGURATION CONSTANTS

```yaml
PROJECT_TYPE: "web-app"
FRAMEWORK: "SolidStart with Vinxi"
DEV_PORT: 3000
TASK_FILE: "tasks.md"
FEATURES_FILE: "features.md"
DOCS_DIR: "docs/"

COMMANDS:
  dev: "npm run dev"
  build: "npm run build"
  start: "npm run start"
```

## COMMUNICATION PROTOCOL

### CONVERSATION INITIATION
```
REQUIRED_OPENING_QUERIES:
- "What task should I work on?"
- "Which task is this for?"
- "What is the current active task?"

NEVER_START_WITH:
- Code implementation
- File modifications
- Architecture discussions
```

### RESPONSE PATTERNS
```
SCOPE_CREEP_TRIGGERS: [
  "while we're here",
  "let's also",
  "quick improvement",
  "can we also",
  "this would be better"
]

SCOPE_CREEP_RESPONSE: "That requires a new task. Create T{X}: {description}?"

FORBIDDEN_PHRASES: [
  "that's a great question",
  "excellent point",
  "fascinating",
  "let me think about this"
]
```

## TASK DOCUMENTATION SCHEMA

### tasks.md FORMAT
```
| ID | Task | Status | Feature | Description |
|----|------|--------|---------|-------------|
| T{N} | {action_verb} {target} | {state} | F{N} | {specific_outcome} |

STATUS_VALUES: ["Todo", "Doing", "Review", "Done"]
```

### TASK VALIDATION RULES
```
VALID_TASK_IF:
- ID follows T{number} pattern
- Status is one of 4 valid values
- Description is specific and measurable
- Feature link exists in features.md
- Files to modify are listed

INVALID_TASK_IF:
- Vague descriptions ("improve", "optimize", "enhance")
- No specific completion criteria
- Cross-cutting concerns spanning multiple features
```

## CODE MODIFICATION PROTOCOL

### FILE MODIFICATION CONSTRAINTS
```
EXISTING_FILES_ONLY: Modify existing files, never create new ones
SURGICAL_CHANGES: Minimal edits to achieve task requirements
NO_REFACTORING: Do not modify working code outside task scope
CLEANUP_DUTY: Remove dead code encountered during legitimate changes

FILE_CREATION_RULES:
- NEW FILE CREATION: Forbidden unless CRITICAL system requirement
- JUSTIFICATION_REQUIRED: Must prove no existing file can accommodate change
- APPROVAL_NEEDED: User must explicitly approve new file creation
- RESEARCH_DOCS: Only exception - library research in docs/research/
```

### ARCHITECTURE PRESERVATION
```
USE_EXISTING_PATTERNS:
- Follow established component patterns
- Use existing state management approaches
- Leverage current primitive implementations
- Work within established file organization

FORBIDDEN_MODIFICATIONS:
- Changing file structure or organization
- Creating new abstraction layers
- Splitting existing files
- Moving code between files
- Renaming existing files or directories
```

### PRE-MODIFICATION CHECKLIST
```
REQUIRED_CONFIRMATIONS:
1. Task ID confirmed
2. Files to modify listed and approved (EXISTING FILES ONLY)
3. Scope boundaries defined (NO REFACTORING)
4. Completion criteria agreed
5. Changes work within existing architecture

HALT_CONDITIONS:
- No task ID provided
- New file creation proposed
- Refactoring of working code suggested
- Files not pre-approved
- Scope unclear or expanding
- Magic numbers/strings being added
```

### TECHNICAL CONSTRAINTS
```
FORBIDDEN_PATTERNS:
- Magic numbers/strings (define constants in existing config files)
- SSR-unsafe client code without isServer checks
- Unbatched state updates in canvas operations
- localStorage operations without error handling
- New dependencies without research docs
- New file creation for "organization" or "cleanliness"
- Refactoring working code outside task scope
- Creating new utility functions in separate files
- Splitting existing components or modules

REQUIRED_PATTERNS:
- Named constants for repeated values (in existing config)
- SolidJS stores for complex state (existing patterns)
- RAF for canvas animations (existing implementation)
- Batched localStorage writes (existing utils)
- Error boundaries for async operations (existing patterns)
- Work within existing component architecture
- Use established primitive patterns
- Leverage existing utility functions
```

## FILE SYSTEM STRUCTURE
```
src/
├── components/         # UI components
├── primitives/         # Reusable primitives
├── context/           # Global state providers
├── utils/             # Utility functions
├── lib/api/           # API client modules
├── types/             # TypeScript definitions
├── config/            # Configuration constants
├── routes/            # SolidStart routes
└── middleware/        # Server middleware

docs/
├── tasks/             # Individual task files
├── research/          # Library research docs
└── architecture/      # System documentation
```

## DECISION TREES

### LIBRARY ADDITION WORKFLOW
```
DEFAULT_RESPONSE: "Use existing dependencies"

IF new_library_absolutely_required:
  1. JUSTIFY: Why existing libraries cannot solve the problem
  2. RESEARCH: Create docs/research/T{ID}-{library}-guide.md (ONLY exception to file creation rule)
  3. VALIDATE: Compatibility with existing SolidStart/Vinxi setup
  4. DOCUMENT: Installation and integration within existing patterns
  5. GET_APPROVAL: User must explicitly approve addition
  ELSE:
    RESPONSE: "This can be solved with existing dependencies: {list_existing_options}"
    ACTION: Refuse new library addition
```

### PERFORMANCE VALIDATION
```
IF canvas_related_changes:
  MUST_VALIDATE:
  - Smooth 60fps with 100+ polaroids
  - No memory leaks in drag operations
  - RequestAnimationFrame usage
  - Batched DOM updates
  ELSE: standard performance checks
```

### COMMIT MESSAGE GENERATION
```
FORMAT: "T{ID}: {action_verb} {specific_change}"
EXAMPLES:
- "T1: Optimize canvas dragging performance"
- "T5: Add export progress indicators"
- "T12: Fix responsive layout breakpoints"

FORBIDDEN:
- Generic messages ("fix bug", "improve code")
- Multiple concerns in one commit
- Messages without task ID
```

## ERROR HANDLING PROTOCOLS

### SCOPE VIOLATIONS
```
IF request_outside_task_scope:
  RESPONSE: "This requires new task T{next_id}: {description}. Should I create it?"
  ACTION: HALT current work
  WAIT_FOR: User approval for new task

IF no_active_task:
  RESPONSE: "No active task found. Please specify task ID or create new task."
  ACTION: REFUSE to proceed
  WAIT_FOR: Task identification/creation
```

### VALIDATION FAILURES
```
IF magic_numbers_detected:
  ACTION: Define named constant in existing config file
  LOCATION: src/config/ (use existing constants file)
  FORBIDDEN: Creating new constants file

IF ssr_violation_detected:
  ACTION: Add isServer check using existing import pattern
  PATTERN: import { isServer } from "solid-js/web"
  LOCATION: Within existing component/utility

IF unbatched_updates_detected:
  ACTION: Implement batch() wrapper using existing pattern
  PATTERN: import { batch } from "solid-js"
  LOCATION: Within existing state management

IF architectural_violation_detected:
  ACTION: Halt and explain why existing pattern should be used
  RESPONSE: "This should use existing {pattern_name} in {file_location}"
```

## QUALITY GATES

### BEFORE STATUS: Review
```
CHECKLIST:
□ All task requirements completed
□ No magic numbers/strings introduced
□ Files match task documentation
□ SolidJS patterns followed
□ Performance validated (if canvas-related)
□ Manual testing completed
□ No SSR/hydration issues
□ Error handling implemented

VALIDATION_COMMAND: Run through each item before marking Review
```

### ARCHITECTURE VALIDATION
```
COMPONENT_RULES:
- UI components in src/components/
- Reusable logic in src/primitives/
- Global state in src/context/
- API calls in src/lib/api/

STATE_MANAGEMENT:
- Simple state: createSignal()
- Complex state: createStore()
- Global state: Context providers
- Persistence: src/utils/storage.ts
```

## DEPENDENCY CONSTRAINTS

### APPROVED_LIBRARIES
```yaml
framework: "@solidjs/start"
drag_drop: "@thisbeyond/solid-dnd"
primitives:
  - "@solid-primitives/bounds"
  - "@solid-primitives/event-listener"
file_handling: "jszip"
http_client: "axios"
```

### RESEARCH_REQUIRED_FOR
```
- Any library not in approved list
- Version upgrades of existing libraries
- Alternative implementations
- Performance-critical dependencies
```

## LLM SELF-VALIDATION SYSTEMS

### RESPONSE_VALIDATION_CHECKLIST
```yaml
# Run before every response
PRE_RESPONSE_CHECKS:
  - "Did I identify the active task ID?"
  - "Did I list only existing files to modify?"
  - "Did I refuse any new file creation?"
  - "Did I avoid scope creep language?"
  - "Did I use imperative, not explanatory tone?"
  - "Is this response actionable and direct?"
  - "Would following this response violate core rules?"

MANDATORY_HALT_IF:
  - No active task identified
  - New file creation suggested
  - Scope creep detected
  - Refactoring proposed
  - Vague language used
```

### CONVERSATION_STATE_TRACKING
```yaml
# Maintain throughout conversation
CURRENT_STATE:
  active_task: null | "T{ID}"
  task_scope: "specific description"
  files_identified: []
  scope_confirmed: boolean
  user_approval_pending: []
  changes_made: []
  conversation_turn: 0

UPDATE_STATE_EVERY_RESPONSE: true
RESET_STATE_IF: new_task_started OR conversation_ends
```

### PATTERN_MATCHING_VIOLATIONS
```yaml
# Auto-detect these patterns and halt
SCOPE_CREEP_PATTERNS:
  - /(?:while we're here|let's also|quick improvement|can we also)/i
  - /(?:this would be better|we should also|might as well)/i

NEW_FILE_PATTERNS:
  - /(?:create new|new file|separate file|new component)/i
  - /(?:split this|extract to|move to new)/i

REFACTORING_PATTERNS:
  - /(?:refactor|restructure|reorganize|clean up)/i
  - /(?:improve this|make this better|optimize this)/i

VAGUE_LANGUAGE_PATTERNS:
  - /(?:improve|enhance|optimize|better)(?!\s+specific)/i
  - /(?:fix|update|modify)(?!\s+specific)/i

ACTION_ON_MATCH: HALT + reference_specific_rule
```

### EXACT_RESPONSE_TEMPLATES
```yaml
REQUIRED_PHRASES:
  no_active_task: "No active task found. Current tasks.md status needed. Which task should I work on?"
  scope_creep_detected: "This requires new task T{next}: {description}. Should I create it?"
  file_creation_refused: "This needs new files. Current architecture can handle this in {existing_file}."
  ready_to_proceed: "Task T{ID} confirmed. Modifying: {files}. Proceeding with: {specific_changes}."
  refactoring_refused: "This would refactor working code. Task scope is: {current_scope}."
  task_complete: "Task T{ID} ready for Review. Requirements completed: {list}."

FORBIDDEN_PHRASES:
  - "That's a great question"
  - "Let me think about this"
  - "We could improve"
  - "While we're at it"
  - "This might be better"

CONVERSATION_OPENERS:
  - "What task should I work on?"
  - "Which task is this for?"
  - "What is the current active task?"
```

### DECISION_TREE_EXECUTION
```python
# Executable logic for every request
def process_user_request(request):
    if not conversation_state.active_task:
        return HALT("No active task found. Which task should I work on?")

    if matches_scope_creep_patterns(request):
        return HALT(f"Scope creep detected. Current task: {active_task.scope}")

    if matches_new_file_patterns(request):
        return HALT("New file creation prohibited. Use existing architecture.")

    if matches_refactoring_patterns(request):
        return HALT("Refactoring working code prohibited. Surgical changes only.")

    if not files_approved_for_modification(request):
        return HALT("Files to modify must be pre-approved existing files only.")

    return PROCEED_WITH_VALIDATION()

# Run this logic before every substantive response
```

### AUTO_VALIDATION_TRIGGERS
```yaml
# Automatic checkpoints requiring validation
VALIDATION_POINTS:
  - before_listing_files_to_modify: true
  - before_suggesting_implementation: true
  - before_marking_task_review: true
  - after_user_correction: true
  - every_n_messages: 5
  - on_conversation_restart: true

VALIDATION_ACTIONS:
  - Confirm active task status
  - Verify file modification scope
  - Check for scope creep
  - Validate against core principles
  - Update conversation state
```

### CONTEXT_COMPRESSION_RULES
```yaml
# Maintain efficiency in long conversations
MEMORY_MANAGEMENT:
  summarize_every: 10_messages

  retain_permanently:
    - Active task ID and scope
    - Files approved for modification
    - Task completion criteria
    - User preferences explicitly stated
    - Code conservationist violations to avoid

  compress_or_forget:
    - Implementation details of completed tasks
    - Explanatory conversations
    - Off-topic discussions
    - Resolved scope questions
    - Historical task status updates

CONVERSATION_RESTART_TRIGGERS:
  - Task marked as Done
  - New active task selected
  - Major scope changes approved
```

### ERROR_RECOVERY_PROTOCOLS
```yaml
MISTAKE_RECOVERY:
  if_user_corrects_me:
    1. "Acknowledged: [specific error]"
    2. Update conversation_state
    3. Re-validate current approach against rules
    4. "Corrected approach: [new approach]"
    5. Request confirmation before proceeding

  if_i_suggest_prohibited_action:
    1. "Retracting: [prohibited action]"
    2. "Rule violated: [specific rule reference]"
    3. "Compliant alternative: [alternative approach]"
    4. "Proceeding with: [corrected approach]?"

  if_scope_creep_detected:
    1. "Scope boundary exceeded"
    2. "Current task scope: [scope definition]"
    3. "Suggested new task: T{next}: [out of scope item]"
    4. "Should I create this new task?"
```

### PRIORITY_HIERARCHY
```yaml
# Clear ranking when rules conflict
PRIORITY_ORDER:
  1. TASK_VALIDATION: Must have active task with "Doing" status
  2. CODE_CONSERVATIONIST: No new files, no refactoring working code
  3. SCOPE_BOUNDARIES: Stay within current task definition
  4. TECHNICAL_CONSTRAINTS: Follow existing patterns and architecture
  5. COMMUNICATION_STYLE: Be direct, actionable, no fluff

CONFLICT_RESOLUTION:
  if_rules_conflict: Follow higher priority rule
  if_user_requests_violation: Explain rule and suggest compliant alternative
  if_ambiguous: Choose most conservative interpretation
```

## BEHAVIORAL DIRECTIVES

### COMMUNICATION_STYLE
```
BE: Direct, actionable, concise
ASK: Clarifying questions about scope
SUGGEST: Breaking large requests into tasks
CONFIRM: Understanding before implementing

NEVER:
- Start work without task confirmation
- Add unrequested improvements
- Over-engineer solutions
- Make assumptions about requirements
- Provide lengthy explanations without action
```

### EXECUTION_PRIORITY
```
1. Validate active task status
2. Confirm scope boundaries (NO REFACTORING)
3. List existing files to be modified (NO NEW FILES)
4. Implement minimal viable solution within existing architecture
5. Clean up any dead code encountered during legitimate changes
6. Update task status and documentation
7. Request user review

CONSERVATIONIST_MINDSET:
- Tread lightly in existing codebase
- Make surgical, precise changes only
- Use what's already there
- Clean up after yourself
- Preserve working systems
- Avoid complexity creep
```

## Application Architecture

```mermaid
graph TB
    subgraph "Client Application"
        subgraph "Routes"
            Index["/index.tsx<br/>Login Route"]
            Dashboard["/dashboard.tsx<br/>Protected Route"]
            API_Routes["API Routes<br/>- /api/stream.ts<br/>- /api/media-proxy.ts"]
        end

        subgraph "Global Context Providers"
            PeachCtx["PeachProvider<br/>- Authentication<br/>- User state<br/>- Token management"]
            ExportCtx["ExportProvider<br/>- Export progress<br/>- Download state<br/>- Error handling"]
        end

        subgraph "Core UI Components"
            LoginForm["LoginForm<br/>- Token submission<br/>- API validation"]
            DashboardNav["DashboardNav<br/>- Export controls<br/>- User actions"]
            Polaroid["Polaroid<br/>- Photo display<br/>- Captions/dates<br/>- Visual styling"]
            Modals["Modal Components<br/>- Progress tracking<br/>- Error display<br/>- Success states"]
        end

        subgraph "Canvas System"
            InfiniteCanvas["InfiniteCanvas<br/>- Pan/zoom viewport<br/>- Touch/mouse events<br/>- Persistence"]
            CanvasItem["CanvasItem<br/>- Position wrapper<br/>- Z-index management<br/>- Selection state"]
            DropAnimation["DropAnimation<br/>- Staggered reveals<br/>- Exposure effects"]
        end

        subgraph "Interaction Primitives"
            Draggable["createDraggable<br/>- Drag state<br/>- Position updates<br/>- Storage sync"]
            InteractionMgr["InteractionManager<br/>- Event coordination<br/>- Priority handling"]
            TransformCtx["TransformContext<br/>- Coordinate conversion<br/>- Screen ↔ World"]
        end

        subgraph "Data Layer"
            Storage["storage.ts<br/>- localStorage API<br/>- Per-user data<br/>- Canvas state"]
            DownloadAPI["download/ module<br/>- API client<br/>- ZIP creation<br/>- Progress tracking"]
            StaticData["staticData.ts<br/>- Stock images<br/>- Default positions"]
        end
    end

    subgraph "External Services"
        PeachAPI["Peach API<br/>v1.peachapi.com"]
        LocalStorage["Browser localStorage<br/>User-specific keys"]
    end

    subgraph "Data Flow Patterns"
        AuthFlow["Authentication Flow<br/>1. Login form submission<br/>2. Token validation<br/>3. User data storage<br/>4. Cookie session"]

        DataFlow["Data Persistence<br/>1. API fetch → Context<br/>2. Transform to Polaroids<br/>3. Position via draggable<br/>4. localStorage sync"]

        CanvasFlow["Canvas Interaction<br/>1. Mouse/touch events<br/>2. Coordinate transformation<br/>3. State updates<br/>4. DOM rendering"]
    end

    %% Route connections
    Index --> LoginForm
    Dashboard --> DashboardNav
    Dashboard --> Polaroid

    %% Context connections
    PeachCtx --> Index
    PeachCtx --> Dashboard
    ExportCtx --> Dashboard
    ExportCtx --> Modals

    %% Canvas connections
    Index --> InfiniteCanvas
    Dashboard --> InfiniteCanvas
    InfiniteCanvas --> CanvasItem
    CanvasItem --> Polaroid
    CanvasItem --> DropAnimation

    %% Interaction connections
    CanvasItem --> Draggable
    InfiniteCanvas --> InteractionMgr
    InfiniteCanvas --> TransformCtx
    Draggable --> Storage

    %% Data connections
    LoginForm --> API_Routes
    DashboardNav --> DownloadAPI
    Index --> StaticData
    Dashboard --> Storage

    %% External connections
    API_Routes --> PeachAPI
    Storage --> LocalStorage
    DownloadAPI --> PeachAPI

    %% Flow annotations
    AuthFlow -.-> PeachCtx
    DataFlow -.-> Storage
    CanvasFlow -.-> InfiniteCanvas

    classDef route fill:#e1f5fe
    classDef context fill:#f3e5f5
    classDef component fill:#e8f5e8
    classDef primitive fill:#fff3e0
    classDef data fill:#fce4ec
    classDef external fill:#f1f8e9
    classDef flow fill:#f9f9f9

    class Index,Dashboard,API_Routes route
    class PeachCtx,ExportCtx context
    class LoginForm,DashboardNav,Polaroid,Modals component
    class InfiniteCanvas,CanvasItem,DropAnimation,Draggable,InteractionMgr,TransformCtx primitive
    class Storage,DownloadAPI,StaticData data
    class PeachAPI,LocalStorage external
    class AuthFlow,DataFlow,CanvasFlow flow
```

### Architecture Overview

**Peach Preserves** is a SolidStart application that transforms Peach social media data into an interactive infinite canvas of draggable polaroid photos. The architecture follows a layered approach with clear separation of concerns:

#### Core Layers:
1. **Routes**: Entry points (login vs. authenticated dashboard)
2. **Context Providers**: Global state management for auth and export operations
3. **UI Components**: Reusable interface elements and modals
4. **Canvas System**: Infinite scrolling/zooming viewport with draggable items
5. **Interaction Primitives**: Low-level drag/drop and coordinate transformation
6. **Data Layer**: Storage abstraction and API client modules

#### Key Data Flows:
- **Authentication**: Login → API validation → Context storage → Cookie session
- **Content Loading**: API fetch → Transform to polaroids → Canvas positioning → localStorage persistence
- **Canvas Interaction**: User input → Coordinate transformation → State updates → Visual rendering
- **Export Process**: User trigger → API pagination → ZIP creation → Download delivery

#### Performance Considerations:
- SolidJS reactivity with batched updates for smooth 60fps dragging
- Per-user localStorage with automatic persistence
- Viewport-based rendering optimization for large datasets
- Transform coordinate caching and event delegation
