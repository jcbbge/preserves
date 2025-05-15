// Archive creation and packaging functionality
import JSZip from "jszip";
import { PeachPost } from "~/context/peach";
import { ArchivePost, ArchiveMetadata, PeachArchive, MediaMap } from "./types";
import { debugLog } from "./utils";
// Import from the fixed viewer module that includes modal functionality
import { generateViewerCSS, generateViewerJS } from "./viewer-fixed";

/**
 * Create the archive data structure
 */
export function createArchiveData(
  username: string,
  posts: PeachPost[],
  mediaUrlToPath: Record<string, string>,
): PeachArchive {
  debugLog("archive", "Creating archive data structure");

  if (!username) {
    console.warn('[API] No username provided for archive, using "unknown"');
    username = "unknown";
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    console.warn("[API] No posts provided for archive");
  }

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

      This archive was created with Peach Preserves.

      FILES:
      ------
      - viewer.html: The HTML viewer for browsing your archive
      - data.js: Contains all your post data and metadata
      - media/: Directory containing all media files

      MEDIA FILES:
      -----------
      Media files are stored in the /media directory using the naming convention:
      post_[POST_ID]_img_[INDEX].[EXTENSION]

      Example: post_9fbd0e3b_img_00.jpg

      Each media file is associated with a specific post through this naming pattern.
      The viewer.html file loads data from data.js and displays the media files
      alongside their corresponding posts.
      `,
    );

    // Create data.js with the archive data
    const dataJsContent = `const ARCHIVE_DATA_JSON = ${JSON.stringify(archiveData)};`;
    zip.file("data.js", dataJsContent);

    // Get CSS and JS content from our imported functions
    const cssContent = generateViewerCSS();
    const jsContent = generateViewerJS();

    // Generate modified JavaScript that loads from data.js
    const modifiedJSContent = jsContent.replace(
      "document.addEventListener('DOMContentLoaded', function() {",
      "function initializeArchiveViewer() {",
    );

    // Create HTML content that loads from data.js
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peach Archive - ${archiveData.metadata.username}</title>
  <style>
    ${cssContent}
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <img src="peachdotcool.png" alt="Peach Logo" class="logo">
      <h1>Peach Archive</h1>
    </div>
    <div class="user-info">
      <span class="username">@${archiveData.metadata.username}</span>
      <span class="export-date">Exported: ${new Date(archiveData.metadata.exportDate).toLocaleDateString()}</span>
    </div>
  </header>

  <div class="search-bar">
    <div class="search-container">
      <div class="search-field">
        <label for="search-input">Search posts:</label>
        <input type="text" id="search-input" placeholder="Search by content...">
      </div>
      <div class="time-filter">
        <div class="year-filter">
          <label for="year-select">Year:</label>
          <select id="year-select">
            <option value="">All Years</option>
            <!-- Will be populated by JavaScript -->
          </select>
        </div>
        <div class="month-filter">
          <label for="month-select">Month:</label>
          <select id="month-select">
            <option value="">All Months</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
        </div>
      </div>
      <div class="search-buttons">
        <button id="search-btn">Search</button>
        <button id="reset-btn">Reset</button>
      </div>
    </div>
  </div>

  <main>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">${archiveData.metadata.postCount}</span>
        <span class="stat-label">Total Posts</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="visible-posts">${archiveData.metadata.postCount}</span>
        <span class="stat-label">Visible Posts</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="emoji-count">-</span>
        <span class="stat-label">Emojis</span>
      </div>
      <div class="stat">
        <span class="stat-value" id="active-days">-</span>
        <span class="stat-label">Active Days</span>
      </div>
    </div>

    <div class="fun-stats">
      <h3>Fun Stats</h3>
      <div class="fun-stats-grid">
        <div class="fun-stat" id="top-emojis">
          <h4>Top Emojis</h4>
          <div class="emoji-list">Loading...</div>
        </div>
        <div class="fun-stat" id="word-count">
          <h4>Word Stats</h4>
          <div class="word-stats">Loading...</div>
        </div>
        <div class="fun-stat" id="activity-chart">
          <h4>Activity by Time</h4>
          <div class="activity-data">Loading...</div>
        </div>
      </div>
    </div>

    <div class="timeline" id="timeline">
      <!-- Posts will be inserted here by JavaScript -->
      <div class="loading">Loading posts...</div>
    </div>
  </main>

  <footer>
    <p>Created with Peach Preserves - © 2025 jcbbge</p>
  </footer>

  <script src="data.js"></script>

  <script>
    ${modifiedJSContent}
  </script>
</body>
</html>`;

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
    zip.file("viewer.html", htmlContent);

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
