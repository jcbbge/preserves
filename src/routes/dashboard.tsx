import { onMount, createEffect, For, Show, batch, createMemo, Suspense, ErrorBoundary } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { fetchStream } from "./api/stream";
import { PolaroidPhoto } from "~/types/polaroid";
import {
  getPhotos,
  setPhotos,
  getCanvas,
  setCanvas,
  getPosts,
  setPosts,
  setPhotoState,
  PhotoState,
} from "~/utils/storage";
import { downloadPeachData } from "~/lib/api/download";
import { logger } from "~/lib/logger";

import { DownloadCompleteModal } from "~/components/DownloadCompleteModal";
import { ExportProgressModal } from "~/components/ExportProgressModal";
import { ExportErrorModal } from "~/components/ExportErrorModal";
import { ErrorNotification } from "~/components/ErrorNotification";
import { EmptyStateMessage } from "~/components/EmptyStateMessage";
import { Polaroid } from "~/components/Polaroid";
import { DropAnimation } from "~/components/DropAnimation";
import DashboardNav from "~/components/DashboardNav";

import { InfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { CanvasItem } from "~/primitives/infiniteCanvas/CanvasItem";
import { createDraggable } from "~/primitives/createDraggable";
import { Vector, Point } from "~/primitives/infiniteCanvas/TransformContext";
import { DEFAULT_POSITIONS, getViewportForLoginCenter } from "~/config/defaultPositions";
import styles from "./dashboard.module.css";

interface DashboardPhoto extends Omit<PolaroidPhoto, 'position'> {
  position: Point;
  type: "photo" | "menu";
  isRotatable?: boolean;
  isExposed?: boolean;
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

  // Memoized username to avoid repeated calls
  const getUserName = createMemo(() => user.data?.username || "unknown");

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

  const {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
    bringToFront,
  } = createDraggable(polaroidPhotos as any, setPolaroidPhotos, {
    route: "dashboard",
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 },
    onDragStart: (id: string) => {
      bringToFront(id);
    },
  });

  const handleDragEndWithPosition = (id: string) => {
    const item = polaroidPhotos.find(p => p.id === id);
    if (item && item.position) {
      handleDragEnd(id, item.position);
    }
  };

  const handleViewportChange = (viewport: { position: Point; scale: number }): void => {
    batch(() => {
      setCanvas({ x: viewport.position.x, y: viewport.position.y, scale: viewport.scale }, getUserName());
    });
  };

  const getItemPosition = (id: string): Point => {
    const item = polaroidPhotos.find((p) => p.id === id);
    return item?.position || { x: 0, y: 0 };
  };

  // Memoized canvas state to avoid repeated calls
  const canvasState = createMemo(() => getCanvas(getUserName()));

  // Memoized photo transformations following SolidJS optimization patterns
  const transformedPhotos = createMemo(() => {
    const currentPosts = state.posts;
    if (currentPosts.length === 0) return [];

    const storedPhotos = getPhotos(getUserName());
    const navPosition = DEFAULT_POSITIONS.dashboardNavComponent;
    
    return currentPosts.map((imageBlock, index): DashboardPhoto => {
      const storedState = storedPhotos[imageBlock.id];
      
      // Use stored dashboard positions first, then fall back to random calculation
      let x, y;
      
      const dashboardPositions = Object.values(DEFAULT_POSITIONS.dashboardPhotos);
      if (index < dashboardPositions.length) {
        // Use predefined dashboard positions for first 13 photos
        const position = dashboardPositions[index];
        x = position.x;
        y = position.y;
      } else {
        // For additional photos beyond 13, use random scatter pattern
        const angle = Math.random() * 2 * Math.PI;
        const radius = 700 + Math.random() * 600; // Outer ring for additional photos
        x = navPosition.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 400;
        y = navPosition.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 400;
      }
      
      // Caption and date processing
      const isSingleImage = imageBlock.imageCount === 1;
      const isFirstImage = imageBlock.imageIndex === 0;
      const showCaption = isSingleImage ? Math.random() < 0.8 : (isFirstImage ? Math.random() < 0.4 : Math.random() < 0.1);
      const showDate = Math.random() < 0.6;
      
      let date = "";
      let caption = "";
      let captionStyle = { fontSize: 14, offsetY: 0 };
      
      // Date formatting
      if (showDate && imageBlock.createdTime) {
        const timestamp = typeof imageBlock.createdTime === 'string' 
          ? parseInt(imageBlock.createdTime) 
          : imageBlock.createdTime;
        const dateObj = timestamp > 1000000000000 
          ? new Date(timestamp) 
          : new Date(timestamp * 1000);
        date = dateObj.toLocaleDateString();
      }
      
      // Caption extraction
      if (showCaption && imageBlock.message && Array.isArray(imageBlock.message)) {
        const firstTextPart = imageBlock.message.find((part: any) => part.type === "text" && part.text);
        if (firstTextPart) {
          const lines = firstTextPart.text.trim().split('\n');
          const firstTwoLines = lines.slice(0, 2).join('\n').trim();
          const words = firstTwoLines.split(' ');
          
          if (words.length <= 3) {
            caption = words.join(' ');
            captionStyle = { fontSize: 30, offsetY: 0 };
          } else {
            caption = words.slice(0, 4).join(' ');
            captionStyle = { fontSize: 20, offsetY: 0 };
          }
        }
      }
      
      if (!caption && date) {
        captionStyle = { fontSize: 20, offsetY: 0 };
      }
      
      return {
        id: imageBlock.id,
        src: imageBlock.src || '',
        caption,
        date,
        captionStyle,
        position: storedState ? 
          { x: storedState.x, y: storedState.y } : 
          { x, y },
        rotation: storedState?.rotation || (Math.random() * 40 - 20),
        zIndex: storedState?.zIndex || (index + 1),
        type: "photo" as const,
        isRotatable: true,
        isExposed: storedState?.isExposed || false,
      };
    });
  });

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
          
          batch(() => {
            for (const post of response.data.data.posts) {
              if (!post.message || !Array.isArray(post.message)) continue;
              
              const images = post.message.filter((part: any) => part.type === 'image');
              
              for (let i = 0; i < images.length; i++) {
                allImages.push({
                  id: `${post.id}-image-${i}`,
                  message: post.message,
                  createdTime: post.createdTime,
                  imageIndex: i,
                  src: images[i].src,
                  imageCount: images.length
                });
              }
            }
            
            const filteredPosts = allImages;

            setState(produce(state => {
              state.posts = filteredPosts;
              state.cursor = response.data.data.cursor;
            }));

            setPosts(filteredPosts, user.data?.username || getUserName());
          });
        }
      } else {
        batch(() => {
          setState(produce(state => {
            state.posts = [];
            state.cursor = null;
          }));
        });

        const userName = getUserName();
        setPosts([], userName);
      }
    } catch (err) {
      logger.error("Failed to load posts", err);
      batch(() => {
        setState("error", "Failed to load your posts. Please try again.");
      });
    }
  };

  const handleDownloadData = async (): Promise<void> => {
    batch(() => {
      setState(produce(state => {
        state.error = null;
        state.downloading = true;
      }));
    });

    try {
      const currentToken = token();
      if (!currentToken) {
        throw new Error("Authentication token is missing");
      }

      await downloadPeachData(
        currentToken,
        {
          includeComments: true,
          includeImages: true,
        },
        exportContext,
        user.data,
      );

      batch(() => {
        setState(produce(state => {
          state.downloading = false;
          state.downloadComplete = true;
        }));
      });

      setTimeout(() => {
        batch(() => {
          setState(produce(state => {
            state.downloadComplete = false;
          }));
        });
        exportContext.resetExport();
      }, 5000);
    } catch (err) {
      logger.error("Failed to download data", err);
      const errorMessage = err instanceof Error
        ? `Error: ${err.message}`
        : "Failed to download your Peach data. Please try again.";

      batch(() => {
        setState(produce(state => {
          state.error = errorMessage;
          state.downloading = false;
        }));
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
      logger.error("Authentication incomplete", { 
        hasUsername: !!user.data?.username, 
        hasToken: !!token() 
      });
      batch(() => {
        setState("error", "Missing username or token");
      });
    }

    batch(() => {
      setState(produce(state => {
        state.canvasWidth = window.innerWidth;
        state.canvasHeight = window.innerHeight;
      }));
    });

    const storedPosts = getPosts(getUserName());
    batch(() => {
      setState(produce(state => {
        state.posts = storedPosts;
        state.cursor = null;
      }));
    });

    if (storedPosts.length === 0) {
      loadPosts();
    }

    batch(() => {
      setState("clientOnly", true);
    });

    const handleResize = (): void => {
      batch(() => {
        setState(produce(state => {
          state.canvasWidth = window.innerWidth;
          state.canvasHeight = window.innerHeight;
        }));
      });
    };

    window.addEventListener("resize", handleResize);

    // Return cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  onMount(initializeDashboard);

  // Optimized navigation effect
  createEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  });

  // Optimized effect using memoized transformations
  createEffect(() => {
    const photos = transformedPhotos();
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

    if (photos.length > 0) {
      setPolaroidPhotos([dashboardNavItem, ...photos]);

      const storedPhotos = getPhotos(getUserName());
      if (Object.keys(storedPhotos).length === 0) {
        const initialPhotoStates: Record<string, PhotoState> = {};
        batch(() => {
          photos.forEach((photo) => {
            initialPhotoStates[photo.id] = {
              x: photo.position.x,
              y: photo.position.y,
              rotation: photo.rotation || 0,
              zIndex: photo.zIndex || 1
            };
          });
          setPhotos(initialPhotoStates, getUserName());
        });
      }
    } else {
      setPolaroidPhotos([dashboardNavItem]);
    }
  });

  return (
    <ErrorBoundary fallback={(err) => (
      <div class={styles["peach-preserve"]}>
        <div class={styles["error-container"]}>
          <h2>Something went wrong</h2>
          <p>{err.message || "Please refresh and try again."}</p>
        </div>
      </div>
    )}>
      <div class={styles["peach-preserve"]}>
        <Title>Peach Preserves</Title>

        <Show when={state.error}>
          <ErrorNotification
            message={state.error!}
            onDismiss={() => {
              batch(() => {
                setState("error", null);
              });
            }}
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
            <Suspense fallback={
              <div class={styles["loading-container"]}>
                <div>Loading your preserves...</div>
              </div>
            }>
              <InfiniteCanvas
                showGrid={false}
                storageKey={`peach_${getUserName()}_canvas`}
                initialViewport={
                  canvasState() ? 
                  { position: { x: canvasState()!.x, y: canvasState()!.y }, scale: canvasState()!.scale } :
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
                          onDrag={handleDragMove}
                          onDragEnd={handleDragEndWithPosition}
                          visible={true}
                          isSelectable={true}
                        >
                          <DropAnimation
                            id={photo.id}
                            isExposed={photo.isExposed}
                            delay={((photo.zIndex || 1) - 1) * 50}
                            onAnimationStart={() => {
                              batch(() => {
                                setPhotoState(photo.id, { isExposed: true }, getUserName());
                              });
                            }}
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
                              onMouseDown={handleDragStart}
                              class="background-polaroid"
                            />
                          </DropAnimation>
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
                        onDrag={handleDragMove}
                        onDragEnd={handleDragEndWithPosition}
                      >
                        <DashboardNav isDragging={isDragging(photo.id)} onDownload={handleDownloadData} />
                      </CanvasItem>
                    </Show>
                  )}
                </For>
              </InfiniteCanvas>
            </Suspense>
          </Show>
        </div>
      </div>
    </ErrorBoundary>
  );
}