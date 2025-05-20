# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Peach Preserves

Peach Preserves is a SolidJS application built with SolidStart that allows users to connect to their Peach social media accounts, view their posts, and preserve/download their data. It includes features like a photo canvas for displaying posts as polaroid images that users can interact with.

## Build Commands

- `pnpm run dev` - Start development server
- `pnpm run dev -- --open` - Start dev server and open browser
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server

## Project Architecture

### Framework & Libraries

- **SolidJS**: Core reactive framework
- **SolidStart**: Full-stack framework for SolidJS
- **Vinxi**: The underlying meta-framework
- **SolidJS Router**: For route handling
- **Solid DnD**: Drag and drop functionality for the photo canvas
- **Solid Primitives**: Utilities for bounds and event listeners

### Application Structure

1. **Authentication Flow**:
   - The app begins with a login page requesting Peach credentials
   - Login uses a server action to avoid CORS issues
   - Authentication data is stored in localStorage for persistence
   - Context provider (PeachProvider) manages auth state

2. **Dashboard View**:
   - Displays user's Peach posts as interactive polaroid images
   - Uses server actions to fetch post data from Peach API
   - Implements local storage caching for posts and UI state

3. **Export Functionality**:
   - Allows users to download/preserve their Peach data
   - Tracks export progress through different phases
   - Handles errors and recovery

4. **Interactive Canvas**:
   - Displays posts as interactive polaroid cards
   - Features drag/drop, rotation, flipping, and pinning
   - Saves position state in localStorage for persistence

### Key Components

- `PeachProvider`: Handles authentication state and user data
- `ExportProvider`: Manages the export/preservation flow
- `PhotoCanvas`: Interactive canvas for displaying polaroid cards
- `SimplePhotoCanvas`: Simplified version of the photo canvas

## Code Style Guidelines

- **Imports**: Group imports by external libraries, then internal modules using path alias `~/`
- **Types**: Use TypeScript strictly - define interfaces for props, context values, and API responses
- **Naming**:
  - SolidJS components: PascalCase (e.g., `PhotoCanvas.tsx`)
  - Functions/variables: camelCase
  - Files: PascalCase for components (.tsx), lowercase for other files
- **Component pattern**: Use SolidJS functional components with signals, createMemo, and createEffect
- **Error handling**: Use try/catch with specific error types in server actions
- **Context usage**: Create contexts with createContext, use useContext within components
- **Logging**: Use descriptive console logs with context prefixes like `[CONTEXT]`, `[SERVER]`, `[DASHBOARD]`

## Folder Structure

- `src/app.tsx`: Main application entry point
- `src/components/`: Reusable UI components
- `src/context/`: Context providers for global state
- `src/lib/`: Utility functions and API handlers
- `src/routes/`: Page components and API routes
  - `src/routes/api/`: Server actions for API calls
- `public/`: Static assets

## Key Concepts

1. **SolidJS Reactivity**: Use createSignal, createMemo, createEffect for reactive state management

2. **Server Actions**: Defined with `query` from SolidJS/router and marked with "use server" directive
   ```typescript
   const serverAction = query(async (formData: FormData) => {
     "use server";
     // Server-side code here
   }, "actionName");
   ```

3. **Context Pattern**: Follow the established pattern for creating new context providers
   ```typescript
   // Create context
   const MyContext = createContext<MyContextValue>();

   // Provider component
   export function MyProvider(props: { children: JSX.Element }) {
     // State and functions
     const value = { /* context values */ };
     return (
       <MyContext.Provider value={value}>
         {props.children}
       </MyContext.Provider>
     );
   }

   // Consumer hook
   export const useMyContext = () => {
     const context = useContext(MyContext);
     if (!context) {
       throw new Error("useMyContext must be used within a MyProvider");
     }
     return context;
   };
   ```

4. **Local Storage Pattern**: Follow pattern for persistable state
   ```typescript
   // Store with user-specific key
   const storageKey = `peach_preserves_${username}_${dataType}`;
   localStorage.setItem(storageKey, JSON.stringify(data));

   // Read with error handling
   try {
     const stored = localStorage.getItem(storageKey);
     return stored ? JSON.parse(stored) : defaultValue;
   } catch (e) {
     console.error(`[ERROR] Error loading stored ${dataType}:`, e);
     return defaultValue;
   }
   ```

   # Claude Guidelines

## Core Principles

This document contains the primary instructions and guidelines for Claude when working on this project. These instructions are always applied and should be kept concise, conflict-free, and focused on the most important patterns.

---

## How to Work With This Codebase

### Understanding Context
- Always analyze the current file structure and existing patterns before suggesting changes
- Read relevant documentation in the `/ai/patterns` directory for domain-specific guidance
- Respect established naming conventions and architectural decisions

### Code Generation
- Prioritize readability over cleverness
- Follow existing patterns in the codebase
- Include helpful comments explaining complex logic
- Generate code that aligns with our accessibility requirements

### Problem Solving
- First understand the problem completely before proposing solutions
- Consider edge cases and error states
- Suggest tests for any new functionality
- Make trade-offs explicit when proposing a solution

---

## Project Specifics

### Architecture

* This is where you define the core architecture concepts of your project

### Data Flow

* Document the primary data flows here

### Coding Patterns

* Document key coding patterns here

---

## AI Assistance Meta-Instructions

### Documentation Management
- Keep this file focused and concise
- Use links to reference detailed patterns rather than including everything here
- Support `#tag-based` references for specific sections of patterns

### Metadata
- Last Updated: 2025-05-12
- Version: 1.0
- Last Revision Reason: Initial setup

### DO NOT ADD COMMENTS TO Code

- avoid use of inline comments ex. `// [Comments here.]`
- also avoid use of block comments ex. `/* [Comments here.] */`





To get me to stop touching unrelated code:

1. Use specific language like "ONLY fix X, Y, Z issues - do not touch any other code"
2. Explicitly list what changes are in scope: "Only reorganize imports and fix the onMount duplication"
3. Give clear boundaries: "Do not add, remove, or modify any UI elements"
4. Tell me what NOT to do: "Do not add headers, buttons, or change the layout"

I should have focused solely on fixing the organizatiοn and duplicate code issues without modifying functionality or adding UI elements. Clear, specific boundaries will prevent me from making assumptions about what should be included in "fixing" the code.
