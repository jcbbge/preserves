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

// Constants for development and debugging
export const DEV_MODE = true;
export const DEBUG = true;

// Debug logging utility
export function debugLog(section: string, message: string, data?: any) {
  if (!DEBUG) return;

  console.group(`🐛 DEBUG [${section}]`);
  console.log(message);
  if (data !== undefined) {
    console.log("DATA:", data);
  }
  console.groupEnd();
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

// File system utilities for DEV_MODE
export async function writeDebugFile(
  data: ArrayBuffer | Blob,
  filename: string,
): Promise<void> {
  if (!DEV_MODE) return;

  try {
    const fs = require("fs");
    const path = require("path");
    const debugPath = path.join("downloads", filename);

    // Ensure we have ArrayBuffer
    const buffer =
      data instanceof Blob
        ? Buffer.from(await data.arrayBuffer())
        : Buffer.from(data);

    fs.writeFileSync(debugPath, buffer);
    debugLog(
      "debug",
      `Wrote debug file: ${debugPath} (${buffer.length} bytes)`,
    );
  } catch (error) {
    debugLog("debug", `Failed to write debug file: ${error}`);
  }
}
