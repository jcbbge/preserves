Project Configuration
Project Type: web-app
Framework: SolidStart with Vinxi
Task Tracking: tasks.md and features.md
Docs Location: docs/
Development Commands

npm run dev - Start development server on port 3000 with strict port enforcement
npm run build - Build the application for production
npm run start - Start production server (kills existing processes on ports 3000/3001 first)

Core Workflow Rules
Task-Driven Development

NEVER make code changes without an explicitly defined task
Every conversation about code changes must start by identifying the task ID
If no task exists, stop and ask the user to create one first
Tasks must be documented in tasks.md before implementation begins

One Thing at a Time Rule

Only ONE task can have status "Doing" at any time
Before starting a new task, verify no other task is "Doing"
If switching tasks, move current task back to "Todo" with notes

Change Management Protocol

Start every code conversation with: "What task should I work on?" or "Which task is this for?"
Before any implementation: Confirm task ID, scope, and files to be modified
No scope creep: If user requests changes outside current task scope, suggest creating a new task
Document everything: Update task status and notes as work progresses

Task Documentation Format
Task List (tasks.md)
markdown| ID | Task | Status | Feature | Description |
|----|------|--------|---------|-------------|
| T1 | Fix canvas drag performance | Doing | F1 | Optimize draggable primitive for large datasets |
| T2 | Add export progress bar | Todo | F2 | Show download progress with better UX |
Task Statuses

Todo: Ready to work on
Doing: Currently in progress (ONLY ONE AT A TIME)
Review: Implementation done, needs user review
Done: Complete and approved

Individual Task Files (docs/tasks/T{ID}.md)
For complex tasks, create detailed documentation:
markdown# Task T1: Fix canvas drag performance

## Goal
Optimize infinite canvas dragging for large numbers of polaroids

## Requirements
- Smooth 60fps dragging with 100+ items
- Maintain position persistence
- No memory leaks

## Files to Modify
- `src/primitives/infiniteCanvas/createDraggable.ts`
- `src/components/Polaroid.tsx`
- `src/context/peach.tsx`

## Implementation Notes
- Use requestAnimationFrame for smooth updates
- Batch localStorage writes
- Consider virtualization for off-screen items

## Done When
- [ ] Dragging stays smooth with 100+ polaroids
- [ ] No performance regression
- [ ] Position persistence works
- [ ] Manual testing passes
Project Architecture
This is a SolidStart application for archiving and visualizing Peach social media data. The app uses an infinite canvas interface where photos are displayed as interactive polaroids.
Core Architecture Patterns
Context-based State Management:

PeachProvider (src/context/peach.tsx) - Handles authentication, user sessions, and token management
ExportProvider (src/context/export.tsx) - Manages data export/download operations with progress tracking
All state uses SolidJS stores with localStorage persistence via src/utils/storage.ts

Infinite Canvas System:

InfiniteCanvas (src/primitives/infiniteCanvas/) - Core zoomable/pannable canvas with viewport persistence
CanvasItem - Wrapper for draggable items with position/rotation/z-index management
createDraggable primitive handles drag interactions with automatic state persistence
Canvas state is persisted per-user in localStorage with keys like peach_${username}_canvas

Component Architecture:

Routes: index.tsx (login with stock photos), dashboard.tsx (user's photos after auth)
Polaroid System: Photos are rendered as Polaroid components with realistic styling, random rotations, and optional captions/dates
Drop Animation: DropAnimation component provides staggered reveal effects for polaroids
Data Download: Complete export system in src/lib/api/download/ with pagination, media handling, and ZIP creation

Key Technical Details
Authentication Flow:

Login via token + user data → stored in localStorage per username
Server middleware (src/middleware/authMiddleware.ts) validates requests
Cookie-based session management with 30-day expiration

Data Persistence:

Photos, canvas state, and user data stored separately per username in localStorage
Photo positions/rotations persist across sessions
Canvas viewport (pan/zoom) state persists across sessions

Media Handling:

Proxy endpoint (src/routes/api/media-proxy.ts) for serving external images
Download system supports full data export with media files in ZIP format
Stock images for login page stored in public/login_images/

File Organization

src/components/ - Reusable UI components (LoginForm, Polaroid, modals, etc.)
src/primitives/ - Low-level reusable primitives (canvas, dragging, etc.)
src/context/ - SolidJS context providers for global state
src/utils/ - Utility functions (storage, auth, error handling)
src/lib/api/ - API client code, especially download/export functionality
src/types/ - TypeScript type definitions
src/config/ - Configuration (default positions, etc.)

Library Research Protocol
Before using ANY new library/package:

Research first: Use web search to understand the library's current API
Create research doc: docs/research/T{ID}-{library}-guide.md
Include: Installation, basic usage, key APIs, working examples
Date stamp: Include research date and link to official docs
No hallucinations: Only use confirmed, documented APIs

Current Key Dependencies

@solidjs/start - SolidStart framework (SSR-aware)
@thisbeyond/solid-dnd - Drag and drop functionality
@solid-primitives/bounds - Element bounds detection
@solid-primitives/event-listener - Event handling primitives
jszip - ZIP file creation for exports
axios - HTTP client for API calls

Code Quality Rules
Constants and Values

NO magic numbers or strings - define named constants for any repeated values
Example: const MAX_POLAROIDS_PER_VIEW = 50 instead of hardcoded 50
Example: const CANVAS_ZOOM_SENSITIVITY = 0.1 instead of hardcoded values

SolidJS Specific Rules

Be mindful of SSR - use isServer checks for client-only code
Batch state updates for performance (especially canvas operations)
Use SolidJS stores for complex state, not just signals
Canvas coordinate handling - be careful with viewport transformations
Font loading is render-blocking to prevent FOUT (see app.css)

File Modifications

Always list files to be modified before starting implementation
Ask permission for any file modifications not explicitly discussed
DO NOT TOUCH UNRELATED CODE unless specifically requested

Important Project Notes

Uses Vinxi/SolidStart with SSR - be mindful of client-only code
Canvas interactions require careful coordinate system handling
All drag/drop state changes should batch updates for performance
Export progress uses structured state management with proper error handling
DO NOT OVERCOMPLICATE SHIT. GET SHIT DONE. AND GET OUT.
NO YAPPING - be direct and actionable

Commit Message Format
Use format: T{ID}: {clear description}
Examples:

T1: Optimize canvas dragging for 100+ polaroids
T5: Add export progress indicators to download modal
T12: Fix responsive polaroid layout on mobile

User Communication Style
DO:

Be direct and actionable
Ask clarifying questions about scope
Suggest breaking large requests into multiple tasks
Confirm understanding before implementing

DON'T:

Start work without task confirmation
Add "improvements" not requested
Over-engineer solutions
Make assumptions about requirements
Yap unnecessarily

Quality Gates
Before Marking Task as "Review"

 All stated requirements met
 No magic numbers/strings introduced
 Files listed in task documentation
 Code follows existing SolidJS patterns
 Canvas performance tested (if relevant)
 Manual testing completed
 No SSR/client hydration issues

Performance Considerations

Canvas operations must stay smooth with 100+ items
localStorage writes should be batched/debounced
Image loading should not block UI
Export operations must show progress
Drag operations must use RAF for smoothness

Scope Creep Prevention
Common triggers to STOP and create new tasks:

"While we're here, let's also..."
"This would be better if we..."
"Quick improvement to..."
"Can we also add..."

Response: "That sounds like a separate task. Should I create T{X}: {description} for that?"

Remember: Keep it lean, stay focused, get shit done. This app helps people preserve their Peach memories - ship fast and ship quality.
