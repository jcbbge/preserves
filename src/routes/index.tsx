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
import { InfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { CanvasItem } from "~/primitives/infiniteCanvas/CanvasItem";
import { useInfiniteCanvas } from "~/primitives/infiniteCanvas/InfiniteCanvas";
import { createDraggable, DraggableItem } from "~/primitives/createDraggable";
import { Vector, useTransform } from "~/primitives/infiniteCanvas/TransformContext";
import {
  initializeCanvasPhotos,
  storeInitialPositions,
  getCanvasViewport,
  saveCanvasViewport,
  savePhotoPosition,
  savePhotoRotation,
} from "~/utils/storage";
import { redirectIfAuthenticated } from "~/utils/authUtils";
import { DEFAULT_POSITIONS, getViewportForLoginCenter } from "~/config/defaultPositions";

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
    isDragging,
  } = createDraggable(polaroidPhotos, setPolaroidPhotos, {
    route,
    username: getUserName(),
    zIndexRange: { min: 0, max: 9 }
  });

  // Handle canvas viewport change
  const handleViewportChange = (viewport) => {
    console.log("[DEBUG] Viewport changed to:", viewport);
    console.log("[DEBUG] World (0,0) is at screen coordinates:", {
      x: viewport.position.x,
      y: viewport.position.y
    });
    console.log("[DEBUG] Login component is at screen coordinates:", {
      x: viewport.position.x + DEFAULT_POSITIONS.loginComponent.x * viewport.scale,
      y: viewport.position.y + DEFAULT_POSITIONS.loginComponent.y * viewport.scale
    });
    saveCanvasViewport(viewport, route, getUserName());
  };

  
  // Handle dragging a polaroid
  const handleDragHandler = (id: string, delta: Vector) => {
    handleDragMove(id, delta);
  };

  // Function to get an item position - used by InfiniteCanvas for focal points
  const getItemPosition = (id: string) => {
    const found = polaroidPhotos.find((p) => p.id === id);
    console.log("[DEBUG] getItemPosition called for:", id);
    console.log("[DEBUG] Found item:", found);
    console.log("[DEBUG] Returning position:", found?.position);
    return found?.position;
  };

  // Use onMount to ensure we don't redirect during SSR
  onMount(() => {
    redirectIfAuthenticated(isAuthenticated, navigate);

    // Set canvas dimensions
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight);

    console.log("[DEBUG] Screen dimensions:", { width: window.innerWidth, height: window.innerHeight });
    console.log("[DEBUG] Login component world position:", DEFAULT_POSITIONS.loginComponent);
    console.log("[DEBUG] Calculated viewport for centering:", getViewportForLoginCenter(window.innerWidth, window.innerHeight));

    // Initialize photos using our unified storage API with default world positions
    const photos = initializeCanvasPhotos(stockImages, route, {
      username: getUserName(),
      predefinedPositions,
      centerX: 0, // Use world origin as center
      centerY: 0,
    });

    // Create login menu at calculated position
    const menuItem = {
      id: "login-menu",
      type: "menu",
      position: DEFAULT_POSITIONS.loginComponent,
      zIndex: 10000,
      rotation: 0,
      src: "",
      caption: "",
      date: new Date().toISOString(),
    };

    console.log("[DEBUG] Login menu item created at position:", menuItem.position);

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
            getCanvasViewport(route, getUserName()) || 
            getViewportForLoginCenter(window.innerWidth, window.innerHeight)
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
          {/* Debug indicator for world origin (0,0) */}
          <CanvasItem
            id="debug-origin"
            position={{ x: 0, y: 0 }}
            zIndex={99999}
            isDraggable={false}
            isSelectable={false}
          >
            <div style={{
              position: "absolute",
              width: "40px",
              height: "40px",
              left: "-20px",
              top: "-20px",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              background: "rgba(255, 0, 0, 0.8)",
              color: "white",
              "font-size": "24px",
              "font-weight": "bold",
              "border-radius": "50%",
              "box-shadow": "0 0 10px rgba(255, 0, 0, 0.5)",
              "z-index": "99999"
            }}>
              +
            </div>
          </CanvasItem>

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
