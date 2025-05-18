import { Show, createSignal, onMount, createEffect } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { fetchStream } from "./api/stream";
import { downloadPeachData as fetchPeachData } from "~/lib/api/download";
import styles from './dashboard.module.css';
import { PolaroidPhoto } from "~/types/polaroid";
import {
  retrievePosts,
  retrieveCursor,
  storePosts,
  storeCursor,
  transformPostsToPolaroids
} from "~/utils/storage";

// Extracted components
import { PeachHeader } from "~/components/PeachHeader";
import { DownloadCompleteModal } from "~/components/DownloadCompleteModal";
import { ExportProgressModal } from "~/components/ExportProgressModal";
import { ExportErrorModal } from "~/components/ExportErrorModal";
import { ErrorNotification } from "~/components/ErrorNotification";
import { LoadingState } from "~/components/LoadingState";
import { EmptyStateMessage } from "~/components/EmptyStateMessage";
import { PeachPhotoCanvas } from "~/components/PeachPhotoCanvas";
import { DownloadButton } from "~/components/DownloadButton";

export default function Dashboard() {
  const { isAuthenticated, user, token, logout } = usePeach();
  const exportContext = useExport();
  const navigate = useNavigate();

  // Handle logout action
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Get stored username from user context to use as key for user-specific storage
  const getUserName = () => user.data?.username || "unknown";
  const storageKeyPrefix = () => `peach_preserves_${getUserName()}_`;

  // Initialize signals with stored values when available - using storage utility
  const [downloading, setDownloading] = createSignal(false);
  const [downloadComplete, setDownloadComplete] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [posts, setPosts] = createSignal<any[]>(() => {
    if (!user.data?.username) return [];
    return retrievePosts({ username: user.data.username });
  });
  const [loading, setLoading] = createSignal(posts().length === 0);
  const [cursor, setCursor] = createSignal<string | null>(() => {
    if (!user.data?.username) return null;
    return retrieveCursor({ username: user.data.username });
  });
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [polaroidPhotos, setPolaroidPhotos] = createSignal<PolaroidPhoto[]>([]);
  const [canvasWidth, setCanvasWidth] = createSignal(0);
  const [canvasHeight, setCanvasHeight] = createSignal(0);

  // Route identifier
  const route = "dashboard";

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
    
    // Set canvas dimensions
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight - 60); // Subtract header height
    
    // Add window resize handler
    const handleResize = () => {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight - 60); // Subtract header height
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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

        // Store in localStorage using utility
        if (user.data?.username) {
          storePosts(data.data.posts, { username: user.data.username });
          storeCursor(data.data.cursor, { username: user.data.username });
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
      
      // Transform posts to polaroids using the storage utility
      setPolaroidPhotos(transformPostsToPolaroids(uniquePosts, {
        route,
        username: getUserName()
      }));
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
      
      // Transform posts to polaroids using the storage utility
      setPolaroidPhotos(transformPostsToPolaroids(storedPosts, {
        route,
        username: getUserName()
      }));
      
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
      <PeachHeader onLogout={handleLogout} />

      <main class={styles["interactive-canvas"]}>
        {/* Only render dynamic content on client */}
        {clientOnly() ? (
          <>
            <DownloadCompleteModal visible={downloadComplete()} />
            <ExportProgressModal />
            <ExportErrorModal />
            <ErrorNotification message={error()} onDismiss={() => setError(null)} />

            {/* Main content */}
            {loading() ? (
              <LoadingState message="Gathering your peachy memories..." />
            ) : (
              <>
                {polaroidPhotos().length === 0 ? (
                  <EmptyStateMessage />
                ) : (
                  <>
                    <PeachPhotoCanvas
                      photos={polaroidPhotos()}
                      username={getUserName()}
                      route={route}
                      canvasWidth={canvasWidth()}
                      canvasHeight={canvasHeight()}
                    />

                    <DownloadButton
                      onClick={downloadPeachData}
                      downloading={downloading()}
                    />
                  </>
                )}
              </>
            )}
          </>
        ) : (
          // Static loading state during SSR and initial client render
          <LoadingState message="Loading..." />
        )}
      </main>
    </div>
  );
}