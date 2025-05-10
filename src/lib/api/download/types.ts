// Type definitions for the download module
import { PeachPost } from '~/context/peach';
import { useExport } from '~/context/export';

// Download options
export interface DownloadOptions {
  includeComments?: boolean;
  includeImages?: boolean;
  username?: string; // Add username option to avoid JWT parsing issues
  devMode?: boolean; // Override DEV_MODE for specific calls
}

// Archive structures
export interface ArchiveMetadata {
  username: string;
  exportDate: string;
  postCount: number;
  mediaCount: number;
  totalSize: number;
}

export interface ArchivePost extends PeachPost {
  localMediaPaths?: string[]; // Paths to media within the archive
}

export interface PeachArchive {
  metadata: ArchiveMetadata;
  posts: ArchivePost[];
}

// Progress tracking types
export type ExportPhase = 'discovery' | 'content' | 'media' | 'packaging';

export interface ExportProgress {
  percentage: number;
  currentActivity: string;
  phase: ExportPhase;
  completedItems: number;
  totalItems: number;
}

export type UpdateExportProgressFn = (
  update: Partial<ExportProgress>
) => void;

// Media types
export interface MediaMap {
  [filename: string]: Blob;
}

export interface MediaUrlMap {
  [url: string]: string;
}

// Media validation result type
export interface MediaValidationResult {
  valid: boolean;
  type: string;
  error?: string;
  warning?: string;
  metadata?: {
    size: number;
    contentType: string;
    [key: string]: any;
  };
}