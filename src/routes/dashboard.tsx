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
import { createStore, produce } from "solid-js/store";
import styles from './dashboard.module.css';

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

  // Also check when auth state changes
  createEffect(() => {
    if (!isAuthenticated()) {
      console.log("[DASHBOARD] Auth state changed, user not authenticated");
      navigate("/");
    }
  });

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

        // Check for posts with no media to track message structure
        const postsWithoutMedia = data.data.posts.filter(
          (p) => !p.media || p.media.length === 0,
        );

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
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>
      <header class={styles.header}>
        <div class={styles.logo}>
          <img src="/peachdotcool.png" alt="Peach" class={styles["logo-img"]} />
          <span>Peach Preserves</span>
        </div>
      </header>

      <main class={styles["interactive-canvas"]}>
        {/* Only render dynamic content on client */}
        {clientOnly() ? (
          <>
            {/* Download complete modal */}
            {downloadComplete() && (
              <div class={styles["download-complete"]}>
                <div class={styles.polaroid}>
                  <div
                    class={`${styles["polaroid-content"]} ${styles["success-content"]}`}
                  >
                    <div class={styles["success-icon"]}>✓</div>
                  </div>
                  <div class={styles["polaroid-caption"]}>
                    Downloaded! Your memories have been safely archived.
                  </div>
                </div>
              </div>
            )}

            {/* Download progress modal - Polaroid style */}
            {(exportContext.exportData.status === "exporting" ||
              exportContext.exportData.status === "preparing") && (
              <div
                class={styles["download-progress"]}
                role="region"
                aria-live="polite"
              >
                <div
                  class={`${styles.polaroid} ${styles["progress-polaroid"]}`}
                >
                  <div class={styles["polaroid-image-area"]}>
                    <div
                      class={`${styles["polaroid-photo"]} ${styles["progress-content"]}`}
                    >
                      <div class={styles["progress-header"]}>
                        <h3>Downloading Your Peach Data</h3>
                      </div>

                      <div class={styles["progress-details"]}>
                        <div class={styles["progress-activity"]}>
                          {exportContext.exportData.progress.currentActivity}
                        </div>

                        <div class={styles["progress-bar-wrapper"]}>
                          <div
                            class={styles["progress-bar"]}
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

                        <div class={styles["progress-stats"]}>
                          <span class={styles["progress-percentage"]}>
                            {Math.round(
                              exportContext.exportData.progress.percentage,
                            )}
                            %
                          </span>
                          {exportContext.exportData.progress.completedItems >
                            0 && (
                            <span class={styles["progress-count"]}>
                              {exportContext.exportData.progress.completedItems}{" "}
                              / {exportContext.exportData.progress.totalItems}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div class={styles["polaroid-grit-overlay"]} />
                  </div>
                  <div class={styles["polaroid-caption"]}>
                    <div class={styles["caption-content"]}>
                      <span class={styles["polaroid-handwritten"]}>
                        Preserving your peaches
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error modal - Shows when export status is error - Polaroid style */}
            {exportContext.exportData.status === "error" &&
              exportContext.exportData.error && (
                <div class={styles["error-modal"]}>
                  <div class={`${styles.polaroid} ${styles["error-polaroid"]}`}>
                    <div class={styles["polaroid-image-area"]}>
                      <div
                        class={`${styles["polaroid-photo"]} ${styles["error-content"]}`}
                      >
                        <div class={styles["error-header"]}>
                          <h3>Download Failed</h3>
                        </div>
                        <div class={styles["error-message"]}>
                          {exportContext.exportData.error.message}
                        </div>
                        <div class={styles["error-actions"]}>
                          <button
                            onClick={() => exportContext.retryExport()}
                            class={styles["retry-button"]}
                          >
                            Try Again
                          </button>
                          <button
                            onClick={() => exportContext.resetExport()}
                            class={styles["cancel-button"]}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div class={styles["polaroid-grit-overlay"]} />
                    </div>
                    <div class={styles["polaroid-caption"]}>
                      <div class={styles["caption-content"]}>
                        <span class={styles["polaroid-handwritten"]}>
                          Oops! Something went wrong
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}



            {/* Error notification */}
            {error() && (
              <div class={styles["error-note"]}>
                <p>{error()}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {/* Main content */}
            {loading() ? (
              <div class={styles.loading}>
                <div class={styles["loading-spinner"]}></div>
                <p>Gathering your peachy memories...</p>
              </div>
            ) : (
              <>
                {polaroidPhotos.length === 0 ? (
                  <div class={styles["no-posts"]}>
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

                    <div class={styles["preserve-button-container"]}>
                      <button
                        onClick={downloadPeachData}
                        class={styles["preserve-button"]}
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


                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
        // Static loading state during SSR and initial client render
        <div class={styles.loading}>
          <div class={styles["loading-spinner"]}></div>
          <p>Loading...</p>
        </div>
      )}
    </main>
    </div>
  );
}
