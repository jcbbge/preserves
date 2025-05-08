# Client Implementation Specification

## Technology Stack

- **SolidJS**: Core framework
- **SolidJS Router**: Client-side routing
- **TypeScript**: Type safety
- **CSS Modules**: Component styling
- **Socket.IO Client**: WebSocket communication

## Component Implementation

### ExportContext Provider

The ExportContext will manage the state of the export process across the application:

```typescript
// src/context/export.tsx
import { createContext, createSignal, createEffect, JSX, useContext } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { io, Socket } from "socket.io-client";

export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'paused' | 'complete' | 'error';

export interface ExportProgress {
  percentage: number;
  currentActivity: string;
  phase: 'discovery' | 'content' | 'media' | 'packaging';
  estimatedTimeRemaining: number;
  completedItems: number;
  totalItems: number;
}

export interface ExportStats {
  postsProcessed: number;
  mediaProcessed: number;
  totalSize: number;
  processingTime: number;
}

export interface ExportError {
  code: string;
  message: string;
  retryable: boolean;
  details?: any;
}

export interface ExportData {
  jobId: string | null;
  status: ExportStatus;
  progress: ExportProgress;
  stats: ExportStats | null;
  downloadUrl: string | null;
  error: ExportError | null;
  startTime: Date | null;
  completedTime: Date | null;
}

export interface ExportOptions {
  includeMedia?: boolean;
  fromDate?: string;
  toDate?: string;
}

interface ExportContextValue {
  exportData: Store<ExportData>;
  startExport: (options?: ExportOptions) => Promise<void>;
  pauseExport: () => Promise<void>;
  resumeExport: () => Promise<void>;
  cancelExport: () => Promise<void>;
  retryExport: () => Promise<void>;
  resetExport: () => void;
}

const defaultProgress: ExportProgress = {
  percentage: 0,
  currentActivity: '',
  phase: 'discovery',
  estimatedTimeRemaining: 0,
  completedItems: 0,
  totalItems: 0
};

const defaultExportData: ExportData = {
  jobId: null,
  status: 'idle',
  progress: defaultProgress,
  stats: null,
  downloadUrl: null,
  error: null,
  startTime: null,
  completedTime: null
};

export const ExportContext = createContext<ExportContextValue>();

export function ExportProvider(props: { children: JSX.Element }) {
  const [exportData, setExportData] = createStore<ExportData>(defaultExportData);
  const [socket, setSocket] = createSignal<Socket | null>(null);

  // Socket.IO connection management
  const connectSocket = (jobId: string) => {
    // Close any existing connection
    if (socket()) {
      socket()!.disconnect();
    }

    // Get the authentication token (from PeachContext or elsewhere)
    const token = localStorage.getItem('peach_token');

    // Create new connection
    const newSocket = io(`/api/exports/${jobId}/progress`, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('[EXPORT] WebSocket connected for job:', jobId);
    });

    newSocket.on('disconnect', () => {
      console.log('[EXPORT] WebSocket disconnected');
    });

    newSocket.on('progress', (data: any) => {
      setExportData('progress', data.progress);
      setExportData('status', 'exporting');
    });

    newSocket.on('status', (data: any) => {
      setExportData('status', data.status);
      
      if (data.status === 'paused') {
        setExportData('progress', data.checkpoint.progress);
      }
    });

    newSocket.on('phaseComplete', (data: any) => {
      setExportData('stats', (prev) => ({
        ...prev,
        ...data.stats
      }));
    });

    newSocket.on('complete', (data: any) => {
      setExportData('status', 'complete');
      setExportData('downloadUrl', data.downloadUrl);
      setExportData('stats', data.stats);
      setExportData('completedTime', new Date());
      setExportData('progress', { ...exportData.progress, percentage: 100 });
    });

    newSocket.on('error', (data: any) => {
      setExportData('status', 'error');
      setExportData('error', data.error);
    });

    setSocket(newSocket);
  };

  // API calls
  const startExport = async (options?: ExportOptions) => {
    try {
      const token = localStorage.getItem('peach_token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(options || {})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start export');
      }

      const data = await response.json();
      
      setExportData({
        jobId: data.jobId,
        status: 'preparing',
        progress: {
          ...defaultProgress,
          estimatedTimeRemaining: data.estimatedTime
        },
        stats: null,
        downloadUrl: null,
        error: null,
        startTime: new Date(),
        completedTime: null
      });

      // Connect to WebSocket for real-time updates
      connectSocket(data.jobId);

    } catch (error) {
      console.error('[EXPORT] Start error:', error);
      setExportData('status', 'error');
      setExportData('error', {
        code: 'start_failed',
        message: error instanceof Error ? error.message : 'Failed to start export',
        retryable: true
      });
    }
  };

  const pauseExport = async () => {
    if (!exportData.jobId) return;

    try {
      const token = localStorage.getItem('peach_token');
      
      const response = await fetch(`/api/exports/${exportData.jobId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to pause export');
      }

      // Status will be updated via WebSocket

    } catch (error) {
      console.error('[EXPORT] Pause error:', error);
      setExportData('error', {
        code: 'pause_failed',
        message: error instanceof Error ? error.message : 'Failed to pause export',
        retryable: true
      });
    }
  };

  const resumeExport = async () => {
    if (!exportData.jobId) return;

    try {
      const token = localStorage.getItem('peach_token');
      
      const response = await fetch(`/api/exports/${exportData.jobId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resume export');
      }

      // Status will be updated via WebSocket

    } catch (error) {
      console.error('[EXPORT] Resume error:', error);
      setExportData('error', {
        code: 'resume_failed',
        message: error instanceof Error ? error.message : 'Failed to resume export',
        retryable: true
      });
    }
  };

  const cancelExport = async () => {
    if (!exportData.jobId) return;

    try {
      const token = localStorage.getItem('peach_token');
      
      const response = await fetch(`/api/exports/${exportData.jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel export');
      }

      resetExport();

    } catch (error) {
      console.error('[EXPORT] Cancel error:', error);
      setExportData('error', {
        code: 'cancel_failed',
        message: error instanceof Error ? error.message : 'Failed to cancel export',
        retryable: false
      });
    }
  };

  const retryExport = async () => {
    if (!exportData.jobId) return;

    try {
      const token = localStorage.getItem('peach_token');
      
      const response = await fetch(`/api/exports/${exportData.jobId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to retry export');
      }

      setExportData('status', 'preparing');
      setExportData('error', null);

      // Further status will be updated via WebSocket

    } catch (error) {
      console.error('[EXPORT] Retry error:', error);
      setExportData('error', {
        code: 'retry_failed',
        message: error instanceof Error ? error.message : 'Failed to retry export',
        retryable: true
      });
    }
  };

  const resetExport = () => {
    // Disconnect WebSocket if connected
    if (socket()) {
      socket()!.disconnect();
      setSocket(null);
    }

    // Reset to default state
    setExportData(defaultExportData);
  };

  // Clean up on component unmount
  onCleanup(() => {
    if (socket()) {
      socket()!.disconnect();
    }
  });

  const value: ExportContextValue = {
    exportData,
    startExport,
    pauseExport,
    resumeExport,
    cancelExport,
    retryExport,
    resetExport
  };

  return (
    <ExportContext.Provider value={value}>
      {props.children}
    </ExportContext.Provider>
  );
}

export const useExport = () => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error("useExport must be used within an ExportProvider");
  }
  return context;
};
```

### Dashboard Component

The Dashboard component will be the main screen after authentication:

```typescript
// src/routes/dashboard.tsx
import { Show, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import Header from "~/components/Header";
import ContentPreview from "~/components/ContentPreview";
import ExportSection from "~/components/ExportSection";
import ExportProgress from "~/components/ExportProgress";
import styles from "./dashboard.module.css";

export default function Dashboard() {
  const { isAuthenticated, user } = usePeach();
  const { exportData } = useExport();
  const navigate = useNavigate();

  // Check authentication
  createEffect(() => {
    if (!isAuthenticated()) {
      navigate('/', { replace: true });
    }
  });

  // If not authenticated, return early
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div class={styles.dashboard}>
      <Header />
      
      <main class={styles.content}>
        <section class={styles.previewSection}>
          <h2>Your Peach Content</h2>
          <ContentPreview posts={user.data?.streams[0]?.posts} />
        </section>
        
        <Show
          when={exportData.status === 'idle'}
          fallback={
            <ExportProgress
              status={exportData.status}
              progress={exportData.progress}
              error={exportData.error}
              downloadUrl={exportData.downloadUrl}
            />
          }
        >
          <ExportSection />
        </Show>
      </main>
    </div>
  );
}
```

### ContentPreview Component

Displays the user's most recent post as confirmation of successful connection:

```typescript
// src/components/ContentPreview.tsx
import { Show, For } from "solid-js";
import { PeachPost } from "~/context/peach";
import MediaDisplay from "./MediaDisplay";
import styles from "./ContentPreview.module.css";

interface ContentPreviewProps {
  posts?: PeachPost[];
}

export default function ContentPreview(props: ContentPreviewProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div class={styles.preview}>
      <Show
        when={props.posts && props.posts.length > 0}
        fallback={<div class={styles.loading}>Loading your content...</div>}
      >
        {(posts) => (
          <div class={styles.postCard}>
            <div class={styles.postHeader}>
              <div class={styles.postDate}>{formatDate(posts()[0].createdTime)}</div>
            </div>
            
            <Show when={posts()[0].message}>
              <div class={styles.postMessage}>{posts()[0].message}</div>
            </Show>
            
            <Show when={posts()[0].media && posts()[0].media.length > 0}>
              <div class={styles.mediaContainer}>
                <For each={posts()[0].media}>
                  {(media) => (
                    <MediaDisplay media={media} />
                  )}
                </For>
              </div>
            </Show>
            
            <div class={styles.postFooter}>
              <Show when={posts()[0].likeCount}>
                <div class={styles.likes}>{posts()[0].likeCount} likes</div>
              </Show>
              <Show when={posts()[0].commentCount}>
                <div class={styles.comments}>{posts()[0].commentCount} comments</div>
              </Show>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
```

### MediaDisplay Component

Handles different types of media in posts:

```typescript
// src/components/MediaDisplay.tsx
import { Match, Switch } from "solid-js";
import styles from "./MediaDisplay.module.css";

interface MediaProps {
  media: {
    type: 'image' | 'gif' | 'video';
    url: string;
    width?: number;
    height?: number;
  };
}

export default function MediaDisplay(props: MediaProps) {
  return (
    <div class={styles.mediaWrapper} aria-label={`Post ${props.media.type}`}>
      <Switch>
        <Match when={props.media.type === 'image'}>
          <img 
            src={props.media.url} 
            alt="Post image" 
            class={styles.image}
            loading="lazy"
          />
        </Match>
        
        <Match when={props.media.type === 'gif'}>
          <img 
            src={props.media.url} 
            alt="Post GIF" 
            class={styles.gif}
            loading="lazy"
          />
        </Match>
        
        <Match when={props.media.type === 'video'}>
          <video 
            src={props.media.url} 
            controls
            class={styles.video}
            aria-label="Post video"
          />
        </Match>
      </Switch>
    </div>
  );
}
```

### ExportSection Component

Provides export functionality and information:

```typescript
// src/components/ExportSection.tsx
import { createSignal } from "solid-js";
import { useExport } from "~/context/export";
import styles from "./ExportSection.module.css";

export default function ExportSection() {
  const { startExport } = useExport();
  const [isLoading, setIsLoading] = createSignal(false);

  const handleExport = async () => {
    setIsLoading(true);
    
    try {
      await startExport({
        includeMedia: true
      });
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section class={styles.exportSection}>
      <div class={styles.card}>
        <h2>Save Your Peach Memories</h2>
        
        <p class={styles.description}>
          Download a complete archive of your Peach content, including all 
          posts, images, and videos in a format you can easily browse 
          and keep forever.
        </p>
        
        <div class={styles.infoGrid}>
          <div class={styles.infoItem}>
            <h3>What's included</h3>
            <ul>
              <li>All your posts with original formatting</li>
              <li>Images, GIFs, and videos</li>
              <li>Comments on your posts</li>
              <li>Post dates and activity counts</li>
            </ul>
          </div>
          
          <div class={styles.infoItem}>
            <h3>Export format</h3>
            <p>
              Your export will be packaged as a ZIP file containing:
            </p>
            <ul>
              <li>A browsable HTML version of your content</li>
              <li>Original media files in their native formats</li>
              <li>Complete data backup in JSON format</li>
            </ul>
          </div>
        </div>
        
        <button 
          class={styles.exportButton} 
          onClick={handleExport}
          disabled={isLoading()}
          aria-busy={isLoading()}
        >
          {isLoading() ? 'Preparing...' : 'Download My Peach Content'}
        </button>
      </div>
    </section>
  );
}
```

### ExportProgress Component

Shows export progress and provides controls:

```typescript
// src/components/ExportProgress.tsx
import { Match, Show, Switch, createEffect, createSignal } from "solid-js";
import { useExport, ExportStatus, ExportProgress as ProgressType, ExportError } from "~/context/export";
import ProgressBar from "./ProgressBar";
import styles from "./ExportProgress.module.css";

interface ExportProgressProps {
  status: ExportStatus;
  progress: ProgressType;
  error: ExportError | null;
  downloadUrl: string | null;
}

export default function ExportProgress(props: ExportProgressProps) {
  const { pauseExport, resumeExport, cancelExport, retryExport } = useExport();
  const [timeDisplay, setTimeDisplay] = createSignal('');

  // Format estimated time remaining
  createEffect(() => {
    if (props.status === 'exporting' && props.progress.estimatedTimeRemaining > 0) {
      const minutes = Math.floor(props.progress.estimatedTimeRemaining / 60);
      const seconds = props.progress.estimatedTimeRemaining % 60;
      
      if (minutes > 0) {
        setTimeDisplay(`${minutes}m ${seconds}s remaining`);
      } else {
        setTimeDisplay(`${seconds}s remaining`);
      }
    } else {
      setTimeDisplay('');
    }
  });

  const formatPhase = (phase: string) => {
    switch (phase) {
      case 'discovery': return 'Discovering content';
      case 'content': return 'Processing posts';
      case 'media': return 'Downloading media';
      case 'packaging': return 'Creating your archive';
      default: return phase;
    }
  };

  const handleDownload = () => {
    if (props.downloadUrl) {
      window.location.href = props.downloadUrl;
    }
  };

  return (
    <section class={styles.progressSection}>
      <div class={styles.card}>
        <Switch>
          {/* Preparing State */}
          <Match when={props.status === 'preparing'}>
            <h2>Preparing Your Export</h2>
            <div class={styles.preparing}>
              <div class={styles.spinner}></div>
              <p>Getting ready to gather your Peach memories...</p>
            </div>
          </Match>
          
          {/* Exporting State */}
          <Match when={props.status === 'exporting'}>
            <h2>Saving Your Peach Memories</h2>
            <div class={styles.progressContainer}>
              <ProgressBar percentage={props.progress.percentage} />
              
              <div class={styles.progressDetails}>
                <div class={styles.activityInfo}>
                  <div class={styles.phase}>{formatPhase(props.progress.phase)}</div>
                  <div class={styles.activity}>{props.progress.currentActivity}</div>
                </div>
                
                <div class={styles.stats}>
                  <div class={styles.count}>
                    {props.progress.completedItems} of {props.progress.totalItems} items
                  </div>
                  <div class={styles.time}>{timeDisplay()}</div>
                </div>
              </div>
              
              <div class={styles.controls}>
                <button 
                  class={styles.pauseButton} 
                  onClick={pauseExport}
                  aria-label="Pause export"
                >
                  Pause
                </button>
                
                <button 
                  class={styles.cancelButton} 
                  onClick={cancelExport}
                  aria-label="Cancel export"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Match>
          
          {/* Paused State */}
          <Match when={props.status === 'paused'}>
            <h2>Export Paused</h2>
            <div class={styles.progressContainer}>
              <ProgressBar 
                percentage={props.progress.percentage} 
                paused={true}
              />
              
              <div class={styles.pausedInfo}>
                <p>Your export is paused at {props.progress.percentage}% complete.</p>
                <p>You can resume at any time to continue where you left off.</p>
              </div>
              
              <div class={styles.controls}>
                <button 
                  class={styles.resumeButton} 
                  onClick={resumeExport}
                  aria-label="Resume export"
                >
                  Resume
                </button>
                
                <button 
                  class={styles.cancelButton} 
                  onClick={cancelExport}
                  aria-label="Cancel export"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Match>
          
          {/* Complete State */}
          <Match when={props.status === 'complete'}>
            <h2>Your Memories Are Ready!</h2>
            <div class={styles.completeContainer}>
              <div class={styles.celebration}>
                <div class={styles.celebrationIcon}>🎉</div>
                <p>We've successfully gathered all your Peach content.</p>
              </div>
              
              <Show when={props.downloadUrl}>
                <button 
                  class={styles.downloadButton} 
                  onClick={handleDownload}
                  aria-label="Download archive"
                >
                  Download Archive
                </button>
                
                <div class={styles.downloadInfo}>
                  <p>Your download contains:</p>
                  <ul>
                    <li>An interactive HTML version of your posts</li>
                    <li>All your original media files</li>
                    <li>A complete JSON data backup</li>
                  </ul>
                  <p class={styles.note}>
                    Note: This download link will expire in 24 hours
                  </p>
                </div>
              </Show>
            </div>
          </Match>
          
          {/* Error State */}
          <Match when={props.status === 'error'}>
            <h2>Export Interrupted</h2>
            <div class={styles.errorContainer}>
              <div class={styles.errorIcon}>⚠️</div>
              <p class={styles.errorMessage}>
                {props.error?.message || 'Something went wrong with your export.'}
              </p>
              
              <Show when={props.error?.retryable}>
                <button 
                  class={styles.retryButton} 
                  onClick={retryExport}
                  aria-label="Retry export"
                >
                  Try Again
                </button>
                <p class={styles.retryInfo}>
                  We'll resume where we left off.
                </p>
              </Show>
              
              <button 
                class={styles.cancelButton} 
                onClick={cancelExport}
                aria-label="Cancel export"
              >
                Cancel Export
              </button>
            </div>
          </Match>
        </Switch>
      </div>
    </section>
  );
}
```

### ProgressBar Component

Displays visual progress indicator:

```typescript
// src/components/ProgressBar.tsx
import { createMemo } from "solid-js";
import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  percentage: number;
  paused?: boolean;
}

export default function ProgressBar(props: ProgressBarProps) {
  const barStyle = createMemo(() => ({
    width: `${props.percentage}%`
  }));

  return (
    <div 
      class={`${styles.progressBar} ${props.paused ? styles.paused : ''}`}
      role="progressbar"
      aria-valuenow={props.percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div class={styles.bar} style={barStyle()}>
        <div class={styles.pulse}></div>
      </div>
      <div class={styles.percentage}>{Math.round(props.percentage)}%</div>
    </div>
  );
}
```

### Header Component

Displays user information and provides logout functionality:

```typescript
// src/components/Header.tsx
import { usePeach } from "~/context/peach";
import { useNavigate } from "@solidjs/router";
import styles from "./Header.module.css";

export default function Header() {
  const { user, logout } = usePeach();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };
  
  return (
    <header class={styles.header}>
      <div class={styles.logo}>
        <img src="/peachdotcool.png" alt="Peach" class={styles.logoImg} />
        <span class={styles.logoText}>Preserves</span>
      </div>
      
      <div class={styles.userSection}>
        <span class={styles.welcome}>Welcome!</span>
        <button 
          class={styles.logoutButton} 
          onClick={handleLogout}
          aria-label="Log out"
        >
          Log Out
        </button>
      </div>
    </header>
  );
}
```

## CSS Modules

### Dashboard Module

```css
/* src/routes/dashboard.module.css */
.dashboard {
  min-height: 100vh;
  background-color: var(--peach-background);
  color: var(--text-dark);
}

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.previewSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.previewSection h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
```

### ContentPreview Module

```css
/* src/components/ContentPreview.module.css */
.preview {
  width: 100%;
}

.loading {
  padding: 2rem;
  text-align: center;
  background-color: white;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.postCard {
  background-color: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.postCard:hover {
  transform: translateY(-2px);
}

.postHeader {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.postDate {
  font-size: 0.875rem;
  color: #666;
}

.postMessage {
  padding: 1rem;
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.mediaContainer {
  width: 100%;
}

.postFooter {
  display: flex;
  padding: 1rem;
  gap: 1rem;
  color: #666;
  font-size: 0.875rem;
}
```

### MediaDisplay Module

```css
/* src/components/MediaDisplay.module.css */
.mediaWrapper {
  width: 100%;
  overflow: hidden;
}

.image, .gif, .video {
  width: 100%;
  height: auto;
  display: block;
}

.video {
  max-height: 500px;
}
```

### ExportSection Module

```css
/* src/components/ExportSection.module.css */
.exportSection {
  width: 100%;
}

.card {
  background-color: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-dark);
}

.description {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.infoGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 640px) {
  .infoGrid {
    grid-template-columns: 1fr;
  }
}

.infoItem h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--peach-secondary);
}

.infoItem ul {
  padding-left: 1.5rem;
}

.infoItem li {
  margin-bottom: 0.5rem;
}

.exportButton {
  width: 100%;
  padding: 1rem;
  background-color: var(--peach-primary);
  color: var(--text-light);
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.exportButton:hover:not(:disabled) {
  background-color: var(--peach-dark);
  transform: translateY(-2px);
}

.exportButton:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: var(--peach-accent);
}
```

### ExportProgress Module

```css
/* src/components/ExportProgress.module.css */
.progressSection {
  width: 100%;
}

.card {
  background-color: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-dark);
}

/* Preparing State */
.preparing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 5px solid var(--peach-accent);
  border-bottom-color: var(--peach-primary);
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Exporting State */
.progressContainer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.progressDetails {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activityInfo {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.phase {
  font-weight: 600;
  color: var(--peach-secondary);
}

.activity {
  font-size: 0.875rem;
}

.stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #666;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.pauseButton, .resumeButton, .cancelButton, .retryButton, .downloadButton {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pauseButton {
  background-color: #f0f0f0;
  color: var(--text-dark);
}

.resumeButton {
  background-color: var(--peach-primary);
  color: var(--text-light);
}

.cancelButton {
  background-color: transparent;
  color: #666;
  text-decoration: underline;
}

.retryButton {
  background-color: var(--peach-primary);
  color: var(--text-light);
}

.downloadButton {
  background-color: var(--peach-primary);
  color: var(--text-light);
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  margin: 1rem 0;
}

.downloadButton:hover, .resumeButton:hover, .retryButton:hover {
  background-color: var(--peach-dark);
  transform: translateY(-2px);
}

.pauseButton:hover {
  background-color: #e0e0e0;
}

/* Paused State */
.pausedInfo {
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* Complete State */
.completeContainer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.celebration {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 0;
}

.celebrationIcon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.downloadInfo {
  margin-top: 1rem;
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 0.5rem;
}

.downloadInfo ul {
  padding-left: 1.5rem;
  margin: 0.75rem 0;
}

.note {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.75rem;
}

/* Error State */
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
}

.errorIcon {
  font-size: 2.5rem;
}

.errorMessage {
  text-align: center;
  color: var(--peach-secondary);
  font-weight: 500;
}

.retryInfo {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}
```

### ProgressBar Module

```css
/* src/components/ProgressBar.module.css */
.progressBar {
  width: 100%;
  height: 1.5rem;
  background-color: #f0f0f0;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;
}

.bar {
  height: 100%;
  background-color: var(--peach-primary);
  border-radius: 0.75rem;
  transition: width 0.5s ease;
  position: relative;
  overflow: hidden;
}

.paused .bar {
  background-color: var(--peach-accent);
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    var(--peach-primary) 10px,
    var(--peach-primary) 20px
  );
}

.pulse {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: pulse 1.5s linear infinite;
}

.paused .pulse {
  animation: none;
}

@keyframes pulse {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.percentage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-dark);
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 1;
}
```

### Header Module

```css
/* src/components/Header.module.css */
.header {
  background-color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logoImg {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

.logoText {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--peach-secondary);
}

.userSection {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.welcome {
  font-size: 0.875rem;
  color: #666;
}

.logoutButton {
  background: none;
  border: none;
  color: var(--peach-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  text-decoration: underline;
}

.logoutButton:hover {
  color: var(--peach-dark);
}
```

## Implementation Plan

1. Update the application structure:
   - Add ExportContext provider to app.tsx
   - Create component files

2. Implement the context and state management:
   - First implement the ExportContext
   - Add mock functions for the API calls until server is ready

3. Create the static components:
   - Build dashboard layout
   - Implement content preview
   - Create export section
   - Implement progress displays for different states

4. Add real API integration with proper typing

5. Implement WebSocket connection for progress updates

6. Style components using CSS modules

7. Add accessibility features:
   - Proper ARIA attributes
   - Focus management
   - Screen reader announcements

8. Test different states and flows:
   - Export initiation
   - Progress tracking
   - Pause/resume
   - Completion
   - Error handling