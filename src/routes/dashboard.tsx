import { createSignal, onMount, createEffect, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";

import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";

import { fetchStream } from "./api/stream";
import { downloadPeachData as fetchPeachData } from "~/lib/api/download";
import styles from "./dashboard.module.css";
import { PolaroidPhoto } from "~/types/polaroid";
import {
  retrievePosts,
  retrieveCursor,
  storePosts,
  storeCursor,
  transformPostsToPolaroids,
  getCanvasViewport,
  saveCanvasViewport,
  savePhotoRotation,
} from "~/utils/storage";

// Component imports
import { DownloadCompleteModal } from "~/components/DownloadCompleteModal";
import { ExportProgressModal } from "~/components/ExportProgressModal";
import { ExportErrorModal } from "~/components/ExportErrorModal";
import { ErrorNotification } from "~/components/ErrorNotification";
import { EmptyStateMessage } from "~/components/EmptyStateMessage";
import { DownloadButton } from "~/components/DownloadButton";
import { Polaroid } from "~/components/Polaroid";

// InfiniteCanvas imports
import { InfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { CanvasItem } from "~/primitives/infiniteCanvas/CanvasItem";
import { useInfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { createDraggable, DraggableItem } from "~/primitives/createDraggable";
import {
  Vector,
  useTransform,
  Point,
} from "~/primitives/infiniteCanvas/TransformContext";

export default function Dashboard() {
  const { isAuthenticated, user, token, logout } = usePeach();
  const exportContext = useExport();
  const navigate = useNavigate();

  // Route identifier
  const route = "dashboard";

  // Get stored username from user context to use as key for user-specific storage
  const getUserName = () => user.data?.username || "unknown";
  const storageKeyPrefix = () => `peach_preserves_${getUserName()}_`;

  // Initialize signals with stored values when available
  const [downloading, setDownloading] = createSignal(false);
  const [downloadComplete, setDownloadComplete] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [posts, setPosts] = createSignal<any[]>(() => {
    if (!user.data?.username) return [];
    return retrievePosts({ username: user.data.username });
  });
  const [cursor, setCursor] = createSignal<string | null>(() => {
    if (!user.data?.username) return null;
    return retrieveCursor({ username: user.data.username });
  });
  const [polaroidPhotos, setPolaroidPhotos] = createStore<
    (PolaroidPhoto & DraggableItem)[]
  >([]);
  const [canvasWidth, setCanvasWidth] = createSignal(0);
  const [canvasHeight, setCanvasHeight] = createSignal(0);
  const [clientOnly, setClientOnly] = createSignal(false);

  // Create draggable behavior without InfiniteCanvas integration for now
  const {
    draggedId,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
    bringToFront,
    sendToBack,
  } = createDraggable(polaroidPhotos, setPolaroidPhotos, {
    route,
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 },
    onDragStart: (id) => {
      // Bring photo to front when dragging starts
      bringToFront(id);
    },
  });

  // Handle rotation
  const handleRotatePhoto = (id: string) => {
    const photo = polaroidPhotos.find((p) => p.id === id);
    if (!photo) return;

    // Rotate in 15 degree increments
    const currentRotation = photo.rotation || 0;
    const newRotation = (currentRotation + 15) % 360;

    // Update rotation in store
    setPolaroidPhotos((p) => p.id === id, "rotation", newRotation);

    // Persist rotation
    savePhotoRotation(id, newRotation, route, getUserName());
  };

  // Handle logout action
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Load user posts - only called after authentication is confirmed
  const loadPosts = async () => {
    if (!user.data || !isAuthenticated()) {
      return;
    }

    try {
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

      if (data && data.data && data.data.posts) {
        // Update state
        setPosts(data.data.posts);
        setCursor(data.data.cursor);

        // Store in localStorage using utility
        if (user.data?.username) {
          storePosts(data.data.posts, { username: user.data.username });
          storeCursor(data.data.cursor, { username: user.data.username });
        }
      } else {
        setPosts([]);

        // Clear localStorage items
        if (typeof window !== "undefined") {
          localStorage.removeItem(`${storageKeyPrefix()}posts`);
          localStorage.removeItem(`${storageKeyPrefix()}cursor`);
        }
      }
    } catch (err) {
      setError("Failed to load your posts. Please try again.");
    }
  };

  // Handle download action
  const downloadPeachData = async () => {
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
      // Show more detailed error to help with debugging
      const errorMessage =
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to download your Peach data. Please try again.";

      setError(errorMessage);

      // Reset the export context on error
      exportContext.resetExport();
    }
  };

  // Authentication and initialization
  onMount(() => {
    // Redirect if not authenticated
    if (!isAuthenticated()) {
      setTimeout(() => navigate("/"), 0);
      return;
    }

    // Check credentials
    if (isAuthenticated() && (!user.data?.username || !token())) {
      setError("Missing username or token");
    }

    // Set canvas dimensions
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight - 60); // Subtract header height

    // Add window resize handler
    const handleResize = () => {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight - 60);
    };
    window.addEventListener("resize", handleResize);

    // Load posts if needed
    if (posts().length === 0) {
      // Small delay to ensure auth is fully processed
      setTimeout(() => loadPosts(), 100);
    } else {
      const storedPosts = posts();
      const transformedPhotos = transformPostsToPolaroids(storedPosts, {
        route,
        username: getUserName(),
      });

      // Ensure position is defined for each photo and add rotation capability
      const photosWithPosition = transformedPhotos.map((photo) => ({
        ...photo,
        position: photo.position || { x: 0, y: 0 },
        isRotatable: true, // Enable rotation for photos
      }));

      // Update the store with the new photos
      setPolaroidPhotos(photosWithPosition);
    }

    // Set client-only flag for hydration safety
    setTimeout(() => setClientOnly(true), 100);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  // Auth state effect
  createEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  });

  // Update polaroids when posts change
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
        }
      }

      // Transform posts to polaroids using the storage utility
      const transformedPhotos = transformPostsToPolaroids(uniquePosts, {
        route,
        username: getUserName(),
      });

      // Ensure position is defined for each photo
      const photosWithPosition = transformedPhotos.map((photo) => ({
        ...photo,
        position: photo.position || { x: 0, y: 0 },
        isRotatable: true, // Enable rotation for photos
      }));

      // Update the store with the new photos
      setPolaroidPhotos(photosWithPosition);
    }
  });

  return (
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>

      <div
        ref={setCorkboardRef}
        class={styles.corkboard}
        style={{
          width: `${canvasWidth()}px`,
          height: `${canvasHeight()}px`,
        }}
      >
        <InfiniteCanvas
          showGrid={false}
          storageKey={`peach_preserves_${getUserName()}_${route}_canvas`}
          initialViewport={
            getCanvasViewport(route, getUserName()) || {
              position: { x: 0, y: 0 },
              scale: 1,
            }
          }
          className={styles["canvas-container"]}
          onViewportChange={handleViewportChange}
          focalPointId="login-menu"
          onGetItemPosition={getItemPosition}
          // Added options for better control
          panMode="always"
          minScale={0.1}
          maxScale={5}
          backgroundColor="#f5f2e8" // Corkboard color
        >
          <For each={polaroidPhotos}>
            {(photo) => (
              <Show
                when={photo.type === "menu"}
                fallback={
                  <CanvasItem
                    id={photo.id}
                    position={photo.position || { x: 0, y: 0 }}
                    rotation={photo.rotation}
                    zIndex={photo.zIndex}
                    isDraggable={true}
                    isSelected={isDragging(photo.id)}
                    isDragging={isDragging(photo.id)}
                    onSelect={(id, e) => handleDragStart(e, id)}
                    onDrag={(id, delta) => handleDragHandler(id, delta)}
                    onDragEnd={(id) => handleDragEnd(id)}
                    onClick={(id) => {
                      // Could implement selection logic here
                    }}
                    visible={true}
                    isSelectable={true}
                  >
                    <Polaroid
                      id={photo.id}
                      src={photo.src}
                      caption={photo.caption}
                      date={photo.date}
                      position={{ x: 0, y: 0 }} // Position handled by CanvasItem
                      rotation={0} // Rotation handled by CanvasItem
                      zIndex={1} // zIndex handled by CanvasItem
                      useRandomValues={true}
                      onMouseDown={(e) => e.stopPropagation()} // Prevent duplicate events
                      onTouchStart={(e) => e.stopPropagation()} // Prevent duplicate events
                      class={styles["background-polaroid"]}
                    />
                  </CanvasItem>
                }
              >
                <CanvasItem
                  id={photo.id}
                  position={photo.position || { x: 0, y: 0 }}
                  zIndex={photo.zIndex || 10000}
                  isDraggable={true}
                  isSelected={isDragging(photo.id)}
                  isDragging={isDragging(photo.id)}
                  onSelect={(id, e) => handleDragStart(e, id)}
                  onDrag={(id, delta) => handleDragHandler(id, delta)}
                  onDragEnd={(id) => handleDragEnd(id)}
                >
                  <LoginForm />
                </CanvasItem>
              </Show>
            )}
          </For>
        </InfiniteCanvas>
      </div>
    </div>
  );
}
