import { createSignal, onMount, createEffect, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { fetchStream } from "./api/stream";
import { downloadPeachData as fetchPeachData } from "~/lib/api/download";
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
  initializeCanvasPhotos,
  storeInitialPositions,
} from "~/utils/storage";

// Component imports
import { DownloadCompleteModal } from "~/components/DownloadCompleteModal";
import { ExportProgressModal } from "~/components/ExportProgressModal";
import { ExportErrorModal } from "~/components/ExportErrorModal";
import { ErrorNotification } from "~/components/ErrorNotification";
import { EmptyStateMessage } from "~/components/EmptyStateMessage";
import { DownloadButton } from "~/components/DownloadButton";
import { Polaroid } from "~/components/Polaroid";
import DashboardNav from "~/components/DashboardNav";

import { InfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { CanvasItem } from "~/primitives/infiniteCanvas/CanvasItem";
import { createDraggable, DraggableItem } from "~/primitives/createDraggable";
import { Vector, Point } from "~/primitives/infiniteCanvas/TransformContext";
import { DEFAULT_POSITIONS, getViewportForLoginCenter } from "~/config/defaultPositions";
import { generateOvalPositions } from "~/config/defaultPositions";
import styles from "./dashboard.module.css";

export default function Dashboard() {
  const { isAuthenticated, user, token, logout } = usePeach();
  const exportContext = useExport();
  const navigate = useNavigate();

  // Route identifier for storage keys
  const route = "dashboard";

  // User identifier for storage
  const getUserName = () => user.data?.username || "unknown";

  // State management
  const [downloading, setDownloading] = createSignal(false);
  const [downloadComplete, setDownloadComplete] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [posts, setPosts] = createSignal<any[]>([]);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [polaroidPhotos, setPolaroidPhotos] = createStore<(PolaroidPhoto & DraggableItem)[]>([]);
  const [canvasWidth, setCanvasWidth] = createSignal(0);
  const [canvasHeight, setCanvasHeight] = createSignal(0);
  const [clientOnly, setClientOnly] = createSignal(false);
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement | null>(null);

  // Create draggable behavior for photos
  const {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
    bringToFront,
  } = createDraggable(polaroidPhotos, setPolaroidPhotos, {
    route,
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 },
    onDragStart: (id) => {
      bringToFront(id);
    },
  });

  // Handle drag operations
  const handleDragHandler = (id: string, delta: Vector) => {
    handleDragMove(id, delta);
  };

  // Save viewport state when it changes
  const handleViewportChange = (viewport: { position: Point; scale: number }) => {
    saveCanvasViewport(viewport, route, getUserName());
  };

  // Get item position for canvas items
  const getItemPosition = (id: string): Point => {
    const item = polaroidPhotos.find((p) => p.id === id);
    return item ? item.position : { x: 0, y: 0 };
  };





  // Load posts from the Peach API
  const loadPosts = async () => {
    if (!user.data || !isAuthenticated()) {
      return;
    }

    try {
      // Get user credentials
      const username = user.data.username;
      const streamToken = token();

      // Create form data for server action
      const formData = new FormData();
      formData.append("username", username);
      formData.append("token", streamToken || "");

      const response = await fetchStream(formData);

      // Process response data
      if (response.success && response.data?.data?.posts) {
        // Update state
        setPosts(response.data.data.posts);
        setCursor(response.data.data.cursor);

        // Store in localStorage
        if (user.data?.username) {
          storePosts(response.data.data.posts, { username: user.data.username });
          
          // Only store cursor if it's not null
          if (response.data.data.cursor) {
            storeCursor(response.data.data.cursor, { username: user.data.username });
          }
        }
      } else {
        setPosts([]);
        // Clear localStorage items
        localStorage.removeItem(`peach_preserves_${getUserName()}_posts`);
        localStorage.removeItem(`peach_preserves_${getUserName()}_cursor`);
      }
    } catch (err) {
      setError("Failed to load your posts. Please try again.");
    }
  };

  // Handle download action
  const handleDownloadData = async () => {
    setError(null);
    setDownloading(true);

    try {
      // Get username for archive naming
      const username = user.data?.username || "peach-user";

      // Check token and call download API
      const currentToken = token();
      if (!currentToken) {
        throw new Error("Authentication token is missing");
      }
      
      await fetchPeachData(
        currentToken,
        {
          includeComments: true,
          includeImages: true,
        },
        exportContext,
        user.data,
      );

      setDownloading(false);
      setDownloadComplete(true);

      // Show completion message temporarily
      setTimeout(() => {
        setDownloadComplete(false);
        exportContext.resetExport();
      }, 5000);
    } catch (err) {
      // Format error message
      const errorMessage =
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to download your Peach data. Please try again.";

      setError(errorMessage);
      setDownloading(false);
      exportContext.resetExport();
    }
  };

  // Initialize component
  onMount(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    if (isAuthenticated() && (!user.data?.username || !token())) {
      setError("Missing username or token");
    }

    // Set canvas dimensions
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight);

    // Load initial posts data
    const storedPosts = retrievePosts({ username: getUserName() });
    setPosts(storedPosts);
    setCursor(retrieveCursor({ username: getUserName() }));

    // If no stored posts, try to load from API
    if (storedPosts.length === 0) {
      loadPosts();
    }

    setClientOnly(true);

    const handleResize = () => {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Clean up on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  // Authentication check effect
  createEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  });

  // Update polaroids when posts change
  createEffect(() => {
    const currentPosts = posts();
    
    if (currentPosts.length > 0) {
      // Remove duplicate posts and ensure all posts have valid IDs
      const uniquePosts = [];
      const seenIds = new Set();
      
      for (const post of currentPosts) {
        // Log post structure to debug ghost polaroids
        console.log("[DASHBOARD] Post data:", post);
        
        // Ensure post has valid ID
        if (!post.id) {
          console.warn("[DASHBOARD] Post missing ID, skipping:", post);
          continue;
        }
        
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          uniquePosts.push(post);
        }
      }

      // Transform posts to polaroids (this will use saved positions or generate defaults)
      const transformedPhotos = transformPostsToPolaroids(uniquePosts, {
        route,
        username: getUserName(),
      }).map((photo) => {
        // Ensure photo has valid ID
        if (!photo || !photo.id) {
          console.warn("[DASHBOARD] Transformed photo missing ID:", photo);
          return null;
        }
        
        return {
          ...photo,
          type: "photo" as const,
          isRotatable: true,
        };
      }).filter(Boolean); // Remove any null entries

      // Create dashboard nav menu item at DEFAULT_POSITIONS.dashboardNavComponent
      const dashboardNavItem = {
        id: "dashboard-nav",
        type: "menu" as const,
        position: DEFAULT_POSITIONS.dashboardNavComponent,
        zIndex: 10000,
        rotation: 0,
        src: "",
        caption: "",
        date: new Date().toISOString(),
      };

      setPolaroidPhotos([dashboardNavItem, ...transformedPhotos]);

      // Generate and store initial oval positions only for photos without saved positions
      const navPosition = DEFAULT_POSITIONS.dashboardNavComponent;
      const baseOvalPositions = generateOvalPositions(transformedPhotos.length, 600, 400);
      const positionMap: { [key: string]: { x: number; y: number } } = {};
      
      transformedPhotos.forEach((photo, index) => {
        // Only set default position if photo doesn't already have a saved position
        if (!photo.position) {
          const ovalPos = baseOvalPositions[index];
          positionMap[photo.id] = {
            x: ovalPos.x + navPosition.x,
            y: ovalPos.y + navPosition.y
          };
        }
      });
      
      // Only store positions that we actually generated (not overriding saved ones)
      if (Object.keys(positionMap).length > 0) {
        storeInitialPositions(positionMap, route, getUserName());
      }
    } else {
      // If no posts, just show the dashboard nav
      const dashboardNavItem = {
        id: "dashboard-nav",
        type: "menu" as const,
        position: DEFAULT_POSITIONS.dashboardNavComponent,
        zIndex: 10000,
        rotation: 0,
        src: "",
        caption: "",
        date: new Date().toISOString(),
      };
      
      setPolaroidPhotos([dashboardNavItem]);
    }
  });

  return (
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>

      <Show when={error()}>
        <ErrorNotification 
          message={error()} 
          onDismiss={() => setError(null)} 
        />
      </Show>

      <Show when={exportContext.exportData.status === 'exporting'}>
        <ExportProgressModal />
      </Show>

      <Show when={exportContext.exportData.error}>
        <ExportErrorModal />
      </Show>

      <Show when={downloadComplete()}>
        <DownloadCompleteModal visible={downloadComplete()} />
      </Show>




      {/* Canvas area */}
      <div
        ref={setCorkboardRef}
        class={styles.corkboard}
        style={{
          width: `${canvasWidth()}px`,
          height: `${canvasHeight()}px`,
        }}
      >
        <Show when={posts().length === 0 && clientOnly()}>
          <EmptyStateMessage />
        </Show>

        <Show when={clientOnly()}>
          <InfiniteCanvas
            showGrid={false}
            storageKey={`peach_preserves_${getUserName()}_${route}_canvas`}
            initialViewport={
              getCanvasViewport(route, getUserName()) || 
              getViewportForLoginCenter(window.innerWidth, window.innerHeight)
            }
            className={styles["canvas-container"]}
            onViewportChange={handleViewportChange}
            focalPointId="dashboard-nav"
            onGetItemPosition={getItemPosition}
            panMode="always"
            minScale={0.1}
            maxScale={5}
            backgroundColor="#f5f2e8"
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
                      onDragEnd={(id) => {
                        const item = polaroidPhotos.find(p => p.id === id);
                        if (item && item.position) {
                          handleDragEnd(id, item.position);
                        }
                      }}
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
                        captionStyle={photo.captionStyle}
                        onMouseDown={(e) => {
                          // Allow events to bubble for dragging
                        }}
                        onTouchStart={(e) => {
                          // Allow events to bubble for dragging
                        }}
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
                    onDragEnd={(id) => {
                      const item = polaroidPhotos.find(p => p.id === id);
                      if (item && item.position) {
                        handleDragEnd(id, item.position);
                      }
                    }}
                  >
                    <DashboardNav isDragging={isDragging(photo.id)} onDownload={handleDownloadData} />
                  </CanvasItem>
                </Show>
              )}
            </For>
          </InfiniteCanvas>
        </Show>
      </div>
    </div>
  );
}