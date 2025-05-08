import { Show, createSignal, onMount, createEffect } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { fetchStream } from "./api/stream";
import { downloadPeachData as fetchPeachData } from "~/lib/api/download";
import { SimplePhotoCanvas, PolaroidPhoto } from "~/components/SimplePhotoCanvas";
import { createStore, produce } from "solid-js/store";

export default function Dashboard() {
  const { isAuthenticated, user, token } = usePeach();
  const navigate = useNavigate();

  // Get stored username from user context to use as key for user-specific storage
  const getUserName = () => user.data?.username || 'unknown';
  const storageKeyPrefix = () => `peach_preserves_${getUserName()}_`;

  // Get stored posts and cursor from localStorage if available
  const getStoredPosts = () => {
    // During initial client render or SSR, return empty array
    if (typeof window === 'undefined' || !user.data?.username) return [];

    try {
      const stored = localStorage.getItem(`${storageKeyPrefix()}posts`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[DASHBOARD] Error loading stored posts:', e);
      return [];
    }
  };

  const getStoredCursor = () => {
    // During initial client render or SSR, return null
    if (typeof window === 'undefined' || !user.data?.username) return null;

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
      console.log('[DASHBOARD] User not authenticated, redirecting to login');
      setTimeout(() => navigate('/'), 0);
      return true;
    }
    return false;
  };

  // Use onMount to ensure we don't redirect during SSR
  onMount(redirectIfNotAuth);

  // Get current values for debugging - safely accessing with optional chaining
  const currentUsername = user.data?.username;
  const currentToken = token();

  console.log('[DEBUG] Username:', currentUsername);
  console.log('[DEBUG] Token:', currentToken ? 'present' : 'missing');

  // Check credentials after we're sure we're not redirecting
  onMount(() => {
    if (isAuthenticated() && (!currentUsername || !currentToken)) {
      setError('Missing username or token');
      setLoading(false);
    }
  });

  // Load user posts - only called after authentication is confirmed
  const loadPosts = async () => {
    if (!user.data || !isAuthenticated()) {
      console.log('[DASHBOARD] Aborting loadPosts - no user data or not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Get username and token
      const username = user.data.username;
      const streamToken = user.data.streams[0].token;

      // Create form data for server action
      const formData = new FormData();
      formData.append('username', username);
      formData.append('token', streamToken);

      // Use server action to avoid CORS
      console.log('[DASHBOARD] Calling server action with username:', username);
      const response = await fetchStream(formData);
      console.log('[DASHBOARD] Server action response:', response);

      // Extract data from server response
      const data = response.success ? response.data : null;

      // From example: var posts = stream.data.data.posts;
      if (data && data.data && data.data.posts) {
        console.log('[DASHBOARD] Posts found:', data.data.posts.length);

        // Update state
        setPosts(data.data.posts);
        setCursor(data.data.cursor);

        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${storageKeyPrefix()}posts`, JSON.stringify(data.data.posts));
          if (data.data.cursor) {
            localStorage.setItem(`${storageKeyPrefix()}cursor`, data.data.cursor);
          }
          console.log('[DASHBOARD] Saved posts and cursor to localStorage');
        }
      } else {
        console.log('[DASHBOARD] No posts found in response');
        setPosts([]);

        // Clear localStorage items
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`${storageKeyPrefix()}posts`);
          localStorage.removeItem(`${storageKeyPrefix()}cursor`);
        }
      }
    } catch (err) {
      console.error('[DASHBOARD] Error loading posts:', err);
      setError('Failed to load your posts. Please try again.');
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
      formData.append('username', username);
      formData.append('token', streamToken);
      formData.append('cursor', currentCursor);

      // Use server action to avoid CORS
      console.log('[DASHBOARD] Calling server action with cursor:', currentCursor);
      const response = await fetchStream(formData);
      console.log('[DASHBOARD] Server action response for more posts:', response);

      // Extract data from server response
      const data = response.success ? response.data : null;

      // Same data structure as initial load
      if (data && data.data && data.data.posts) {
        console.log('[DASHBOARD] Additional posts found:', data.data.posts.length);

        // Update posts with new ones appended
        const updatedPosts = [...posts(), ...data.data.posts];
        setPosts(updatedPosts);
        setCursor(data.data.cursor);

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${storageKeyPrefix()}posts`, JSON.stringify(updatedPosts));
          if (data.data.cursor) {
            localStorage.setItem(`${storageKeyPrefix()}cursor`, data.data.cursor);
          } else {
            localStorage.removeItem(`${storageKeyPrefix()}cursor`);
          }
          console.log('[DASHBOARD] Updated posts and cursor in localStorage');
        }
      }
    } catch (err) {
      console.error('[DASHBOARD] Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle preserve/download action
  const downloadPeachData = async () => {
    setDownloading(true);
    setError(null);

    try {
      // Pass current username to preserve function for better archive naming
      const username = user.data?.username || 'peach-user';

      console.log('[DASHBOARD] Starting preservation process for user:', username);

      // Call the download API with full options
      const archiveFilename = await fetchPeachData(token(), {
        includeComments: true,
        includeImages: true
      });

      console.log('[DASHBOARD] Archive created:', archiveFilename);
      setDownloadComplete(true);

      // In a real implementation, we would trigger the actual download here
      // For now, we just update the UI to show completion

      // After 3 seconds, hide the completion message
      setTimeout(() => {
        setDownloadComplete(false);
      }, 5000);
    } catch (err) {
      console.error('[DASHBOARD] Preservation error:', err);
      setError('Failed to preserve your Peach data. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Format a post message - EXACT match from example structure
  const formatMessage = (message: any) => {
    if (!message) return 'Empty post';

    // EXACT MATCH from example code:
    // post.message[i].type == 'text' && post.message[i].text
    if (Array.isArray(message)) {
      const textParts = [];

      for (let i = 0; i < message.length; i++) {
        if (message[i].type === 'text') {
          textParts.push(message[i].text);
        }
      }

      if (textParts.length > 0) {
        return textParts.join('\n\n');
      }
    }

    // Fallback for simple string message
    if (typeof message === 'string') {
      return message;
    }

    return 'Post with content';
  };

  // Get media from a post if available - following example structure
  const getMediaUrl = (post: any) => {
    if (!post || !post.message) return null;

    // EXACT MATCH from example code:
    // if ( posts[i].message[j].type == 'image')
    if (Array.isArray(post.message)) {
      for (let j = 0; j < post.message.length; j++) {
        if (post.message[j].type === 'image') {
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
      const randomY = storedPosition?.y || Math.random() * 300 - 100 + (index * 30);
      const randomRotation = storedRotation || (Math.random() * 20 - 10);

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
        isPinned: storedPinned || false
      };
    });
  };

  // Storage helper functions for individual photo properties
  const getStoredPhotoPosition = (id: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(`${storageKeyPrefix()}photo_${id}_position`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('[DASHBOARD] Error loading stored photo position:', e);
      return null;
    }
  };

  const getStoredPhotoRotation = (id: string) => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(`${storageKeyPrefix()}photo_${id}_rotation`);
    return stored ? parseFloat(stored) : null;
  };

  const getStoredPhotoFlipped = (id: string) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`${storageKeyPrefix()}photo_${id}_flipped`) === 'true';
  };

  const getStoredPhotoPinned = (id: string) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`${storageKeyPrefix()}photo_${id}_pinned`) === 'true';
  };

  // Handle photo interaction events
  const handlePhotoFlip = (id: string) => {
    setPolaroidPhotos(
      p => p.id === id,
      produce(photo => {
        photo.isFlipped = !photo.isFlipped;
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_flipped`,
            photo.isFlipped ? 'true' : 'false'
          );
        }
      })
    );
  };

  const handlePhotoPin = (id: string) => {
    setPolaroidPhotos(
      p => p.id === id,
      produce(photo => {
        photo.isPinned = !photo.isPinned;
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_pinned`,
            photo.isPinned ? 'true' : 'false'
          );
        }
      })
    );
  };

  const handlePhotoMove = (id: string, position: { x: number; y: number }) => {
    setPolaroidPhotos(
      p => p.id === id,
      produce(photo => {
        // Bring moved photo to front
        const newZIndex = Math.max(...polaroidPhotos.map(p => p.zIndex || 0)) + 1;
        photo.position = position;
        photo.zIndex = newZIndex;
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_position`,
            JSON.stringify(position)
          );
        }
      })
    );
  };

  const handlePhotoRotate = (id: string, rotation: number) => {
    setPolaroidPhotos(
      p => p.id === id,
      produce(photo => {
        photo.rotation = rotation;
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `${storageKeyPrefix()}photo_${id}_rotation`,
            rotation.toString()
          );
        }
      })
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
      console.log(`Filtered ${currentPosts.length - uniquePosts.length} duplicate posts`);
      setPolaroidPhotos(mapPostsToPolaroids(uniquePosts));
    }
  });

  // Load posts on mount if needed
  onMount(() => {
    // Check authentication first
    if (!isAuthenticated()) {
      console.log('[DASHBOARD] Not authenticated, skipping post loading');
      return;
    }

    // Only load posts if we don't have any stored
    if (posts().length === 0) {
      console.log('[DASHBOARD] No stored posts found, loading from API');
      // Small delay to ensure auth is fully processed
      setTimeout(() => loadPosts(), 100);
    } else {
      console.log('[DASHBOARD] Using stored posts:', posts().length);
      setPolaroidPhotos(mapPostsToPolaroids(posts()));
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
          <span>Preserves</span>
        </div>
        <a href="/logout" class="logout-link">Logout</a>
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
                    Preserved! Your memories have been safely archived.
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
                        disabled={downloading()}
                      >
                        {downloading() ? 'Preserving...' : 'Preserve'}
                      </button>
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
          justify-content: space-between;
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
          color: white;
        }

        .logo-img {
          height: 42px;
          width: auto;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
          color: white;
          border: none;
          padding: 1rem 3rem;
          border-radius: 2rem;
          font-size: 1.25rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .preserve-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          background-color: var(--peach-secondary);
        }

        .preserve-button:disabled {
          background-color: rgba(255, 154, 139, 0.6);
          cursor: not-allowed;
          transform: none;
        }

        /* Cork board texture for the background */
        .interactive-canvas {
          background-image:
            radial-gradient(rgba(160, 120, 90, 0.1) 15%, transparent 16%),
            radial-gradient(rgba(160, 120, 90, 0.1) 15%, transparent 16%);
          background-size: 10px 10px;
          background-position: 0 0, 5px 5px;
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

        /* Preservation complete modal */
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
        }
      `}</style>
    </div>
  );
}
