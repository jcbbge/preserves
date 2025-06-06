// Archive creation and packaging functionality
import JSZip from "jszip";
import { PeachPost } from "~/context/peach";
import { ArchivePost, ArchiveMetadata, PeachArchive, MediaMap } from "./types";
// Import from the viewer module that includes modal functionality
import { generateViewerHTML, generateViewerCSS, generateViewerJS } from "./viewer";
import { debugLog } from "./utils";

/**
 * Create the archive data structure
 */
export function createArchiveData(
  username: string,
  posts: PeachPost[],
  mediaUrlToPath: Record<string, string>,
): PeachArchive {

  if (!username) {
    console.warn('[API] No username provided for archive, using "unknown"');
    username = "unknown";
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    console.warn("[API] No posts provided for archive");
  }

  // Remove duplicate posts by ID
  const seenIds = new Set<string>();
  const deduplicatedPosts = posts.filter(post => {
    if (seenIds.has(post.id)) {
      debugLog("archive", `Removing duplicate post: ${post.id}`);
      return false;
    }
    seenIds.add(post.id);
    return true;
  });
  
  if (posts.length !== deduplicatedPosts.length) {
    debugLog("archive", `DUPLICATES REMOVED: ${posts.length} → ${deduplicatedPosts.length} posts`);
  }
  
  posts = deduplicatedPosts;

  const archivePosts: ArchivePost[] = posts.map((post) => {
    const archivePost: ArchivePost = { ...post };

    // Update media to include local paths
    archivePost.localMediaPaths = [];

    // 1. First collect media from post.media array
    if (post.media && post.media.length > 0) {
      const mediaPaths = post.media
        .map((media, index) => {
          // First try to get the path from the mediaUrlToPath mapping
          if (media.url && mediaUrlToPath[media.url]) {
            return mediaUrlToPath[media.url];
          }

          // If no mapping exists, generate a fallback path that includes the post ID
          if (media.url) {
            const url = media.url;
            const ext = url.split(".").pop()?.toLowerCase() || "jpg";

            // Use the same naming scheme as in generateMediaFilename
            if (post.id) {
              const shortPostId = post.id.substring(0, 8);
              return `post_${shortPostId}_img_${String(index).padStart(2, "0")}.${ext}`;
            } else {
              // Legacy fallback
              return `media_${String(index).padStart(3, "0")}.${ext}`;
            }
          }

          return null;
        })
        .filter(Boolean) as string[];

      archivePost.localMediaPaths = [...mediaPaths];
    }

    // 2. Also collect media from message array for completeness
    if (Array.isArray(post.message)) {
      const mediaInMessage = post.message
        .filter((item) => item.type === "image" && item.src)
        .map((media, index) => {
          // Check the mediaUrlToPath mapping first
          if (media.src && mediaUrlToPath[media.src]) {
            return mediaUrlToPath[media.src];
          }

          // Generate a path if not found in mapping
          if (media.src) {
            const url = media.src;
            const ext = url.split(".").pop()?.toLowerCase() || "jpg";
            const offset = archivePost.localMediaPaths.length; // Start after existing media

            if (post.id) {
              const shortPostId = post.id.substring(0, 8);
              return `post_${shortPostId}_img_${String(index + offset).padStart(2, "0")}.${ext}`;
            } else {
              return `media_${String(index + offset).padStart(3, "0")}.${ext}`;
            }
          }

          return null;
        })
        .filter(Boolean) as string[];

      // Add any new media paths from the message
      if (mediaInMessage.length > 0) {
        archivePost.localMediaPaths = [
          ...archivePost.localMediaPaths,
          ...mediaInMessage,
        ];
      }
    }

    debugLog(
      "archive",
      `Post ${post.id}: Added ${archivePost.localMediaPaths.length} local media paths`,
    );

    // IMPORTANT: Add debug log to see exact media path mapping
    if (archivePost.localMediaPaths.length > 0) {
      debugLog(
        "archive",
        `Media paths for post ${post.id}:`,
        archivePost.localMediaPaths,
      );
    }

    return archivePost;
  });

  const result = {
    metadata: {
      username,
      exportDate: new Date().toISOString(),
      postCount: posts.length,
      mediaCount: Object.keys(mediaUrlToPath).length,
      totalSize: 0, // This will be updated later if needed
    },
    posts: archivePosts,
  };

  // Debug: Final verification of archive posts
  debugLog("archive", `Final archive: ${archivePosts.length} posts, first 3 IDs:`, 
    archivePosts.slice(0, 3).map(p => p.id));

  debugLog("archive", "Archive data created", {
    username,
    postCount: posts.length,
    mediaCount: Object.keys(mediaUrlToPath).length,
  });

  return result;
}

/**
 * Create the ZIP archive with all content
 */
export async function createArchive(
  archiveData: PeachArchive,
  mediaFiles: MediaMap,
  performanceReport?: string,
): Promise<Blob> {
  debugLog("zip", "Creating ZIP archive");

  try {
    const zip = new JSZip();

    // Add README file
    debugLog("zip", "Adding README.txt to archive");
    zip.file(
      "README.txt",
      `Peach Preserves Archive
      Username: ${archiveData.metadata.username}
      Export Date: ${new Date(archiveData.metadata.exportDate).toLocaleString()}
      Total Posts: ${archiveData.metadata.postCount}
      Media Files: ${archiveData.metadata.mediaCount}

      Hi friend. Thank you for using my app. Peach holds a special place in my heart and I wanted a way to save all of my posts. I built this for me, but I want to share it with you. If you are still here then I know peach is special to you too. Don't let all of these files intimidate you. All you have to do is double click on the peach-preserves.html file.

      FILES:
      ------
      - peach-preserves.html: The HTML viewer for browsing your archive
      - styles.css: Stylesheet for the viewer interface
      - script.js: JavaScript functionality for the viewer
      - data.js: Contains all your post data and metadata
      - media/: Directory containing all media files

      MEDIA FILES:
      -----------
      Media files are stored in the /media directory using the naming convention:
      post_[POST_ID]_img_[INDEX].[EXTENSION]

      Example: post_9fbd0e3b_img_00.jpg

      Each media file is associated with a specific post through this naming pattern.
      The peach-preserves.html file loads data from data.js, styles from styles.css, and 
      functionality from script.js to display the media files alongside their 
      corresponding posts.

      PERFORMANCE REPORT:
      ------------------
      The performance-report.txt file contains detailed metrics about the archive creation
      process including timing, throughput, network statistics, and error analysis.
      `,
    );

    // Create data.js with the archive data
    try {
      const jsonString = JSON.stringify(archiveData, null, 0);
      const dataJsContent = `window.ARCHIVE_DATA_JSON = ${jsonString};`;
      zip.file("data.js", dataJsContent);
      debugLog("zip", "Added data.js to archive");
    } catch (jsonError) {
      console.error("[API] Error creating data.js:", jsonError);
      // Create a minimal fallback data.js
      const fallbackData = {
        metadata: archiveData.metadata,
        posts: archiveData.posts.map(p => ({
          id: p.id,
          createdTime: p.createdTime,
          message: Array.isArray(p.message) ? p.message.filter(m => m.type === 'text') : '',
          likeCount: p.likeCount || 0,
          commentCount: p.commentCount || 0,
          localMediaPaths: p.localMediaPaths || []
        }))
      };
      const dataJsContent = `window.ARCHIVE_DATA_JSON = ${JSON.stringify(fallbackData)};`;
      zip.file("data.js", dataJsContent);
      debugLog("zip", "Added fallback data.js to archive due to JSON error");
    }

    // Get template content from functions and replace placeholders
    const htmlTemplate = generateViewerHTML();
    const cssContent = generateViewerCSS();
    const jsContent = generateViewerJS();

    // Replace placeholders in HTML template
    debugLog("zip", "Template replacement values:", {
      username: archiveData.metadata.username,
      exportDate: new Date(archiveData.metadata.exportDate).toLocaleDateString(),
      postCount: archiveData.metadata.postCount
    });
    
    const htmlContent = htmlTemplate
      .replace(/\{\{USERNAME\}\}/g, archiveData.metadata.username)
      .replace(/\{\{EXPORT_DATE\}\}/g, new Date(archiveData.metadata.exportDate).toLocaleDateString())
      .replace(/\{\{POST_COUNT\}\}/g, archiveData.metadata.postCount.toString());

    // Add a debug summary file to help troubleshoot the archive content
    if (true) {
      // DEBUG mode
      // Create a more detailed debug summary to help with troubleshooting
      // Don't rely on external variables that might be out of scope
      const mediaMappingSamples = archiveData.posts
        .filter((p) => p.localMediaPaths && p.localMediaPaths.length > 0)
        .flatMap((p) => p.localMediaPaths || [])
        .slice(0, 10)
        .map((path) => ({ localFilename: path }));

      const debugSummary = {
        metadata: archiveData.metadata,
        totalPosts: archiveData.posts.length,
        postsWithMedia: archiveData.posts.filter(
          (p) => p.media && p.media.length > 0,
        ).length,
        postsWithLocalPaths: archiveData.posts.filter(
          (p) => p.localMediaPaths && p.localMediaPaths.length > 0,
        ).length,
        totalMediaFiles: Object.keys(mediaFiles).length,
        mediaSampleMappings: mediaMappingSamples,
        // Include posts with media but no local paths (this would indicate a problem)
        problemPosts: archiveData.posts
          .filter(
            (p) =>
              p.media &&
              p.media.length > 0 &&
              (!p.localMediaPaths || p.localMediaPaths.length === 0),
          )
          .map((p) => ({
            id: p.id,
            mediaCount: p.media?.length || 0,
            mediaUrls: p.media?.map((m) => m.url).filter(Boolean) || [],
          })),
        // Regular post summary
        postsSummary: archiveData.posts.map((p) => ({
          id: p.id,
          createdTime: p.createdTime,
          mediaCount: p.media?.length || 0,
          localMediaPathsCount: p.localMediaPaths?.length || 0,
          localMediaPaths: p.localMediaPaths || [],
          hasMessageText:
            Array.isArray(p.message) &&
            p.message.some((m) => m.type === "text"),
        })),
      };
      zip.file("debug-info.json", JSON.stringify(debugSummary, null, 2));
    }

    // Add the HTML viewer
    zip.file("peach-preserves.html", htmlContent);

    // Add external CSS and JS files from templates
    zip.file("styles.css", cssContent);
    zip.file("script.js", jsContent);
    
    // Add performance report if provided
    if (performanceReport) {
      zip.file("performance-report.txt", performanceReport);
      debugLog("zip", "Added performance report to archive");
    }

    // Add the Peach logo
    let peachLogoBlob;
    try {
      // Add the logo as a file in the zip
      peachLogoBlob = await fetch("/peachdotcool.png").then((r) => r.blob());
      if (peachLogoBlob && peachLogoBlob.size > 0) {
        zip.file("peachdotcool.png", peachLogoBlob);
        debugLog("zip", "Added Peach logo to archive");
      }
    } catch (logoError) {
      console.error("[API] Error loading logo:", logoError);
    }

    // Add media files
    const mediaFolder = zip.folder("media");
    if (mediaFolder) {
      for (const [filename, blob] of Object.entries(mediaFiles)) {
        mediaFolder.file(filename, blob);
      }
    }

    // Generate the zip file with progress callback
    debugLog("zip", "Generating ZIP blob");
    const blob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        if (metadata.percent) {
          debugLog(
            "zip",
            `ZIP generation progress: ${Math.round(metadata.percent)}%`,
          );
        }
      },
    );

    debugLog("zip", "ZIP blob generated successfully", { size: blob.size });
    return blob;
  } catch (error) {
    console.error("[API] Error creating ZIP archive:", error);
    throw new Error(
      `Failed to create ZIP archive: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Trigger a download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  debugLog("download", "Starting browser download", {
    filename,
    size: blob.size,
  });

  if (!blob || blob.size === 0) {
    throw new Error("Cannot download empty blob");
  }

  try {
    const url = URL.createObjectURL(blob);
    debugLog("download", `Created object URL: ${url}`);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    debugLog("download", "Clicking download link");
    a.click();

    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        debugLog("download", "Download link cleanup completed");
      } catch (e) {
        console.warn("[API] Error during download cleanup:", e);
      }
    }, 100);
  } catch (error) {
    console.error("[API] Error triggering download:", error);
    throw new Error(
      `Failed to trigger browser download: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
