import { Show, createSignal, onMount, createEffect } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { fetchStream } from "./api/stream";
import { downloadPeachData as fetchPeachData } from "~/lib/api/download";
import {
  SimplePhotoCanvas,
  PolaroidPhoto,
} from "~/components/SimplePhotoCanvas";
import { analyzePostMedia } from "~/lib/api/debug-peach";
import { createStore, produce } from "solid-js/store";

export default function Dashboard() {
  const { isAuthenticated, user, token } = usePeach();
  const exportContext = useExport();
  const navigate = useNavigate();

  // Get stored username from user context to use as key for user-specific storage
  const getUserName = () => user.data?.username || "unknown";
  const storageKeyPrefix = () => `peach_preserves_${getUserName()}_`;

  // Get stored posts and cursor from localStorage if available
  const getStoredPosts = () => {
    // During initial client render or SSR, return empty array
    if (typeof window === "undefined" || !user.data?.username) return [];

    try {
      const stored = localStorage.getItem(`${storageKeyPrefix()}posts`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("[DASHBOARD] Error loading stored posts:", e);
      return [];
    }
  };

  const getStoredCursor = () => {
    // During initial client render or SSR, return null
    if (typeof window === "undefined" || !user.data?.username) return null;

    return localStorage.getItem(`${storageKeyPrefix()}cursor`);
  };

  // Initialize signals with stored values when available
  const [downloading, setDownloading] = createSignal(false);
  const [downloadComplete, setDownloadComplete] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [posts, setPosts] = createSignal<any[]>(getStoredPosts());
  const [loading, setLoading] = createSignal(posts().length === 0);
  const [cursor, setCursor] = createSignal<string | null>(getStoredCursor());
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [polaroidPhotos, setPolaroidPhotos] = createStore<PolaroidPhoto[]>([]);
  const [showDebugModal, setShowDebugModal] = createSignal(false); // Control debug modal visibility

  // Redirect if not authenticated
  const redirectIfNotAuth = () => {
    if (!isAuthenticated()) {
      console.log("[DASHBOARD] User not authenticated, redirecting to login");
      setTimeout(() => navigate("/"), 0);
      return true;
    }
    return false;
  };

  // Use onMount to ensure we don't redirect during SSR
  onMount(redirectIfNotAuth);

  // Get current values for debugging - safely accessing with optional chaining
  const currentUsername = user.data?.username;
  const currentToken = token();

  // Check credentials after we're sure we're not redirecting
  onMount(() => {
    if (isAuthenticated() && (!currentUsername || !currentToken)) {
      setError("Missing username or token");
      setLoading(false);
    }
  });

  // Load user posts - only called after authentication is confirmed
  const loadPosts = async () => {
    if (!user.data || !isAuthenticated()) {
      console.log(
        "[DASHBOARD] Aborting loadPosts - no user data or not authenticated",
      );
      return;
    }

    try {
      setLoading(true);

      // Get username and token
      const username = user.data.username;
      const streamToken = user.data.streams[0].token;

      // Create form data for server action
      const formData = new FormData();
      formData.append("username", username);
      formData.append("token", streamToken);

      const response = await fetchStream(formData);

      // Extract data from server response
      const data = response.success ? response.data : null;

      // From example: var posts = stream.data.data.posts;
      if (data && data.data && data.data.posts) {
        console.log("[DASHBOARD] Posts metrics:", {
          newPostsCount: data.data.posts.length,
          existingPostsCount: posts().length,
          totalAfterMerge: posts().length + data.data.posts.length,
          cursor: data.data.cursor || "none",
        });

        const postsWithMedia = data.data.posts.filter(
          (p) => p.media && p.media.length > 0,
        );

        // Analyze first 3 posts with media
        for (let i = 0; i < Math.min(3, postsWithMedia.length); i++) {
          analyzePostMedia(postsWithMedia[i], i);
        }

        // Analyze first 3 posts with no media to check message structure
        const postsWithoutMedia = data.data.posts.filter(
          (p) => !p.media || p.media.length === 0,
        );

        for (let i = 0; i < Math.min(3, postsWithoutMedia.length); i++) {
          analyzePostMedia(postsWithoutMedia[i], i);
        }

        // Update state
        setPosts(data.data.posts);
        setCursor(data.data.cursor);

        // Store in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${storageKeyPrefix()}posts`,
            JSON.stringify(data.data.posts),
          );
          if (data.data.cursor) {
            localStorage.setItem(
              `${storageKeyPrefix()}cursor`,
              data.data.cursor,
            );
          }
          console.log("[DASHBOARD] Saved posts and cursor to localStorage");
        }
      } else {
        console.log("[DASHBOARD] No posts found in response");
        setPosts([]);

        // Clear localStorage items
        if (typeof window !== "undefined") {
          localStorage.removeItem(`${storageKeyPrefix()}posts`);
          localStorage.removeItem(`${storageKeyPrefix()}cursor`);
        }
      }
    } catch (err) {
      console.error("[DASHBOARD] Error loading posts:", err);
      setError("Failed to load your posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!cursor() || loadingMore()) return;

    try {
      setLoadingMore(true);

      // Get username, token and cursor
      const username = user.data.username;
      const streamToken = user.data.streams[0].token;
      const currentCursor = cursor();

      // Create form data for server action
      const formData = new FormData();
      formData.append("username", username);
      formData.append("token", streamToken);
      formData.append("cursor", currentCursor);

      // Use server action to avoid CORS
      console.log(
        "[DASHBOARD] Calling server action with cursor:",
        currentCursor,
      );
      const response = await fetchStream(formData);
      console.log(
        "[DASHBOARD] Server action response for more posts:",
        response,
      );

      // Extract data from server response
      const data = response.success ? response.data : null;

      // Same data structure as initial load
      if (data && data.data && data.data.posts) {
        console.log("[DASHBOARD] Additional posts metrics:", {
          newPostsCount: data.data.posts.length,
          existingPostsCount: posts().length,
          totalAfterMerge: posts().length + data.data.posts.length,
          oldestNewPost: data.data.posts.length
            ? new Date(
                data.data.posts[data.data.posts.length - 1].createdTime,
              ).toISOString()
            : "none",
          newestNewPost: data.data.posts.length
            ? new Date(data.data.posts[0].createdTime).toISOString()
            : "none",
          cursor: data.data.cursor || "none",
        });

        // Update posts with new ones appended
        const updatedPosts = [...posts(), ...data.data.posts];
        setPosts(updatedPosts);
        setCursor(data.data.cursor);

        // Update localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${storageKeyPrefix()}posts`,
            JSON.stringify(updatedPosts),
          );
          if (data.data.cursor) {
            localStorage.setItem(
              `${storageKeyPrefix()}cursor`,
              data.data.cursor,
            );
          } else {
            localStorage.removeItem(`${storageKeyPrefix()}cursor`);
          }
          console.log("[DASHBOARD] Updated posts and cursor in localStorage");
        }
      }
    } catch (err) {
      console.error("[DASHBOARD] Error loading more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle download action
  const downloadPeachData = async () => {
    setDownloading(true);
    setError(null);

    try {
      // Pass current username to preserve function for better archive naming
      const username = user.data?.username || "peach-user";

      // Call the download API directly with user data from context
      const archiveFilename = await fetchPeachData(
        token(),
        {
          includeComments: true,
          includeImages: true,
          devMode: true, // Set to true for testing, false for production
        },
        exportContext,
        user.data, // Pass the entire user data from context
      );

      setDownloadComplete(true);

      // After successful download, show completion message for 5 seconds
      setTimeout(() => {
        setDownloadComplete(false);
        // Reset the export context to allow new downloads
        exportContext.resetExport();
      }, 5000);
    } catch (err) {
      console.error("[DASHBOARD] Download error:", err);

      // Show more detailed error to help with debugging
      const errorMessage =
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to download your Peach data. Please try again.";

      setError(errorMessage);

      // Reset the export context on error
      exportContext.resetExport();
    } finally {
      setDownloading(false);
    }
  };

  // Format a post message - EXACT match from example structure
  const formatMessage = (message: any) => {
    if (!message) return "Empty post";

    // EXACT MATCH from example code:
    // post.message[i].type == 'text' && post.message[i].text
    if (Array.isArray(message)) {
      const textParts = [];

      for (let i = 0; i < message.length; i++) {
        if (message[i].type === "text") {
          textParts.push(message[i].text);
        }
      }

      if (textParts.length > 0) {
        return textParts.join("\n\n");
      }
    }

    // Fallback for simple string message
    if (typeof message === "string") {
      return message;
    }

    return "Post with content";
  };

  // Get media from a post if available - following example structure
  const getMediaUrl = (post: any) => {
    if (!post || !post.message) return null;

    // EXACT MATCH from example code:
    // if ( posts[i].message[j].type == 'image')
    if (Array.isArray(post.message)) {
      for (let j = 0; j < post.message.length; j++) {
        if (post.message[j].type === "image") {
          return post.message[j].src;
        }
      }
    }

    return null;
  };

  // Convert API posts to our Polaroid format
  const mapPostsToPolaroids = (posts: any[]): PolaroidPhoto[] => {
    return posts.map((post, index) => {
      // Get stored position if available
      const storedPosition = getStoredPhotoPosition(post.id);
      const storedRotation = getStoredPhotoRotation(post.id);
      const storedFlipped = getStoredPhotoFlipped(post.id);
      const storedPinned = getStoredPhotoPinned(post.id);

      // Random initial position if not stored
      const randomX = storedPosition?.x || Math.random() * 500 - 250;
      const randomY =
        storedPosition?.y || Math.random() * 300 - 100 + index * 30;
      const randomRotation = storedRotation || Math.random() * 20 - 10;

      return {
        id: post.id,
        messageText: formatMessage(post.message),
        mediaUrl: getMediaUrl(post),
        createdTime: post.createdTime,
        likeCount: post.likeCount || 0,
        commentCount: post.commentCount || 0,
        position: { x: randomX, y: randomY },
        rotation: randomRotation,
        zIndex: posts.length - index,
        isFlipped: storedFlipped || false,
        isPinned: storedPinned || false,
      };
    });
  };

  // Storage helper functions for individual photo properties
  const getStoredPhotoPosition = (id: string) => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(
        `${storageKeyPrefix()}photo_${id}_position`,
      );
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("[DASHBOARD] Error loading stored photo position:", e);
      return null;
    }
  };

  const getStoredPhotoRotation = (id: string) => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(
      `${storageKeyPrefix()}photo_${id}_rotation`,
    );
    return stored ? parseFloat(stored) : null;
  };

  const getStoredPhotoFlipped = (id: string) => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(`${storageKeyPrefix()}photo_${id}_flipped`) ===
      "true"
    );
  };

  const getStoredPhotoPinned = (id: string) => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem(`${storageKeyPrefix()}photo_${id}_pinned`) === "true"
    );
  };

  // Handle photo interaction events
  const handlePhotoFlip = (id: string) => {
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        photo.isFlipped = !photo.isFlipped;
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_flipped`,
            photo.isFlipped ? "true" : "false",
          );
        }
      }),
    );
  };

  const handlePhotoPin = (id: string) => {
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        photo.isPinned = !photo.isPinned;
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_pinned`,
            photo.isPinned ? "true" : "false",
          );
        }
      }),
    );
  };

  const handlePhotoMove = (id: string, position: { x: number; y: number }) => {
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        // Bring moved photo to front
        const newZIndex =
          Math.max(...polaroidPhotos.map((p) => p.zIndex || 0)) + 1;
        photo.position = position;
        photo.zIndex = newZIndex;
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_position`,
            JSON.stringify(position),
          );
        }
      }),
    );
  };

  const handlePhotoRotate = (id: string, rotation: number) => {
    setPolaroidPhotos(
      (p) => p.id === id,
      produce((photo) => {
        photo.rotation = rotation;
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_rotation`,
            rotation.toString(),
          );
        }
      }),
    );
  };

  // Update polaroids when posts change - ensure unique posts only
  createEffect(() => {
    const currentPosts = posts();
    if (currentPosts.length > 0) {
      // Filter out duplicate posts by id
      const uniquePosts = [];
      const seenIds = new Set();
      for (const post of currentPosts) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          uniquePosts.push(post);
        } else {
          console.log(`Skipping duplicate post with id ${post.id}`);
        }
      }
      console.log(
        `Filtered ${currentPosts.length - uniquePosts.length} duplicate posts`,
      );
      setPolaroidPhotos(mapPostsToPolaroids(uniquePosts));
    }
  });

  // Load posts on mount if needed
  onMount(() => {
    // Check authentication first
    if (!isAuthenticated()) {
      console.log("[DASHBOARD] Not authenticated, skipping post loading");
      return;
    }

    // Only load posts if we don't have any stored
    if (posts().length === 0) {
      console.log("[DASHBOARD] No stored posts found, loading from API");
      // Small delay to ensure auth is fully processed
      setTimeout(() => loadPosts(), 100);
    } else {
      const storedPosts = posts();

      setPolaroidPhotos(mapPostsToPolaroids(storedPosts));
      setLoading(false);
    }
  });

  // Simplified render function for client-side only content
  // This approach completely avoids hydration mismatches by using clientOnly signal
  const [clientOnly, setClientOnly] = createSignal(false);

  // Only set clientOnly to true after mount on client
  onMount(() => {
    // Small delay to ensure client-side render is complete
    setTimeout(() => setClientOnly(true), 100);
  });

  return (
    <div class="peach-preserve">
      <Title>Peach Preserves</Title>
      <header class="header">
        <div class="logo">
          <img src="/peachdotcool.png" alt="Peach" class="logo-img" />
          <span>Peach Preserves</span>
        </div>
      </header>

      <main class="interactive-canvas">
        {/* Only render dynamic content on client */}
        {clientOnly() ? (
          <>
            {/* Download complete modal */}
            {downloadComplete() && (
              <div class="download-complete">
                <div class="polaroid">
                  <div class="polaroid-content success-content">
                    <div class="success-icon">✓</div>
                  </div>
                  <div class="polaroid-caption">
                    Downloaded! Your memories have been safely archived.
                  </div>
                </div>
              </div>
            )}

            {/* Download progress modal */}
            {(exportContext.exportData.status === "exporting" ||
              exportContext.exportData.status === "preparing") && (
              <div class="download-progress" role="region" aria-live="polite">
                <div class="progress-container">
                  <div class="progress-header">
                    <h3>Downloading Your Peach Data</h3>
                  </div>

                  <div class="progress-details">
                    <div class="progress-activity">
                      {exportContext.exportData.progress.currentActivity}
                    </div>

                    <div class="progress-bar-wrapper">
                      <div
                        class="progress-bar"
                        style={{
                          width: `${exportContext.exportData.progress.percentage}%`,
                        }}
                        role="progressbar"
                        aria-valuenow={
                          exportContext.exportData.progress.percentage
                        }
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>

                    <div class="progress-stats">
                      <span class="progress-percentage">
                        {Math.round(
                          exportContext.exportData.progress.percentage,
                        )}
                        %
                      </span>
                      {exportContext.exportData.progress.completedItems > 0 && (
                        <span class="progress-count">
                          {exportContext.exportData.progress.completedItems} /{" "}
                          {exportContext.exportData.progress.totalItems}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error modal - Shows when export status is error */}
            {exportContext.exportData.status === "error" &&
              exportContext.exportData.error && (
                <div class="error-modal">
                  <div class="error-container">
                    <div class="error-header">
                      <h3>Download Failed</h3>
                    </div>
                    <div class="error-message">
                      {exportContext.exportData.error.message}
                    </div>
                    <div class="error-actions">
                      <button
                        onClick={() => exportContext.retryExport()}
                        class="retry-button"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => exportContext.resetExport()}
                        class="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* Debug Modal - only visible in development mode */}
            {showDebugModal() && import.meta.env.DEV && (
              <div class="debug-modal">
                <div class="debug-container">
                  <div class="debug-header">
                    <h3>📊 Export Debug Information</h3>
                    <button
                      onClick={() => setShowDebugModal(false)}
                      class="close-button"
                    >
                      ×
                    </button>
                  </div>

                  <div class="debug-content">
                    <div class="debug-section">
                      <h4>Export State</h4>
                      <pre>
                        {JSON.stringify(
                          {
                            status: exportContext.exportData.status,
                            jobId: exportContext.exportData.jobId,
                            startTime: exportContext.exportData.startTime,
                            completedTime:
                              exportContext.exportData.completedTime,
                            downloadUrl: exportContext.exportData.downloadUrl,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>

                    <div class="debug-section">
                      <h4>Progress Data</h4>
                      <pre>
                        {JSON.stringify(
                          {
                            percentage:
                              exportContext.exportData.progress.percentage,
                            phase: exportContext.exportData.progress.phase,
                            currentActivity:
                              exportContext.exportData.progress.currentActivity,
                            completedItems:
                              exportContext.exportData.progress.completedItems,
                            totalItems:
                              exportContext.exportData.progress.totalItems,
                            estimatedTimeRemaining:
                              exportContext.exportData.progress
                                .estimatedTimeRemaining,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>

                    <div class="debug-section">
                      <h4>Component State</h4>
                      <pre>
                        {JSON.stringify(
                          {
                            downloading: downloading(),
                            downloadComplete: downloadComplete(),
                            postsCount: posts().length,
                            error: error(),
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>

                    <div class="debug-actions">
                      <button onClick={() => exportContext.resetExport()}>
                        Reset Export
                      </button>
                      <button onClick={() => setDownloadComplete(true)}>
                        Show Complete Modal
                      </button>
                      <button onClick={() => console.log(exportContext)}>
                        Log Context to Console
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error notification */}
            {error() && (
              <div class="error-note">
                <p>{error()}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {/* Main content */}
            {loading() ? (
              <div class="loading">
                <div class="loading-spinner"></div>
                <p>Gathering your peachy memories...</p>
              </div>
            ) : (
              <>
                {polaroidPhotos.length === 0 ? (
                  <div class="no-posts">
                    <p>No posts found. Your peaches are still growing! 🌱</p>
                  </div>
                ) : (
                  <>
                    <SimplePhotoCanvas
                      photos={polaroidPhotos}
                      onPhotoFlip={handlePhotoFlip}
                      onPhotoPin={handlePhotoPin}
                      onPhotoMove={handlePhotoMove}
                      onPhotoRotate={handlePhotoRotate}
                    />

                    <div class="preserve-button-container">
                      <button
                        onClick={downloadPeachData}
                        class="preserve-button"
                        disabled={
                          // Only disable during active processes
                          exportContext.exportData.status === "preparing" ||
                          exportContext.exportData.status === "exporting" ||
                          downloading()
                        }
                        aria-busy={
                          exportContext.exportData.status === "exporting" ||
                          downloading()
                        }
                      >
                        {exportContext.exportData.status === "preparing" ||
                        exportContext.exportData.status === "exporting"
                          ? "Downloading..."
                          : "Download my Data"}
                      </button>

                      {/* Debug button - only visible in development mode */}
                      {import.meta.env.DEV && (
                        <button
                          onClick={() => setShowDebugModal((prev) => !prev)}
                          class="debug-button"
                        >
                          🐛 Debug
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          // Static loading state during SSR and initial client render
          <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        .peach-preserve {
          background-color: #f5f0e5; /* Cork board color */
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .interactive-canvas {
          width: 100%;
          height: calc(100vh - 60px); /* Full height minus header */
          position: relative;
          overflow: hidden;
        }

        .header {
          background-color: var(--peach-primary);
          padding: 0.75rem 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 1000;
          height: 60px;
        }

        .logout-link {
          color: white;
          text-decoration: none;
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          transition: all 0.3s ease;
          opacity: 0.8;
        }

        .logout-link:hover {
          opacity: 1;
          background-color: rgba(255, 255, 255, 0.2);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: bold;
          font-size: 1.25rem;
          color: var(--peach-dark);
          font-family: 'Nunito', sans-serif;
        }

        .logo-img {
          height: 42px;
          width: auto;
          background-color: transparent;
        }

        /* Preserve button */
        .preserve-button-container {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
        }

        .preserve-button {
          background-color: var(--peach-primary);
          color: var(--peach-dark);
          border: 2px solid var(--peach-dark);
          padding: 1rem 2.5rem;
          border-radius: 2rem;
          font-size: 1.25rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          font-family: 'Nunito', sans-serif;
        }

        .preserve-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          background-color: var(--peach-secondary);
          color: white;
        }

        .preserve-button:disabled {
          background-color: rgba(255, 221, 221, 0.6);
          border-color: rgba(95, 56, 192, 0.4);
          color: rgba(95, 56, 192, 0.6);
          cursor: not-allowed;
          transform: none;
        }

        /* Purple background with light purple spots */
        .interactive-canvas {
          background-color: var(--canvas-background);
          background-image:
            radial-gradient(var(--canvas-spots) 8%, transparent 8%),
            radial-gradient(var(--canvas-spots) 8%, transparent 8%);
          background-size: 30px 30px;
          background-position: 0 0, 15px 15px;
        }

        /* Add subtle texture */
        .interactive-canvas::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('data:image/png;base64,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');
          opacity: 0.03;
          pointer-events: none;
        }

        /* Download complete modal */
        .download-complete {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          background: rgba(0, 0, 0, 0.7);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        }

        .download-complete .polaroid {
          width: 300px;
          height: auto;
          transform: rotate(-3deg) !important;
          position: relative;
          background: white;
          padding: 15px;
          padding-bottom: 40px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
          animation: dropIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border-radius: 3px;
        }

        .download-complete .polaroid-content {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          width: 100%;
          background-color: #f0fff4; /* Light green success background */
          border: 1px solid #e0e0e0;
        }

        .success-icon {
          font-size: 5rem;
          color: #2ecc71; /* Bright green checkmark */
          animation: pulse 1s infinite alternate;
        }

        /* Download progress modal */
        .download-progress {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          background: rgba(0, 0, 0, 0.7);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        }

        .progress-container {
          width: 90%;
          max-width: 450px;
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          animation: slideIn 0.4s ease-out;
        }

        .progress-header {
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .progress-header h3 {
          color: var(--peach-secondary);
          font-size: 1.5rem;
          margin: 0;
        }

        .progress-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .progress-activity {
          text-align: center;
          font-size: 0.9rem;
          color: #666;
          min-height: 1.4em;
        }

        .progress-bar-wrapper {
          height: 12px;
          background-color: #f0f0f0;
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background-color: var(--peach-primary);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #666;
        }

        /* Error modal */
        .error-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          background: rgba(0, 0, 0, 0.7);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        }

        .error-container {
          width: 90%;
          max-width: 450px;
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }

        .error-header {
          margin-bottom: 1rem;
          text-align: center;
        }

        .error-header h3 {
          color: #e74c3c;
          font-size: 1.5rem;
          margin: 0;
        }

        .error-message {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .error-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .retry-button, .cancel-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button {
          background-color: var(--peach-secondary);
          color: white;
        }

        .retry-button:hover {
          background-color: #6745a0;
        }

        .cancel-button {
          background-color: #f5f5f5;
          color: #666;
        }

        .cancel-button:hover {
          background-color: #e0e0e0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes dropIn {
          0% {
            transform: rotate(-3deg) translateY(-50px);
            opacity: 0;
          }
          100% {
            transform: rotate(-3deg) translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideIn {
          0% {
            transform: translateY(-30px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }

        /* Error notification */
        .error-note {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background-color: #ffebeb;
          border-left: 4px solid var(--peach-secondary);
          padding: 1rem 2rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 1000;
          max-width: 90%;
        }

        .error-note button {
          background: none;
          border: none;
          color: var(--peach-secondary);
          font-weight: bold;
          cursor: pointer;
          padding: 0.5rem;
        }

        /* Loading indicator */
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid var(--peach-accent);
          border-top: 5px solid var(--peach-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        /* No longer needed - removed load more button */

        .no-posts {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          margin: 4rem auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Debug modal and button styles */
        .debug-button {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-family: monospace;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .debug-button:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        .debug-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }

        .debug-container {
          background: #f5f5f5;
          border-radius: 6px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #333;
          color: white;
        }

        .debug-header h3 {
          margin: 0;
          font-family: monospace;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        .debug-content {
          padding: 20px;
        }

        .debug-section {
          margin-bottom: 20px;
          background: white;
          border-radius: 4px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .debug-section h4 {
          margin-top: 0;
          margin-bottom: 10px;
          font-family: monospace;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }

        .debug-section pre {
          margin: 0;
          padding: 10px;
          background: #f8f8f8;
          border-radius: 3px;
          overflow-x: auto;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.4;
        }

        .debug-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .debug-actions button {
          background: #555;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-family: monospace;
        }

        .debug-actions button:hover {
          background: #333;
        }

        @media (max-width: 768px) {
          .header {
            padding: 0.5rem 1rem;
          }

          .logo-img {
            height: 30px;
          }

          .download-button {
            font-size: 0.8rem;
            padding: 0.5rem 1rem;
          }

          .header-buttons {
            gap: 0.5rem;
          }

          .debug-container {
            width: 95%;
            max-height: 95vh;
          }

          .debug-section pre {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
