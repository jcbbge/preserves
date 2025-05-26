import { createSignal, onMount, createEffect, For, Show, batch } from "solid-js";
import { createStore } from "solid-js/store";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { fetchStream } from "./api/stream";
import { downloadPeachData as fetchPeachData } from "~/lib/api/download";
import { PolaroidPhoto } from "~/types/polaroid";
import {
  getPhotos,
  setPhotos,
  getCanvas,
  setCanvas,
  getUserData,
  setUserData,
  getPosts,
  setPosts,
  PhotoState,
  PostData,
} from "~/utils/storage";

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

interface DashboardPhoto extends Omit<PolaroidPhoto, 'position'> {
  position: Point;
  type: "photo" | "menu";
  isRotatable?: boolean;
}

interface DashboardState {
  downloading: boolean;
  downloadComplete: boolean;
  error: string | null;
  posts: any[];
  cursor: string | null;
  canvasWidth: number;
  canvasHeight: number;
  clientOnly: boolean;
}

export default function Dashboard() {
  const { isAuthenticated, user, token, logout } = usePeach();
  const exportContext = useExport();
  const navigate = useNavigate();

  const route = "dashboard";

  const getUserName = (): string => user.data?.username || "unknown";

  const [state, setState] = createStore<DashboardState>({
    downloading: false,
    downloadComplete: false,
    error: null,
    posts: [],
    cursor: null,
    canvasWidth: 0,
    canvasHeight: 0,
    clientOnly: false,
  });

  const [polaroidPhotos, setPolaroidPhotos] = createStore<DashboardPhoto[]>([]);
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement | null>(null);

  const {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
    bringToFront,
  } = createDraggable(polaroidPhotos as any, setPolaroidPhotos, {
    route,
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 },
    onDragStart: (id: string) => {
      bringToFront(id);
    },
  });

  const handleDragHandler = (id: string, delta: Vector): void => {
    handleDragMove(id, delta);
  };

  const handleViewportChange = (viewport: { position: Point; scale: number }): void => {
    setCanvas({ x: viewport.position.x, y: viewport.position.y, scale: viewport.scale }, getUserName());
  };

  const getItemPosition = (id: string): Point => {
    const item = polaroidPhotos.find((p) => p.id === id);
    return item?.position || { x: 0, y: 0 };
  };

  const loadPosts = async (): Promise<void> => {
    if (!user.data || !isAuthenticated()) {
      return;
    }

    try {
      const username = user.data.username;
      const streamToken = token();

      const formData = new FormData();
      formData.append("username", username);
      formData.append("token", streamToken || "");

      const response = await fetchStream(formData);

      if (response.success && response.data?.data?.posts) {
        if (user.data?.username) {
          const allImages: any[] = [];
          
          for (const post of response.data.data.posts) {
            if (!post.message || !Array.isArray(post.message)) continue;
            
            const images = post.message.filter((part: any) => part.type === 'image');
            
            for (let i = 0; i < images.length; i++) {
              if (allImages.length >= 25) break;
              
              allImages.push({
                id: `${post.id}-image-${i}`,
                message: post.message,
                createdTime: post.createdTime,
                imageIndex: i,
                src: images[i].src
              });
            }
            
            if (allImages.length >= 25) break;
          }
          
          const filteredPosts = allImages;

          batch(() => {
            setState("posts", filteredPosts);
            setState("cursor", response.data.data.cursor);
          });

          console.log(`[DASHBOARD] Filtered posts:`, filteredPosts);
          setPosts(filteredPosts, user.data.username);
        }
      } else {
        batch(() => {
          setState("posts", []);
          setState("cursor", null);
        });

        const userName = getUserName();
        setPosts([], userName);
      }
    } catch (err) {
      setState("error", "Failed to load your posts. Please try again.");
    }
  };

  const handleDownloadData = async (): Promise<void> => {
    batch(() => {
      setState("error", null);
      setState("downloading", true);
    });

    try {
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

      batch(() => {
        setState("downloading", false);
        setState("downloadComplete", true);
      });

      setTimeout(() => {
        batch(() => {
          setState("downloadComplete", false);
        });
        exportContext.resetExport();
      }, 5000);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? `Error: ${err.message}`
        : "Failed to download your Peach data. Please try again.";

      batch(() => {
        setState("error", errorMessage);
        setState("downloading", false);
      });
      exportContext.resetExport();
    }
  };

  const initializeDashboard = (): (() => void) | void => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    if (isAuthenticated() && (!user.data?.username || !token())) {
      setState("error", "Missing username or token");
    }

    batch(() => {
      setState("canvasWidth", window.innerWidth);
      setState("canvasHeight", window.innerHeight);
    });

    const storedPosts = getPosts(getUserName());
    console.log(`[DASHBOARD] Stored posts for ${getUserName()}:`, storedPosts);
    batch(() => {
      setState("posts", storedPosts);
      setState("cursor", null);
    });

    if (storedPosts.length === 0) {
      console.log(`[DASHBOARD] No stored posts, loading from API...`);
      loadPosts();
    }

    setState("clientOnly", true);

    const handleResize = (): void => {
      batch(() => {
        setState("canvasWidth", window.innerWidth);
        setState("canvasHeight", window.innerHeight);
      });
    };

    window.addEventListener("resize", handleResize);

    const cleanup = () => {
      window.removeEventListener("resize", handleResize);
    };
    return cleanup;
  };

  onMount(initializeDashboard);

  createEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  });

  createEffect(() => {
    const currentPosts = state.posts;
    console.log(`[DASHBOARD] createEffect triggered with posts:`, currentPosts);

    if (currentPosts.length > 0) {
      const imagePosts = currentPosts;
      console.log(`[DASHBOARD] Image posts found:`, imagePosts.length);

      const storedPhotos = getPhotos(getUserName());
      
      const transformedPhotos: DashboardPhoto[] = imagePosts
        .map((imageBlock, index): DashboardPhoto => {
          const storedState = storedPhotos[imageBlock.id];
          const navPosition = DEFAULT_POSITIONS.dashboardNavComponent;
          const angle = (index / imagePosts.length) * 2 * Math.PI;
          const radius = 300 + Math.random() * 200;
          
          // Format date like original logic
          let date = "";
          if (imageBlock.createdTime) {
            const timestamp = typeof imageBlock.createdTime === 'string' 
              ? parseInt(imageBlock.createdTime) 
              : imageBlock.createdTime;
            
            const dateObj = timestamp > 1000000000000 
              ? new Date(timestamp) 
              : new Date(timestamp * 1000);
            
            date = dateObj.toLocaleDateString();
          }
          
          // Extract caption and styling like original logic
          let caption = "";
          let captionStyle = { fontSize: 14, offsetY: 0 };
          
          if (imageBlock.message && Array.isArray(imageBlock.message)) {
            const firstTextPart = imageBlock.message.find((part: any) => part.type === "text" && part.text);
            if (firstTextPart) {
              let fullText = firstTextPart.text.trim();
              
              const lines = fullText.split('\n');
              const firstTwoLines = lines.slice(0, 2).join('\n').trim();
              
              const words = firstTwoLines.split(' ');
              
              let naturalCaption = "";
              
              if (words.length <= 3) {
                naturalCaption = words.join(' ');
                captionStyle = { fontSize: 30, offsetY: 0 };
              } else {
                naturalCaption = words.slice(0, 4).join(' ');
                captionStyle = { fontSize: 20, offsetY: 0 };
              }
              
              caption = naturalCaption;
            }
          }
          
          return {
            id: imageBlock.id,
            src: imageBlock.src || '',
            caption,
            date,
            captionStyle,
            position: storedState ? 
              { x: storedState.x, y: storedState.y } : 
              {
                x: navPosition.x + Math.cos(angle) * radius,
                y: navPosition.y + Math.sin(angle) * radius
              },
            rotation: storedState?.rotation || (Math.random() * 20 - 10),
            zIndex: storedState?.zIndex || (imagePosts.length - index),
            type: "photo" as const,
            isRotatable: true,
          };
        });

      const dashboardNavItem: DashboardPhoto = {
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

      if (Object.keys(storedPhotos).length === 0 && transformedPhotos.length > 0) {
        const initialPhotoStates: Record<string, PhotoState> = {};
        transformedPhotos.forEach((photo) => {
          initialPhotoStates[photo.id] = {
            x: photo.position.x,
            y: photo.position.y,
            rotation: photo.rotation || 0,
            zIndex: photo.zIndex || 1
          };
        });
        setPhotos(initialPhotoStates, getUserName());
      }
    } else {
      const dashboardNavItem: DashboardPhoto = {
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

      <Show when={state.error}>
        <ErrorNotification
          message={state.error!}
          onDismiss={() => setState("error", null)}
        />
      </Show>

      <Show when={exportContext.exportData.status === 'exporting'}>
        <ExportProgressModal />
      </Show>

      <Show when={exportContext.exportData.error}>
        <ExportErrorModal />
      </Show>

      <Show when={state.downloadComplete}>
        <DownloadCompleteModal visible={state.downloadComplete} />
      </Show>

      <div
        ref={setCorkboardRef}
        class={styles.corkboard}
        style={{
          width: `${state.canvasWidth}px`,
          height: `${state.canvasHeight}px`,
        }}
      >
        <Show when={state.posts.length === 0 && state.clientOnly}>
          <EmptyStateMessage />
        </Show>

        <Show when={state.clientOnly}>
          <InfiniteCanvas
            showGrid={false}
            storageKey={`peach_${getUserName()}_canvas`}
            initialViewport={
              getCanvas(getUserName()) ? 
              { position: { x: getCanvas(getUserName())!.x, y: getCanvas(getUserName())!.y }, scale: getCanvas(getUserName())!.scale } :
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
                      onClick={() => {}}
                      visible={true}
                      isSelectable={true}
                    >
                      <Polaroid
                        id={photo.id}
                        src={photo.src}
                        caption={photo.caption}
                        date={photo.date}
                        position={{ x: 0, y: 0 }}
                        rotation={0}
                        zIndex={1}
                        useRandomValues={true}
                        captionStyle={photo.captionStyle}
                        onMouseDown={() => {}}
                        onTouchStart={() => {}}
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