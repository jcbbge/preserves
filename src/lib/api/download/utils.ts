import { MediaValidationResult } from "./types";

// Create a safe path for files in the archive
export function createSafeArchivePath(
  directory: string,
  filename: string,
): string {
  // Make sure the directory doesn't have a trailing slash
  const dir = directory.endsWith("/") ? directory.slice(0, -1) : directory;

  // Make the filename safe
  const safeName = filename.replace(/[^a-zA-Z0-9_\.-]/g, "_");

  // Combine
  return `${dir}/${safeName}`;
}

// Format a file size in bytes to a human-readable string
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " bytes";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

// Development mode flag
export const DEV_MODE = import.meta.env.DEV;

// Debug logging utility - disabled in production
export function debugLog(section: string, message: string, data?: any) {
  if (DEV_MODE) {
    console.log(`[${section.toUpperCase()}]`, message, data ? data : '');
  }
}

// Media type validation utilities
export function isImageFile(contentType: string): boolean {
  return /^image\/(jpeg|png|gif|webp)$/i.test(contentType);
}

export function isVideoFile(contentType: string): boolean {
  return /^video\/(mp4|quicktime|webm)$/i.test(contentType);
}

export function getFileExtensionFromContentType(contentType: string): string {
  const mapping: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  };
  return mapping[contentType.toLowerCase()] || ".bin";
}

// Media binary validation
export async function validateMediaFormat(
  blob: Blob,
  contentType: string,
): Promise<MediaValidationResult> {
  if (!blob || blob.size === 0) {
    return {
      valid: false,
      type: "unknown",
      error: "Empty or invalid media file",
    };
  }

  const array = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  let detectedType: string | undefined;

  // JPEG: FF D8
  if (array[0] === 0xff && array[1] === 0xd8) {
    detectedType = "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    array[0] === 0x89 &&
    array[1] === 0x50 &&
    array[2] === 0x4e &&
    array[3] === 0x47 &&
    array[4] === 0x0d &&
    array[5] === 0x0a &&
    array[6] === 0x1a &&
    array[7] === 0x0a
  ) {
    detectedType = "image/png";
  }

  // GIF: GIF87a or GIF89a
  else {
    const gifHeader = new TextDecoder().decode(array.slice(0, 6));
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      detectedType = "image/gif";
    }
  }

  // WebP: RIFF....WEBP
  if (!detectedType) {
    const webpHeader = new TextDecoder().decode(array.slice(0, 4));
    if (
      webpHeader === "RIFF" &&
      new TextDecoder().decode(array.slice(8, 12)) === "WEBP"
    ) {
      detectedType = "image/webp";
    }
  }

  // MP4: ftyp
  if (!detectedType) {
    const mp4Header = new TextDecoder().decode(array.slice(4, 8));
    if (mp4Header === "ftyp") {
      detectedType = "video/mp4";
    }
  }

  // QuickTime MOV: similar structure to MP4
  if (!detectedType) {
    const movHeader = new TextDecoder().decode(array.slice(4, 8));
    if (movHeader === "moov" || movHeader === "mdat") {
      detectedType = "video/quicktime";
    }
  }

  // Compare detected type with content type
  if (detectedType) {
    if (contentType.toLowerCase() === detectedType.toLowerCase()) {
      return {
        valid: true,
        type: detectedType,
        metadata: {
          size: blob.size,
          contentType: detectedType,
        },
      };
    } else {
      return {
        valid: true,
        type: detectedType,
        warning: `Content-Type mismatch: got ${contentType}, detected ${detectedType}`,
        metadata: {
          size: blob.size,
          contentType: detectedType,
        },
      };
    }
  }

  // If we don't recognize it but have a content type and data, accept it with warning
  if (contentType && contentType !== "application/octet-stream") {
    return {
      valid: true,
      type: contentType,
      warning: "Could not validate format signature but Content-Type present",
      metadata: {
        size: blob.size,
        contentType,
      },
    };
  }

  // Last resort - accept binary data but warn
  return {
    valid: true,
    type: "application/octet-stream",
    warning: "Unknown binary format",
    metadata: {
      size: blob.size,
      contentType: "application/octet-stream",
    },
  };
}

// Debug file writing - disabled in production
export async function writeDebugFile(
  data: ArrayBuffer | Blob,
  filename: string,
): Promise<void> {
  // Debug file writing disabled
}

// Performance Metrics Collection System
export interface PerformanceMetrics {
  // Timing metrics
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  
  // Phase timings
  phases: {
    discovery: { start: number; end?: number; duration?: number };
    media: { start: number; end?: number; duration?: number };
    packaging: { start: number; end?: number; duration?: number };
  };
  
  // Network metrics
  network: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalBytesDownloaded: number;
    averageRequestTime: number;
    requestTimes: number[];
    retryCount: number;
  };
  
  // Content metrics
  content: {
    totalPosts: number;
    postsWithMedia: number;
    totalMediaFiles: number;
    duplicatesRemoved: number;
    archiveSizeBytes: number;
  };
  
  // Performance metrics
  performance: {
    postsPerSecond: number;
    mediaDownloadMbps: number;
    peakMemoryUsage?: number;
    averageResponseTime: number;
  };
  
  // Error tracking
  errors: {
    paginationErrors: number;
    mediaDownloadErrors: number;
    archiveErrors: number;
    errorDetails: Array<{ type: string; message: string; timestamp: number }>;
  };
}

// Global metrics collector
let globalMetrics: PerformanceMetrics | null = null;

export function initializeMetrics(): PerformanceMetrics {
  const now = Date.now();
  globalMetrics = {
    startTime: now,
    phases: {
      discovery: { start: now },
      media: { start: 0 },
      packaging: { start: 0 }
    },
    network: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalBytesDownloaded: 0,
      averageRequestTime: 0,
      requestTimes: [],
      retryCount: 0
    },
    content: {
      totalPosts: 0,
      postsWithMedia: 0,
      totalMediaFiles: 0,
      duplicatesRemoved: 0,
      archiveSizeBytes: 0
    },
    performance: {
      postsPerSecond: 0,
      mediaDownloadMbps: 0,
      averageResponseTime: 0
    },
    errors: {
      paginationErrors: 0,
      mediaDownloadErrors: 0,
      archiveErrors: 0,
      errorDetails: []
    }
  };
  return globalMetrics;
}

export function getMetrics(): PerformanceMetrics | null {
  return globalMetrics;
}

export function recordPhaseStart(phase: keyof PerformanceMetrics['phases']): void {
  if (!globalMetrics) return;
  globalMetrics.phases[phase].start = Date.now();
}

export function recordPhaseEnd(phase: keyof PerformanceMetrics['phases']): void {
  if (!globalMetrics) return;
  const now = Date.now();
  globalMetrics.phases[phase].end = now;
  globalMetrics.phases[phase].duration = now - globalMetrics.phases[phase].start;
}

export function recordNetworkRequest(
  success: boolean, 
  responseTimeMs: number, 
  bytesDownloaded: number = 0
): void {
  if (!globalMetrics) return;
  
  globalMetrics.network.totalRequests++;
  globalMetrics.network.requestTimes.push(responseTimeMs);
  globalMetrics.network.totalBytesDownloaded += bytesDownloaded;
  
  if (success) {
    globalMetrics.network.successfulRequests++;
  } else {
    globalMetrics.network.failedRequests++;
  }
  
  // Update average
  globalMetrics.network.averageRequestTime = 
    globalMetrics.network.requestTimes.reduce((a, b) => a + b, 0) / 
    globalMetrics.network.requestTimes.length;
}

export function recordError(type: string, message: string): void {
  if (!globalMetrics) return;
  
  globalMetrics.errors.errorDetails.push({
    type,
    message,
    timestamp: Date.now()
  });
  
  switch (type) {
    case 'pagination':
      globalMetrics.errors.paginationErrors++;
      break;
    case 'media':
      globalMetrics.errors.mediaDownloadErrors++;
      break;
    case 'archive':
      globalMetrics.errors.archiveErrors++;
      break;
  }
}

export function updateContentMetrics(data: Partial<PerformanceMetrics['content']>): void {
  if (!globalMetrics) return;
  Object.assign(globalMetrics.content, data);
}

export function finalizeMetrics(): PerformanceMetrics | null {
  if (!globalMetrics) return null;
  
  const now = Date.now();
  globalMetrics.endTime = now;
  globalMetrics.totalDuration = now - globalMetrics.startTime;
  
  // Calculate performance metrics
  if (globalMetrics.totalDuration > 0) {
    globalMetrics.performance.postsPerSecond = 
      (globalMetrics.content.totalPosts / globalMetrics.totalDuration) * 1000;
    
    const totalMB = globalMetrics.network.totalBytesDownloaded / (1024 * 1024);
    const totalSeconds = globalMetrics.totalDuration / 1000;
    globalMetrics.performance.mediaDownloadMbps = totalMB / totalSeconds;
  }
  
  globalMetrics.performance.averageResponseTime = globalMetrics.network.averageRequestTime;
  
  return globalMetrics;
}

export function generatePerformanceReport(metrics: PerformanceMetrics): string {
  const duration = metrics.totalDuration || 0;
  const durationSec = duration / 1000;
  const durationMin = Math.floor(durationSec / 60);
  const remainingSec = Math.floor(durationSec % 60);
  
  const successRate = metrics.network.totalRequests > 0 ? 
    (metrics.network.successfulRequests / metrics.network.totalRequests * 100).toFixed(1) : '0';
  
  const report = `
PEACH PRESERVES - PERFORMANCE REPORT
====================================
Generated: ${new Date().toISOString()}

OVERALL PERFORMANCE
------------------
Total Duration: ${durationMin}m ${remainingSec}s (${duration}ms)
Posts Per Second: ${metrics.performance.postsPerSecond.toFixed(2)}
Media Download Speed: ${metrics.performance.mediaDownloadMbps.toFixed(2)} MB/s
Average Response Time: ${metrics.performance.averageResponseTime.toFixed(0)}ms

PHASE BREAKDOWN
--------------
Discovery Phase: ${(metrics.phases.discovery.duration || 0) / 1000}s
Media Phase: ${(metrics.phases.media.duration || 0) / 1000}s
Packaging Phase: ${(metrics.phases.packaging.duration || 0) / 1000}s

CONTENT SUMMARY
--------------
Total Posts Processed: ${metrics.content.totalPosts}
Posts with Media: ${metrics.content.postsWithMedia}
Total Media Files: ${metrics.content.totalMediaFiles}
Duplicates Removed: ${metrics.content.duplicatesRemoved}
Final Archive Size: ${formatFileSize(metrics.content.archiveSizeBytes)}

NETWORK STATISTICS
-----------------
Total API Requests: ${metrics.network.totalRequests}
Successful Requests: ${metrics.network.successfulRequests} (${successRate}%)
Failed Requests: ${metrics.network.failedRequests}
Total Data Downloaded: ${formatFileSize(metrics.network.totalBytesDownloaded)}
Retry Attempts: ${metrics.network.retryCount}

ERROR SUMMARY
------------
Pagination Errors: ${metrics.errors.paginationErrors}
Media Download Errors: ${metrics.errors.mediaDownloadErrors}
Archive Creation Errors: ${metrics.errors.archiveErrors}
Total Errors: ${metrics.errors.errorDetails.length}

${metrics.errors.errorDetails.length > 0 ? `
ERROR DETAILS
------------
${metrics.errors.errorDetails.slice(0, 10).map(err => 
  `[${new Date(err.timestamp).toISOString()}] ${err.type.toUpperCase()}: ${err.message}`
).join('\n')}
${metrics.errors.errorDetails.length > 10 ? `\n... and ${metrics.errors.errorDetails.length - 10} more errors` : ''}
` : ''}

PERFORMANCE ANALYSIS
-------------------
${metrics.performance.postsPerSecond < 1 ? 
  '⚠️  LOW THROUGHPUT: Less than 1 post per second' : 
  metrics.performance.postsPerSecond > 10 ? 
  '✅ HIGH THROUGHPUT: Processing > 10 posts per second' : 
  '✓ NORMAL THROUGHPUT: Processing 1-10 posts per second'}

${metrics.network.failedRequests > metrics.network.successfulRequests * 0.1 ? 
  '⚠️  HIGH ERROR RATE: More than 10% of requests failed' : 
  '✅ LOW ERROR RATE: Less than 10% of requests failed'}

${metrics.performance.mediaDownloadMbps < 1 ? 
  '⚠️  SLOW MEDIA DOWNLOAD: Less than 1 MB/s' : 
  '✅ GOOD MEDIA DOWNLOAD: > 1 MB/s'}

${metrics.performance.averageResponseTime > 5000 ? 
  '⚠️  SLOW API RESPONSES: Average > 5 seconds' : 
  '✅ FAST API RESPONSES: Average < 5 seconds'}

====================================
End of Report
`;
  
  return report;
}
