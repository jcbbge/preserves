# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` or `npm run dev` - Start development server on port 3000 with strict port enforcement
- `pnpm build` or `npm run build` - Build the application for production
- `pnpm start` or `npm run start` - Start production server (kills existing processes on ports 3000/3001 first)

## Project Architecture

This is a **SolidStart** application for archiving and visualizing Peach social media data. The app uses an infinite canvas interface where photos are displayed as interactive polaroids.

### Core Architecture Patterns

**Context-based State Management:**
- `PeachProvider` (`src/context/peach.tsx`) - Handles authentication, user sessions, and token management
- `ExportProvider` (`src/context/export.tsx`) - Manages data export/download operations with progress tracking
- All state uses SolidJS stores with localStorage persistence via `src/utils/storage.ts`

**Infinite Canvas System:**
- `InfiniteCanvas` (`src/primitives/infiniteCanvas/`) - Core zoomable/pannable canvas with viewport persistence
- `CanvasItem` - Wrapper for draggable items with position/rotation/z-index management
- `createDraggable` primitive handles drag interactions with automatic state persistence
- Canvas state is persisted per-user in localStorage with keys like `peach_${username}_canvas`

**Component Architecture:**
- **Routes:** `index.tsx` (login with stock photos), `dashboard.tsx` (user's photos after auth)
- **Polaroid System:** Photos are rendered as `Polaroid` components with realistic styling, random rotations, and optional captions/dates
- **Drop Animation:** `DropAnimation` component provides staggered reveal effects for polaroids
- **Data Download:** Complete export system in `src/lib/api/download/` with pagination, media handling, and ZIP creation

### Key Technical Details

**Authentication Flow:**
- Login via token + user data → stored in localStorage per username
- Server middleware (`src/middleware/authMiddleware.ts`) validates requests
- Cookie-based session management with 30-day expiration

**Data Persistence:**
- Photos, canvas state, and user data stored separately per username in localStorage
- Photo positions/rotations persist across sessions
- Canvas viewport (pan/zoom) state persists across sessions

**Media Handling:**
- Proxy endpoint (`src/routes/api/media-proxy.ts`) for serving external images
- Download system supports full data export with media files in ZIP format
- Stock images for login page stored in `public/login_images/`

### File Organization

- `src/components/` - Reusable UI components (LoginForm, Polaroid, modals, etc.)
- `src/primitives/` - Low-level reusable primitives (canvas, dragging, etc.)
- `src/context/` - SolidJS context providers for global state
- `src/utils/` - Utility functions (storage, auth, error handling)
- `src/lib/api/` - API client code, especially download/export functionality
- `src/types/` - TypeScript type definitions
- `src/config/` - Configuration (default positions, etc.)

### Important Notes

- Uses Vinxi/SolidStart with SSR - be mindful of client-only code
- Font loading is render-blocking to prevent FOUT (see app.css)
- Canvas interactions require careful coordinate system handling
- All drag/drop state changes should batch updates for performance
- Export progress uses structured state management with proper error handling
- DO NOT TOUCH UNRELATED Code
- NO YAPPING
- do not overcomplicate shit. get shit done. and get out.
