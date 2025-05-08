# Export Process Data Flow

## Overview

This document outlines the data flow between client and server during the export process, focusing on state management, progress tracking, and reliability mechanisms.

## System Components

### Client-Side Components
- **Dashboard UI**: User interface for initiating and monitoring exports
- **ExportContext**: State management for export process
- **WebSocket Client**: Real-time communication with server
- **Export Service**: Client-side API wrapper for export operations

### Server-Side Components
- **API Server**: Handles HTTP requests for export operations
- **WebSocket Server**: Provides real-time progress updates
- **Export Manager**: Coordinates export jobs and tracks state
- **Peach API Client**: Interacts with Peach API to fetch content
- **Content Processor**: Processes and packages exported content
- **Storage Service**: Manages temporary storage of exports

## Data Flow Sequence

### 1. Export Initiation

```
Client                                      Server
  |                                           |
  |--- 1. POST /api/exports (auth token) ---->|
  |                                           |--- 2. Validate token
  |                                           |--- 3. Create export job
  |                                           |--- 4. Initialize state
  |<-- 5. Return jobId, connection details ---|
  |                                           |
  |--- 6. Connect WebSocket (jobId) --------->|
  |<-- 7. Connection confirmed --------------|
  |                                           |--- 8. Begin discovery phase
```

#### Data Structures:

**Export Initiation Request:**
```typescript
{
  token: string;         // Authentication token
  options?: {            // Optional export configuration
    includeMedia: boolean;
    fromDate?: string;   // ISO date format
    toDate?: string;     // ISO date format
  }
}
```

**Export Initiation Response:**
```typescript
{
  jobId: string;         // Unique identifier for the export job
  wsEndpoint: string;    // WebSocket endpoint for progress updates
  estimatedSize: number; // Rough estimate of export size in bytes
  estimatedTime: number; // Rough estimate of time in seconds
}
```

### 2. Progress Tracking

```
Client                                      Server
  |                                           |
  |                                           |--- 1. Process content in chunks
  |                                           |       |
  |<-- 2. WS: Progress update -----------------|       |
  |                                           |       |
  |<-- 3. WS: Progress update -----------------|       |
  |                                           |       |
  |<-- 4. WS: Progress update -----------------|       |
  |                                           |       |
  |<-- 5. WS: Stage complete ------------------|       |
  |                                           |       v
  |                                           |--- 6. Begin packaging phase
  |                                           |       |
  |<-- 7. WS: Progress update -----------------|       |
  |                                           |       |
  |<-- 8. WS: Progress update -----------------|       |
  |                                           |       |
  |<-- 9. WS: Export complete -----------------|       v
```

#### Data Structures:

**Progress Update Message:**
```typescript
{
  type: 'progress';
  jobId: string;
  phase: 'discovery' | 'content' | 'media' | 'packaging';
  progress: {
    percentage: number;           // Overall percentage complete (0-100)
    currentItem: string;          // Description of current item
    completedItems: number;       // Number of items completed
    totalItems: number;           // Total number of items
    estimatedTimeRemaining: number; // Seconds remaining
  }
}
```

**Phase Complete Message:**
```typescript
{
  type: 'phaseComplete';
  jobId: string;
  phase: 'discovery' | 'content' | 'media' | 'packaging';
  stats: {
    postsProcessed: number;
    mediaProcessed: number;
    duration: number;             // Time spent in this phase
  }
}
```

**Export Complete Message:**
```typescript
{
  type: 'complete';
  jobId: string;
  downloadUrl: string;            // URL to download the export
  expiration: string;             // ISO date when URL expires
  stats: {
    totalPosts: number;
    totalMedia: number;
    totalSize: number;            // Size in bytes
    processingTime: number;       // Total time in seconds
  }
}
```

### 3. Pause/Resume Flow

```
Client                                      Server
  |                                           |
  |--- 1. POST /api/exports/{jobId}/pause --->|
  |                                           |--- 2. Pause processing
  |                                           |--- 3. Save checkpoint
  |<-- 4. Return pause confirmation ----------|
  |                                           |
  |<-- 5. WS: Paused status ------------------|
  |                                           | ... (time passes) ...
  |                                           |
  |--- 6. POST /api/exports/{jobId}/resume -->|
  |                                           |--- 7. Load checkpoint
  |                                           |--- 8. Resume processing
  |<-- 9. Return resume confirmation ---------|
  |                                           |
  |<-- 10. WS: Resumed status ----------------|
  |                                           |
  |<-- 11. WS: Progress update (continues) ---|
```

#### Data Structures:

**Pause Confirmation:**
```typescript
{
  jobId: string;
  status: 'paused';
  checkpoint: {
    phase: 'discovery' | 'content' | 'media' | 'packaging';
    position: number;        // Last processed item index
    timestamp: string;       // ISO date format
  }
}
```

**Paused Status Message:**
```typescript
{
  type: 'status';
  jobId: string;
  status: 'paused';
  checkpoint: {
    phase: 'discovery' | 'content' | 'media' | 'packaging';
    position: number;
    progress: number;         // Percentage complete at pause point
    timestamp: string;
  }
}
```

**Resume Confirmation:**
```typescript
{
  jobId: string;
  status: 'resuming';
  estimatedTimeRemaining: number;
}
```

### 4. Error Handling

```
Client                                      Server
  |                                           |
  |                                           |--- 1. Encounter error
  |<-- 2. WS: Error notification --------------|
  |                                           |
  |--- 3. POST /api/exports/{jobId}/retry --->|
  |                                           |--- 4. Retry from last checkpoint
  |<-- 5. Return retry confirmation ----------|
  |                                           |
  |<-- 6. WS: Resumed status ----------------|
  |                                           |
  |<-- 7. WS: Progress update (continues) ---|
```

#### Data Structures:

**Error Notification:**
```typescript
{
  type: 'error';
  jobId: string;
  error: {
    code: string;            // Error code (e.g., 'network_error', 'api_limit')
    message: string;         // User-friendly error message
    retryable: boolean;      // Whether the operation can be retried
    details?: any;           // Additional error details (if applicable)
  }
}
```

**Retry Confirmation:**
```typescript
{
  jobId: string;
  status: 'retrying';
  attempts: number;          // Number of retry attempts so far
}
```

## State Transitions

The export job can transition through the following states:

1. **Created**: Job has been created but processing hasn't started
2. **Discovering**: Enumerating content to be exported
3. **Exporting**: Downloading and processing content
4. **Packaging**: Creating the final export package
5. **Complete**: Export is finished and available for download
6. **Paused**: Processing has been paused by the user
7. **Error**: An error has occurred during processing
8. **Cancelled**: User has cancelled the export
9. **Expired**: Export has been completed but the download has expired

### State Transition Rules:

- **Created** → **Discovering** (Automatically after creation)
- **Discovering** → **Exporting** (After content enumeration complete)
- **Exporting** → **Packaging** (After all content processed)
- **Packaging** → **Complete** (After package creation finished)
- **Discovering/Exporting/Packaging** → **Paused** (User request)
- **Paused** → **Discovering/Exporting/Packaging** (Resume from checkpoint)
- **Discovering/Exporting/Packaging** → **Error** (On error)
- **Error** → **Discovering/Exporting/Packaging** (Retry from checkpoint)
- **Any State** → **Cancelled** (User request)
- **Complete** → **Expired** (After expiration period)

## API Endpoints

### Export Management

- `POST /api/exports` - Create a new export job
- `GET /api/exports/{jobId}` - Get export job status
- `POST /api/exports/{jobId}/pause` - Pause an export job
- `POST /api/exports/{jobId}/resume` - Resume a paused export job
- `POST /api/exports/{jobId}/cancel` - Cancel an export job
- `POST /api/exports/{jobId}/retry` - Retry a failed export job

### WebSocket

- `ws://[host]/api/exports/{jobId}/progress` - WebSocket endpoint for progress updates

## Storage Considerations

### Temporary Storage

- Export jobs require temporary storage for content processing
- Each job has a dedicated storage space identified by jobId
- Storage is structured hierarchically:
  - `/exports/{jobId}/metadata/` - Job metadata and state
  - `/exports/{jobId}/content/` - Processed content
  - `/exports/{jobId}/media/` - Downloaded media
  - `/exports/{jobId}/output/` - Final packaged export

### Storage Lifecycle

1. Storage is allocated when job is created
2. Content is added as processing progresses
3. After export completes, content is packaged
4. Package is made available for download
5. Package is retained for a limited time (e.g., 24 hours)
6. Storage is cleaned up after expiration

## Resilience Mechanisms

### Checkpointing

- Export jobs create checkpoints at regular intervals
- Checkpoints include:
  - Current phase (discovery, content, media, packaging)
  - Last processed item (post ID, media URL, etc.)
  - Progress statistics
  - Timestamp

### Recovery Strategies

- **Network Interruptions**: Retry with exponential backoff
- **API Rate Limiting**: Implement delay and resume
- **Partial Media Downloads**: Resume from byte position
- **Server Restarts**: Recover from persistent checkpoint data

## Security Considerations

### Authentication

- All API endpoints require valid authentication
- Export jobs are tied to the authenticated user
- WebSocket connections require authentication token

### Data Protection

- Temporary storage is isolated per job
- Download URLs are signed and time-limited
- No cross-user access to export data is permitted

## Client Implementation Guidelines

### WebSocket Integration

- Connect to WebSocket after job creation
- Implement reconnection logic with backoff
- Handle different message types appropriately
- Update UI based on progress events

### Error Handling

- Display user-friendly error messages
- Provide retry options for recoverable errors
- Show detailed progress to help diagnose issues

### UI States

- Match UI state to job state
- Provide clear indications of current activity
- Update progress indicators smoothly
- Enable/disable controls based on current state