# Server Implementation Specification

## Technology Stack

### Core Framework
- **Node.js**: Runtime environment
- **Express**: Web framework for API endpoints
- **Socket.IO**: WebSocket implementation for real-time updates
- **TypeScript**: Type-safe development

### Storage
- **File System**: Local storage for development
- **AWS S3** (alternative): Production storage option

### Utilities
- **Axios**: HTTP client for Peach API communication
- **Bull**: Job queue for background processing
- **Redis**: Storage for job state and queue
- **Archiver**: ZIP file creation
- **Sharp**: Image processing (optional)

## Project Structure

```
server/
├── src/
│   ├── api/               # API routes
│   │   ├── exports.ts     # Export endpoints
│   │   └── auth.ts        # Authentication endpoints
│   ├── services/          # Business logic
│   │   ├── peach-api.ts   # Peach API client
│   │   ├── export-manager.ts  # Export job management
│   │   ├── content-processor.ts  # Content processing
│   │   └── storage.ts     # Storage operations
│   ├── models/            # Data models
│   │   ├── export-job.ts  # Export job model
│   │   └── user.ts        # User model
│   ├── queue/             # Job queue
│   │   ├── queue.ts       # Queue configuration
│   │   └── processors.ts  # Job processors
│   ├── websocket/         # WebSocket handling
│   │   ├── server.ts      # WebSocket server
│   │   └── events.ts      # Event handlers
│   ├── utils/             # Utilities
│   │   ├── error-handler.ts  # Error handling
│   │   ├── logger.ts      # Logging
│   │   └── auth.ts        # Authentication helpers
│   └── index.ts           # Application entry point
├── config/                # Configuration
│   ├── default.ts         # Default configuration
│   └── production.ts      # Production overrides
└── tests/                 # Tests
    ├── unit/              # Unit tests
    └── integration/       # Integration tests
```

## Core Modules

### Export Service

The Export Service manages the entire export process, coordinating between different components:

```typescript
// src/services/export-manager.ts

export interface ExportOptions {
  includeMedia?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export interface ExportJobState {
  id: string;
  userId: string;
  status: 'created' | 'discovering' | 'exporting' | 'packaging' | 'complete' | 'paused' | 'error' | 'cancelled' | 'expired';
  progress: {
    phase: 'discovery' | 'content' | 'media' | 'packaging';
    percentage: number;
    completedItems: number;
    totalItems: number;
    currentItem: string;
    estimatedTimeRemaining: number;
  };
  checkpoint?: {
    phase: 'discovery' | 'content' | 'media' | 'packaging';
    position: number;
    timestamp: Date;
  };
  stats?: {
    postsProcessed: number;
    mediaProcessed: number;
    totalSize: number;
    processingTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ExportManager {
  async createExport(userId: string, token: string, options?: ExportOptions): Promise<string> {
    // Create new export job
    // Initialize job state
    // Add to job queue
    // Return job ID
  }

  async getExportStatus(jobId: string): Promise<ExportJobState> {
    // Retrieve job state
    // Return current status
  }

  async pauseExport(jobId: string): Promise<ExportJobState> {
    // Pause job processing
    // Create checkpoint
    // Update job state
    // Return updated status
  }

  async resumeExport(jobId: string): Promise<ExportJobState> {
    // Resume job from checkpoint
    // Update job state
    // Return updated status
  }

  async cancelExport(jobId: string): Promise<ExportJobState> {
    // Cancel job processing
    // Clean up resources
    // Update job state
    // Return updated status
  }

  async retryExport(jobId: string): Promise<ExportJobState> {
    // Retry job from last checkpoint
    // Update job state
    // Return updated status
  }
}
```

### Peach API Client

The Peach API Client handles all communication with the Peach API:

```typescript
// src/services/peach-api.ts

export interface PeachCredentials {
  token: string;
}

export interface StreamData {
  id: string;
  posts: PostData[];
  cursor?: string;
}

export interface PostData {
  id: string;
  createdTime: number;
  message?: string;
  media?: MediaData[];
  likeCount?: number;
  commentCount?: number;
  cursor?: string;
}

export interface MediaData {
  type: 'image' | 'gif' | 'video';
  url: string;
  width?: number;
  height?: number;
}

export class PeachApiClient {
  constructor(private credentials: PeachCredentials) {}

  async getUserInfo(): Promise<any> {
    // Get user profile information
    // Return user data
  }

  async getStreams(): Promise<StreamData[]> {
    // Get user streams
    // Return stream data
  }

  async getStreamPosts(streamId: string, cursor?: string): Promise<PostData[]> {
    // Get posts for a specific stream
    // Support pagination via cursor
    // Return post data
  }

  async getPostComments(postId: string): Promise<any[]> {
    // Get comments for a specific post
    // Return comment data
  }

  async downloadMedia(url: string): Promise<Buffer> {
    // Download media file
    // Return file buffer
  }
}
```

### Content Processor

The Content Processor handles the organization and packaging of exported content:

```typescript
// src/services/content-processor.ts

export interface ProcessOptions {
  includeMedia: boolean;
  outputFormat: 'html' | 'json' | 'both';
}

export class ContentProcessor {
  constructor(private jobId: string, private storage: StorageService) {}

  async processStream(stream: StreamData): Promise<void> {
    // Process all posts in a stream
    // Extract and process media
    // Generate HTML and JSON representations
    // Store processed content
  }

  async processPost(post: PostData): Promise<void> {
    // Process a single post
    // Extract and process media
    // Generate HTML and JSON representations
    // Store processed content
  }

  async processMedia(media: MediaData): Promise<string> {
    // Download media file
    // Process/optimize if needed
    // Store media file
    // Return local path
  }

  async createArchive(): Promise<string> {
    // Create zip archive of processed content
    // Generate index.html for browsing
    // Include raw JSON data
    // Return archive path
  }
}
```

### Storage Service

The Storage Service manages temporary storage for export jobs:

```typescript
// src/services/storage.ts

export class StorageService {
  constructor(private basePath: string) {}

  async createJobStorage(jobId: string): Promise<void> {
    // Create directory structure for job
    // Initialize metadata
  }

  async saveJobState(jobId: string, state: ExportJobState): Promise<void> {
    // Save job state to metadata directory
  }

  async getJobState(jobId: string): Promise<ExportJobState> {
    // Retrieve job state from metadata directory
  }

  async storeContent(jobId: string, path: string, content: string | Buffer): Promise<string> {
    // Store content file in job directory
    // Return full path
  }

  async storeMedia(jobId: string, filename: string, content: Buffer): Promise<string> {
    // Store media file in media directory
    // Return full path
  }

  async createDownloadUrl(jobId: string, archivePath: string): Promise<string> {
    // Generate download URL for archive
    // Set expiration
    // Return URL
  }

  async cleanupJob(jobId: string): Promise<void> {
    // Remove job directory and all contents
  }
}
```

### WebSocket Server

The WebSocket Server provides real-time updates to clients:

```typescript
// src/websocket/server.ts

export class WebSocketServer {
  constructor(server: http.Server) {
    // Initialize Socket.IO server
    // Configure authentication
    // Set up event handlers
  }

  authenticateConnection(socket: Socket, next: (err?: Error) => void): void {
    // Validate authentication token
    // Verify job access permissions
    // Allow or reject connection
  }

  handleConnection(socket: Socket): void {
    // Associate socket with job ID
    // Set up event listeners
  }

  sendProgressUpdate(jobId: string, progress: any): void {
    // Send progress update to clients connected to job
  }

  sendStatusUpdate(jobId: string, status: string): void {
    // Send status update to clients connected to job
  }

  sendErrorNotification(jobId: string, error: any): void {
    // Send error notification to clients connected to job
  }
}
```

### Job Queue

The Job Queue manages background processing of export jobs:

```typescript
// src/queue/queue.ts

export class ExportQueue {
  constructor() {
    // Initialize Bull queue
    // Configure Redis connection
    // Set up processors
  }

  async addJob(jobId: string, userId: string, token: string, options: ExportOptions): Promise<void> {
    // Add job to queue
    // Set job options (priority, attempts, etc.)
  }

  async pauseJob(jobId: string): Promise<void> {
    // Pause job processing
  }

  async resumeJob(jobId: string): Promise<void> {
    // Resume paused job
  }

  async removeJob(jobId: string): Promise<void> {
    // Remove job from queue
  }
}

// src/queue/processors.ts

export class ExportProcessor {
  async process(job: Bull.Job): Promise<void> {
    // Extract job data
    // Initialize services
    // Process in phases:
    //   1. Discovery
    //   2. Content export
    //   3. Media download
    //   4. Packaging
    // Handle checkpointing
    // Update job progress
    // Handle completion
  }

  async processDiscovery(jobId: string, peachApi: PeachApiClient): Promise<void> {
    // Get user streams
    // Enumerate all posts
    // Build content index
    // Update job state
  }

  async processContent(jobId: string, peachApi: PeachApiClient, processor: ContentProcessor): Promise<void> {
    // Process posts in batches
    // Extract and save content
    // Update job state
  }

  async processMedia(jobId: string, processor: ContentProcessor): Promise<void> {
    // Download and process media
    // Update job state
  }

  async createPackage(jobId: string, processor: ContentProcessor): Promise<void> {
    // Create archive
    // Generate download URL
    // Update job state
  }
}
```

## API Routes

### Export Management API

```typescript
// src/api/exports.ts

export function registerExportRoutes(app: Express, exportManager: ExportManager) {
  // Create new export job
  app.post('/api/exports', authenticateUser, async (req, res) => {
    const { token } = req.user;
    const options = req.body;
    
    try {
      const jobId = await exportManager.createExport(req.user.id, token, options);
      const status = await exportManager.getExportStatus(jobId);
      
      res.status(201).json({
        jobId,
        wsEndpoint: `/api/exports/${jobId}/progress`,
        estimatedSize: status.stats?.totalSize || 0,
        estimatedTime: status.progress.estimatedTimeRemaining
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Get export job status
  app.get('/api/exports/:jobId', authenticateUser, async (req, res) => {
    try {
      const status = await exportManager.getExportStatus(req.params.jobId);
      res.json(status);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Pause export job
  app.post('/api/exports/:jobId/pause', authenticateUser, async (req, res) => {
    try {
      const status = await exportManager.pauseExport(req.params.jobId);
      res.json(status);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Resume export job
  app.post('/api/exports/:jobId/resume', authenticateUser, async (req, res) => {
    try {
      const status = await exportManager.resumeExport(req.params.jobId);
      res.json(status);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Cancel export job
  app.post('/api/exports/:jobId/cancel', authenticateUser, async (req, res) => {
    try {
      const status = await exportManager.cancelExport(req.params.jobId);
      res.json(status);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Retry export job
  app.post('/api/exports/:jobId/retry', authenticateUser, async (req, res) => {
    try {
      const status = await exportManager.retryExport(req.params.jobId);
      res.json(status);
    } catch (error) {
      handleApiError(res, error);
    }
  });
}
```

## Error Handling

```typescript
// src/utils/error-handler.ts

export class ApiError extends Error {
  constructor(public statusCode: number, public message: string, public details?: any) {
    super(message);
  }
}

export function handleApiError(res: Response, error: any): void {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details
      }
    });
    return;
  }
  
  // Handle other error types
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  });
}
```

## Authentication

```typescript
// src/utils/auth.ts

export interface AuthenticatedUser {
  id: string;
  token: string;
}

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Authentication required' } });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Verify and decode JWT token
    const decoded = verifyToken(token);
    
    req.user = {
      id: decoded.userID,
      token
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

function verifyToken(token: string): any {
  // Implementation depends on token format
  // For JWT:
  // return jwt.verify(token, process.env.JWT_SECRET);
  
  // For Peach-specific token:
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const payload = Buffer.from(parts[1], 'base64').toString();
  return JSON.parse(payload);
}
```

## Deployment Considerations

### Environment Configuration

```typescript
// config/default.ts

export default {
  server: {
    port: 3001,
    host: 'localhost'
  },
  storage: {
    type: 'local',
    basePath: './storage/exports',
    expiration: 24 * 60 * 60 * 1000  // 24 hours
  },
  queue: {
    redis: {
      host: 'localhost',
      port: 6379
    },
    concurrency: 5
  },
  peachApi: {
    baseUrl: 'https://v1.peachapi.com',
    timeout: 30000,
    retries: 3
  }
};
```

### Scaling Considerations

1. **Job Processing**:
   - Use Redis for distributed job queue
   - Scale horizontally with multiple worker processes
   - Implement job prioritization for fairness

2. **Media Processing**:
   - Consider dedicated workers for media downloads
   - Implement download throttling to respect Peach API limits
   - Use streaming for large media files

3. **Storage**:
   - For production, use S3 or similar object storage
   - Implement storage quotas per user
   - Set up automatic cleanup of expired exports

4. **Monitoring**:
   - Track job processing times
   - Monitor queue length and processing rates
   - Set up alerts for job failures or stuck queues

## Implementation Plan

### Phase 1: Core Infrastructure

1. Set up basic Express server
2. Implement authentication utilities
3. Create storage service
4. Implement API routes without processing logic
5. Set up WebSocket server for real-time updates

### Phase 2: Peach API Integration

1. Implement Peach API client
2. Create content discovery process
3. Build content processing pipeline
4. Implement media downloading and processing

### Phase 3: Job Processing

1. Set up Bull queue with Redis
2. Implement job processors
3. Add checkpointing and recovery
4. Create archive generation functionality

### Phase 4: Progress and Controls

1. Implement real-time progress tracking
2. Add pause/resume functionality
3. Create retry mechanisms for errors
4. Implement download URL generation

### Phase 5: Optimizations

1. Add rate limiting and throttling
2. Implement caching for API responses
3. Optimize media processing
4. Add performance monitoring