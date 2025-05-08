# Component Architecture for Peach Preserves

## Component Hierarchy

```
App
├── Router
│   ├── Layout (wrapper for all pages with common elements)
│   ├── LoginPage (src/routes/index.tsx)
│   │   ├── LoginForm
│   │   └── ErrorDisplay
│   └── DashboardPage (src/routes/dashboard.tsx)
│       ├── Header
│       │   ├── UserInfo
│       │   └── LogoutButton
│       ├── ContentPreview
│       │   ├── PostCard (most recent post)
│       │   └── MediaDisplay (handles different media types)
│       ├── ExportSection
│       │   ├── ExportButton
│       │   └── ExportInfo
│       └── ExportProgress
│           ├── ProgressBar
│           ├── ProgressDetails
│           ├── PauseResumeButton
│           └── ExportComplete
```

## Core Components

### LoginPage
**Purpose**: User authentication to Peach API  
**State**: 
- Form input values
- Loading state
- Error messages

**Props**: None (top-level route)  
**Behaviors**:
- Form validation
- API authentication
- Error handling
- Redirect after successful login

### DashboardPage
**Purpose**: Central interface after authentication  
**State**: 
- Authentication status
- User data
- Export process state

**Props**: None (top-level route)  
**Behaviors**:
- Check authentication status
- Display user content
- Manage export process

### ContentPreview
**Purpose**: Display recent post to confirm connection  
**State**: Loading state for post data  
**Props**: 
- `post`: Most recent post data
- `isLoading`: Loading state

**Behaviors**:
- Format post content
- Display appropriate media
- Handle different post types
- Show loading states

### ExportSection
**Purpose**: Provide export functionality and information  
**State**: None (receives from parent)  
**Props**: 
- `onExportClick`: Function to start export
- `isExportAvailable`: Boolean indicating if export is available

**Behaviors**:
- Trigger export process
- Display export information
- Show appropriate state (enabled/disabled)

### ExportProgress
**Purpose**: Show export progress and provide controls  
**State**: None (receives from parent)  
**Props**: 
- `progress`: Current progress percentage
- `status`: Current status message
- `isPaused`: Boolean for paused state
- `onPauseResume`: Function to toggle pause/resume
- `onCancel`: Function to cancel export
- `isComplete`: Boolean for completion state
- `downloadUrl`: URL to download completed export

**Behaviors**:
- Display progress visually
- Show current activity details
- Handle pause/resume actions
- Provide download button when complete
- Show appropriate UI based on status

## State Management

### Context Providers

#### PeachContext (existing)
**Purpose**: Manage authentication and user data  
**State**:
- `token`: Authentication token
- `user`: User profile and stream data
- `isAuthenticated`: Authentication status

**Methods**:
- `login`: Handle authentication and store user data
- `logout`: Clear authentication state

#### ExportContext (new)
**Purpose**: Manage export process state  
**State**:
- `exportStatus`: Current status ('idle', 'preparing', 'exporting', 'paused', 'complete', 'error')
- `progress`: Object containing progress information
  - `percentage`: Overall percentage complete
  - `currentActivity`: Description of current activity
  - `estimatedTimeRemaining`: Time estimate in seconds
- `exportData`: Information about the export
  - `startTime`: When export was started
  - `postCount`: Number of posts being exported
  - `mediaCount`: Number of media items being exported
  - `downloadUrl`: URL to download completed export

**Methods**:
- `startExport`: Initiate export process
- `pauseExport`: Pause export process
- `resumeExport`: Resume paused export
- `cancelExport`: Cancel export process
- `resetExport`: Reset export state

## Data Flow

### Authentication Flow
1. User enters credentials in `LoginForm`
2. `LoginPage` submits credentials to Peach API
3. On success, `PeachContext.login` is called with token and user data
4. Router redirects to `DashboardPage`

### Export Flow
1. User clicks export button in `ExportSection`
2. `ExportContext.startExport` is called
3. Export service initiates export job on server
4. WebSocket connection established for real-time progress updates
5. `ExportProgress` updates UI based on progress events
6. On completion, download URL is provided to user

### Pause/Resume Flow
1. User clicks pause button in `ExportProgress`
2. `ExportContext.pauseExport` is called
3. Server pauses export job and maintains state
4. UI updates to show paused state
5. User clicks resume button
6. `ExportContext.resumeExport` is called
7. Server resumes export from last checkpoint
8. Progress updates continue

## Component Relationships

### Parent-Child Relationships
- `App` provides global layout and context providers
- `Router` handles navigation between pages
- `DashboardPage` orchestrates dashboard components and manages data flow
- `ExportSection` and `ContentPreview` are independent siblings within Dashboard
- `ExportProgress` is conditionally rendered based on export state

### Event Handling
- User events (clicks, form submissions) are handled by the component where they occur
- Data mutations happen through context providers
- API calls are abstracted in dedicated service modules
- Progress updates flow from server to client via WebSocket

## Reusable Components

### PostCard
**Purpose**: Display a single Peach post  
**Props**:
- `post`: Post data object
- `isCompact`: Boolean to control display density

### MediaDisplay
**Purpose**: Handle different media types (images, GIFs, etc.)  
**Props**:
- `media`: Media object(s)
- `alt`: Accessibility text

### ProgressBar
**Purpose**: Visual progress indicator  
**Props**:
- `percentage`: Number from 0-100
- `animated`: Boolean to enable/disable animation
- `color`: Optional theme color

### ErrorDisplay
**Purpose**: Show user-friendly error messages  
**Props**:
- `error`: Error object or message
- `retry`: Optional retry function

## Accessibility Considerations

### Keyboard Navigation
- All interactive elements must be keyboard focusable
- Logical tab order follows visual flow
- Keyboard shortcuts for common actions

### Screen Reader Support
- Semantic HTML elements with appropriate roles
- ARIA attributes for dynamic content
- Status updates announced via aria-live regions
- Progress indicators have text alternatives

### Focus Management
- Focus trapped in modals when active
- Focus returned to trigger element after modal close
- Focus moved to appropriate element on significant view changes

## Implementation Approach

1. Start with base component structure
2. Implement context providers for state management
3. Build static versions of all components
4. Add interactive behaviors and state handling
5. Implement API integration
6. Add real-time progress tracking
7. Implement accessibility features
8. Add animations and refinements