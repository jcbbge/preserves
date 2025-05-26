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
    saveCanvasViewport(viewport, route, getUserName());
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
        batch(() => {
          setState("posts", response.data.data.posts);
          setState("cursor", response.data.data.cursor);
        });

        if (user.data?.username) {
          storePosts(response.data.data.posts, { username: user.data.username });

          if (response.data.data.cursor) {
            storeCursor(response.data.data.cursor, { username: user.data.username });
          }
        }
      } else {
        batch(() => {
          setState("posts", []);
          setState("cursor", null);
        });

        const userName = getUserName();
        localStorage.removeItem(`peach_preserves_${userName}_posts`);
        localStorage.removeItem(`peach_preserves_${userName}_cursor`);
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

    const storedPosts = retrievePosts({ username: getUserName() });
    batch(() => {
      setState("posts", storedPosts);
      setState("cursor", retrieveCursor({ username: getUserName() }));
    });

    if (storedPosts.length === 0) {
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

    if (currentPosts.length > 0) {
      const uniquePosts = [];
      const seenIds = new Set<string>();

      for (const post of currentPosts) {
        if (!post.id) {
          continue;
        }

        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          uniquePosts.push(post);
        }
      }

      const transformedPhotos = transformPostsToPolaroids(uniquePosts, {
        route,
        username: getUserName(),
      })
        .map((photo): DashboardPhoto | null => {
          if (!photo || !photo.id) {
            return null;
          }

          return {
            ...photo,
            position: photo.position || { x: 0, y: 0 },
            type: "photo" as const,
            isRotatable: true,
          };
        })
        .filter((photo): photo is DashboardPhoto => photo !== null);

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

      const navPosition = DEFAULT_POSITIONS.dashboardNavComponent;
      const baseOvalPositions = generateOvalPositions(transformedPhotos.length, 600, 400);
      const positionMap: { [key: string]: { x: number; y: number } } = {};

      transformedPhotos.forEach((photo, index) => {
        if (!photo.position) {
          const ovalPos = baseOvalPositions[index];
          positionMap[photo.id] = {
            x: ovalPos.x + navPosition.x,
            y: ovalPos.y + navPosition.y
          };
        }
      });

      if (Object.keys(positionMap).length > 0) {
        storeInitialPositions(positionMap, route, getUserName());
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