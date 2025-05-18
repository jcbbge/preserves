// Media handling functions for the download module
import { debugLog } from "./utils";
import { PeachPost } from "~/context/peach";

/**
 * Extract media URLs from posts
 * Enhanced to find media in multiple possible locations
 */
export function extractMediaUrls(posts: PeachPost[]): string[] {
  debugLog("media", "Extracting media URLs from posts");

  const mediaUrls: string[] = [];
  const uniqueUrls = new Set<string>(); // To prevent duplicates

  if (!posts || !Array.isArray(posts)) {
    return [];
  }

  const mediaCounts = {
    postsWithMedia: 0,
    postsWithMessageMedia: 0,
    postsWithUrlInText: 0,
    totalMediaItems: 0,
    mediaTypes: {},
  };

  // Image URL regex patterns
  const imageUrlRegex =
    /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|mov)(\?[^\s]*)?)/gi;
  const peachMediaRegex =
    /(https?:\/\/[^\s]+\.(peach\.cool|mxxn\.io|acorn\.mn)[^\s]*)/gi;

  posts.forEach((post, index) => {
    // Process post

    let hasMedia = false;

    // METHOD 1: Check for media in the standard media array
    if (post.media && post.media.length > 0) {
      hasMedia = true;
      mediaCounts.postsWithMedia++;

      post.media.forEach((media) => {
        mediaCounts.totalMediaItems++;
        mediaCounts.mediaTypes[media.type] =
          (mediaCounts.mediaTypes[media.type] || 0) + 1;

        if (media.url && typeof media.url === "string") {
          if (!uniqueUrls.has(media.url)) {
            uniqueUrls.add(media.url);
            mediaUrls.push(media.url);
            debugLog(
              "media",
              `Found media URL in post.media: ${media.url.substring(0, 50)}...`,
            );
          }
        }
      });
    }

    // METHOD 2: Check for media in the message structure (some posts have it here)
    if (post.message && Array.isArray(post.message)) {
      for (const messagePart of post.message) {
        // Check for image type messages
        if (
          (messagePart.type === "image" ||
            messagePart.type === "video" ||
            messagePart.type === "gif") &&
          messagePart.src &&
          typeof messagePart.src === "string"
        ) {
          hasMedia = true;
          mediaCounts.postsWithMessageMedia++;

          if (!uniqueUrls.has(messagePart.src)) {
            uniqueUrls.add(messagePart.src);
            mediaUrls.push(messagePart.src);
            debugLog(
              "media",
              `Found media URL in post.message: ${messagePart.src.substring(0, 50)}...`,
            );
          }
        }

        // Check for image URLs embedded in text content
        if (
          messagePart.type === "text" &&
          messagePart.text &&
          typeof messagePart.text === "string"
        ) {
          // Extract image URLs from text content
          const urlMatches = [
            ...messagePart.text.matchAll(imageUrlRegex),
            ...messagePart.text.matchAll(peachMediaRegex),
          ];

          if (urlMatches.length > 0) {
            hasMedia = true;
            mediaCounts.postsWithUrlInText++;

            urlMatches.forEach((match) => {
              const url = match[0];
              if (!uniqueUrls.has(url)) {
                uniqueUrls.add(url);
                mediaUrls.push(url);
                debugLog(
                  "media",
                  `Found media URL in text content: ${url.substring(0, 50)}...`,
                );
              }
            });
          }
        }
      }
    }

    // METHOD 3: Check for simple string messages with URLs
    if (typeof post.message === "string") {
      // Extract image URLs from string content
      const urlMatches = [
        ...post.message.matchAll(imageUrlRegex),
        ...post.message.matchAll(peachMediaRegex),
      ];

      if (urlMatches.length > 0) {
        hasMedia = true;
        mediaCounts.postsWithUrlInText++;

        urlMatches.forEach((match) => {
          const url = match[0];
          if (!uniqueUrls.has(url)) {
            uniqueUrls.add(url);
            mediaUrls.push(url);
            debugLog(
              "media",
              `Found media URL in string message: ${url.substring(0, 50)}...`,
            );
          }
        });
      }
    }

    // Check if post has media
  });

  // Process complete
  debugLog("media", `Extracted ${mediaUrls.length} unique media URLs`);
  return mediaUrls;
}

/**
 * Generate a filename for a media URL that includes post ID for proper association
 */
export function generateMediaFilename(
  url: string,
  index: number,
  postId?: string,
): string {
  try {
    // Ensure index is a valid number
    if (index === undefined || index === null) {
      debugLog("media", `Invalid index for URL ${url}, using 0 as default`);
      index = 0;
    }

    // Extract filename from URL
    const urlParts = url.split("/");
    let filename = urlParts[urlParts.length - 1];

    // Remove query parameters if any
    filename = filename.split("?")[0];

    // Extract file extension
    const extensionMatch = filename.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "jpg";

    // Generate a consistent filename that includes:
    // 1. post ID (if available) to associate media with specific posts
    // 2. sequential index for uniqueness
    let result;
    if (postId) {
      // Use post ID in the filename to make the association clear
      // Use only the first 8 chars of the ID to keep filenames manageable
      const shortPostId = postId.substring(0, 8);
      const paddedIndex = index.toString().padStart(2, "0");
      result = `post_${shortPostId}_img_${paddedIndex}.${extension}`;
    } else {
      // Fallback to old naming scheme if no post ID
      const paddedIndex = index.toString().padStart(3, "0");
      result = `media_${paddedIndex}.${extension}`;
    }

    debugLog("media", `Generated filename for URL: ${result}`);
    return result;
  } catch (error) {
    // If anything goes wrong, create a safe fallback filename
    const safeIndex = typeof index === "number" ? index : 0;
    const fallbackName = `media_${safeIndex.toString().padStart(3, "0")}.jpg`;
    debugLog(
      "media",
      `Error generating filename, using fallback: ${fallbackName}`,
    );
    return fallbackName;
  }
}

/**
 * Download a media file as a blob
 * CRITICAL FIX: Complete rewrite with simplified approach that uses our working direct proxy
 */
export async function downloadMedia(url: string): Promise<Blob | null> {
  try {
    debugLog("media", `Downloading media from URL: ${url}`);

    // Validate URL before attempting fetch
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return null;
    }

    // CONFIRMED WORKING APPROACH: Use our direct server proxy that returns binary data correctly
    try {
      // Create the proxy URL with the media URL as a query parameter
      const proxyUrl = new URL(
        "/api/media-proxy",
        window.location.origin,
      );
      proxyUrl.searchParams.append("url", url);

      // Download media via direct proxy

      // Use XMLHttpRequest for reliable binary data handling
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Check if we received HTML instead of an image (should never happen with our fixed proxy)
            const contentType = xhr.getResponseHeader("Content-Type") || "";
            if (
              contentType.includes("text/html") ||
              contentType.includes("xhtml")
            ) {
              reject(
                new Error(`Received HTML instead of media: ${contentType}`),
              );
              return;
            }

            // Verify the response is a valid blob with content
            if (xhr.response instanceof Blob && xhr.response.size > 0) {
              resolve(xhr.response);
            } else {
              reject(new Error("Empty or invalid blob received"));
            }
          } else {
            reject(
              new Error(`Media download failed with status ${xhr.status}`),
            );
          }
        };

        xhr.onerror = function () {
          reject(new Error("Network error when downloading media"));
        };

        xhr.ontimeout = function () {
          reject(new Error("Timeout when downloading media"));
        };

        xhr.open("GET", proxyUrl.toString(), true);
        xhr.responseType = "blob";
        xhr.timeout = 30000; // 30 second timeout for large files

        xhr.send();
      });

      if (blob.size === 0) {
        throw new Error("Empty blob received");
      }

      // Log success details
      debugLog(
        "media",
        `Downloaded media: ${blob.size} bytes, type: ${blob.type}`,
      );

      return blob;
    } catch (error) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Create a placeholder image for media
 * This creates an attractive SVG placeholder
 */
export function createPlaceholderImage(errorText: string): Blob {
  debugLog("media", `Creating placeholder image: ${errorText}`);

  // Create a more visually appealing SVG with a peach-themed design
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <defs>
        <linearGradient id="peachGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff98a8" />
          <stop offset="100%" stop-color="#7956b3" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="#f9f9f9" rx="8" ry="8" />
      <rect x="10" y="10" width="280" height="180" fill="url(#peachGradient)" opacity="0.1" rx="4" ry="4" />
      <circle cx="150" cy="80" r="30" fill="#ff98a8" opacity="0.6" />
      <text x="50%" y="140" font-family="Arial" font-size="16" text-anchor="middle" fill="#555">
        Peach Media Placeholder
      </text>
      <text x="50%" y="160" font-family="Arial" font-size="12" text-anchor="middle" fill="#777">
        ${errorText}
      </text>
    </svg>
  `;

  // Convert to Blob
  return new Blob([svgContent], { type: "image/svg+xml" });
}
