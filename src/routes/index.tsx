import { useNavigate } from "@solidjs/router";
import { onMount, For, Show, createSignal } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore } from "solid-js/store";
import styles from "./index.module.css";
import { PolaroidPhoto } from "~/types/polaroid";
import { Polaroid } from "~/components/Polaroid";
import { stockImages, predefinedPositions } from "~/data/stockImages";
import LoginForm from "~/components/LoginForm";
import { 
  InfiniteCanvas, 
  CanvasItem, 
  useInfiniteCanvas
} from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { createDraggable, DraggableItem } from "~/primitives/createDraggable";
import { Vector } from "~/primitives/infiniteCanvas/TransformContext";
import {
  initializeCanvasPhotos,
  storeInitialPositions,
  getCanvasViewport,
  saveCanvasViewport,
  savePhotoPosition,
  savePhotoRotation,
} from "~/utils/storage";
import { redirectIfAuthenticated } from "~/utils/authUtils";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement>();
  const [polaroidPhotos, setPolaroidPhotos] = createStore<
    (PolaroidPhoto & { type?: "photo" | "menu" } & DraggableItem)[]
  >([]);
  const [canvasWidth, setCanvasWidth] = createSignal(0);
  const [canvasHeight, setCanvasHeight] = createSignal(0);

  // Route identifier for storage - used by our unified storage API
  const route = "login";

  // Use guest username for consistent storage approach with dashboard
  const getUserName = () => "guest";
  const storageKeyPrefix = () => `peach_preserves_${getUserName()}_`;

  // Create draggable primitive for handling polaroid interactions
  const { 
    draggedId, 
    handleDragStart, 
    handleDragMove, 
    handleDragEnd,
    isDragging
  } = createDraggable(polaroidPhotos, setPolaroidPhotos, {
    route,
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 },
    cssModuleStyles: styles,
  });

  // Handle canvas viewport change
  const handleViewportChange = (viewport) => {
    saveCanvasViewport(viewport, route, getUserName());
  };

  // Handle dragging a polaroid
  const handleDragHandler = (id: string, delta: Vector) => {
    handleDragMove(id, delta.dx, delta.dy);
  };

  // Function to get an item position - used by InfiniteCanvas for focal points
  const getItemPosition = (id: string) => {
    return polaroidPhotos.find(p => p.id === id)?.position;
  };

  // Use onMount to ensure we don't redirect during SSR
  onMount(() => {
    redirectIfAuthenticated(isAuthenticated, navigate);

    // Set canvas dimensions
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight);

    // Initialize photos using our unified storage API
    const photos = initializeCanvasPhotos(stockImages, route, {
      username: getUserName(),
      predefinedPositions,
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
    });

    // Create login menu centered on screen
    const menuItem = {
      id: "login-menu",
      type: "menu",
      position: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      },
      zIndex: 10000,
      rotation: 0,
      src: "",
      caption: "",
      date: new Date().toISOString(),
    };
    
    // Set photos in store
    setPolaroidPhotos([menuItem, ...photos]);

    // Store initial positions if not already set
    storeInitialPositions(predefinedPositions, route, getUserName());

    // Add window resize handler
    const handleResize = () => {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
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
