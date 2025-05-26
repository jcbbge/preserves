import { useNavigate } from "@solidjs/router";
import { onMount, For, Show, createSignal, batch } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore } from "solid-js/store";
import styles from "./index.module.css";
import { PolaroidPhoto } from "~/types/polaroid";
import { Polaroid } from "~/components/Polaroid";
import { stockImages, predefinedPositions } from "~/data/stockImages";
import LoginForm from "~/components/LoginForm";
import { InfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { CanvasItem } from "~/primitives/infiniteCanvas/CanvasItem";
import { createDraggable, DraggableItem } from "~/primitives/createDraggable";
import { Vector, Point } from "~/primitives/infiniteCanvas/TransformContext";
import {
  initializeCanvasPhotos,
  storeInitialPositions,
  getCanvasViewport,
  saveCanvasViewport,
} from "~/utils/storage";
import { redirectIfAuthenticated } from "~/utils/authUtils";
import { DEFAULT_POSITIONS, getViewportForLoginCenter } from "~/config/defaultPositions";

interface LoginPhoto extends Omit<PolaroidPhoto, 'position'> {
  position: Point;
  type: "photo" | "menu";
}

interface LoginState {
  canvasWidth: number;
  canvasHeight: number;
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement>();
  
  const [state, setState] = createStore<LoginState>({
    canvasWidth: 0,
    canvasHeight: 0,
  });

  const [polaroidPhotos, setPolaroidPhotos] = createStore<LoginPhoto[]>([]);

  const route = "login";
  const getUserName = (): string => "guest";

  const {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
  } = createDraggable(polaroidPhotos as any, setPolaroidPhotos, {
    route,
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 }
  });

  const handleViewportChange = (viewport: { position: Point; scale: number }): void => {
    saveCanvasViewport(viewport, route, getUserName());
  };

  const handleDragHandler = (id: string, delta: Vector): void => {
    handleDragMove(id, delta);
  };

  const getItemPosition = (id: string): Point => {
    const found = polaroidPhotos.find((p) => p.id === id);
    return found?.position || { x: 0, y: 0 };
  };

  const initializeLogin = (): (() => void) | void => {
    redirectIfAuthenticated(isAuthenticated, navigate);

    batch(() => {
      setState("canvasWidth", window.innerWidth);
      setState("canvasHeight", window.innerHeight);
    });

    const photos = initializeCanvasPhotos(stockImages, route, {
      username: getUserName(),
      predefinedPositions,
    });

    const photosWithPositions: LoginPhoto[] = photos.map(photo => ({
      ...photo,
      position: photo.position || { x: 0, y: 0 },
      type: "photo" as const
    }));

    const menuItem: LoginPhoto = {
      id: "login-menu",
      type: "menu" as const,
      position: DEFAULT_POSITIONS.loginComponent,
      zIndex: 10000,
      rotation: 0,
      src: "",
      caption: "",
      date: new Date().toISOString(),
    };

    setPolaroidPhotos([menuItem, ...photosWithPositions]);

    storeInitialPositions(predefinedPositions, route, getUserName());

    const handleResize = (): void => {
      batch(() => {
        setState("canvasWidth", window.innerWidth);
        setState("canvasHeight", window.innerHeight);
      });
    };

    window.addEventListener("resize", handleResize);

    const cleanup = (): void => {
      window.removeEventListener("resize", handleResize);
    };
    return cleanup;
  };

  onMount(initializeLogin);

  return (
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>

      <div
        ref={setCorkboardRef}
        class={styles.corkboard}
        style={{
          width: `${state.canvasWidth}px`,
          height: `${state.canvasHeight}px`,
        }}
      >
        <InfiniteCanvas
          showGrid={false}
          storageKey={`peach_preserves_${getUserName()}_${route}_canvas`}
          initialViewport={
            getCanvasViewport(route, getUserName()) || 
            getViewportForLoginCenter(window.innerWidth, window.innerHeight)
          }
          className={styles["canvas-container"]}
          onViewportChange={handleViewportChange}
          focalPointId="login-menu"
          onGetItemPosition={getItemPosition}
          panMode="spacebar"
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
                    position={photo.position}
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
                      onMouseDown={() => {}}
                      onTouchStart={() => {}}
                      class={styles["background-polaroid"]}
                    />
                  </CanvasItem>
                }
              >
                <CanvasItem
                  id={photo.id}
                  position={photo.position}
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
                  <LoginForm isDragging={isDragging(photo.id)} />
                </CanvasItem>
              </Show>
            )}
          </For>
        </InfiniteCanvas>
      </div>
    </div>
  );
}