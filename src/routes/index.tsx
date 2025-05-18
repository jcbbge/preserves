import { useNavigate } from "@solidjs/router";
import { onMount, For, createSignal } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore } from "solid-js/store";
import styles from "./index.module.css";
import { PolaroidPhoto } from "~/types/polaroid";
import { Polaroid } from "~/components/Polaroid";
import { stockImages, predefinedPositions } from "~/data/stockImages";
import { createDraggable } from "~/primitives/createDraggable";
import LoginForm from "~/components/LoginForm";
import {
  InfiniteCanvas,
  CanvasItem
} from "~/primitives/infiniteCanvas";
import {
  initializeCanvasPhotos,
  storeInitialPositions,
  getCanvasViewport,
  saveCanvasViewport,
  savePhotoPosition,
  savePhotoRotation
} from "~/utils/storage";
import { redirectIfAuthenticated } from "~/utils/authUtils";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement>();
  const [polaroidPhotos, setPolaroidPhotos] = createStore<PolaroidPhoto[]>([]);
  const [canvasWidth, setCanvasWidth] = createSignal(0);
  const [canvasHeight, setCanvasHeight] = createSignal(0);

  // Route identifier for storage - used by our unified storage API
  const route = "login";

  // Use guest username for consistent storage approach with dashboard
  const getUserName = () => "guest";
  const storageKeyPrefix = () => `peach_preserves_${getUserName()}_`;

  // Use our custom draggable primitive for polaroid dragging behavior
  const { draggedId, handleDragStart, handleTouchStart, isDragging } =
    createDraggable(polaroidPhotos, setPolaroidPhotos, {
      route,
      username: getUserName(),
      zIndexRange: { min: 0, max: 9 },
      cssModuleStyles: styles,
    });

  // Handle canvas viewport change
  const handleViewportChange = (viewport) => {
    saveCanvasViewport(viewport, route, getUserName());
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

    setPolaroidPhotos(photos);

    // Store initial positions if not already set
    storeInitialPositions(predefinedPositions, route, getUserName());

    // Add window resize handler
    const handleResize = () => {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // Handler for polaroid movement
  const handlePolaroidMove = (id: string, deltaX: number, deltaY: number) => {
    setPolaroidPhotos(
      (photo) => photo.id === id,
      "position",
      (pos) => ({
        x: (pos?.x || 0) + deltaX,
        y: (pos?.y || 0) + deltaY,
      })
    );
  };

  // Handler for end of polaroid movement
  const handlePolaroidMoveEnd = (id: string) => {
    const photo = polaroidPhotos.find((p) => p.id === id);
    if (photo && photo.position) {
      // Save position to localStorage with username
      savePhotoPosition(id, photo.position, route, getUserName());

      // Save rotation if available
      if (photo.rotation !== undefined) {
        savePhotoRotation(id, photo.rotation, route, getUserName());
      }
    }
  };

  return (
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>

      <div
        ref={setCorkboardRef}
        class={styles.corkboard}
        style={{
          width: `${canvasWidth()}px`,
          height: `${canvasHeight()}px`
        }}
      >
        <InfiniteCanvas
          showGrid={false}
          storageKey={`peach_preserves_${getUserName()}_${route}_canvas`}
          initialViewport={getCanvasViewport(route, getUserName()) || { position: { x: 0, y: 0 }, scale: 1 }}
          className={styles["canvas-container"]}
          onViewportChange={handleViewportChange}
        >
          <For each={polaroidPhotos}>
            {(photo) => (
              <CanvasItem
                id={photo.id}
                position={photo.position || { x: 0, y: 0 }}
                rotation={photo.rotation}
                zIndex={photo.zIndex}
                isDraggable={true}
                isSelected={isDragging(photo.id)}
                onSelect={(id, e) => handleDragStart(e, id)}
                onMove={handlePolaroidMove}
                onMoveEnd={handlePolaroidMoveEnd}
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
            )}
          </For>
        </InfiniteCanvas>

        <LoginForm />
      </div>
    </div>
  );
}