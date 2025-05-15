import {
  createSignal,
  onMount,
  onCleanup,
  children as resolveChildren,
  JSX,
  createEffect,
} from "solid-js";
import { createStore } from "solid-js/store";
import { TransformProvider } from "./TransformContext";
import styles from "./InfiniteCanvas.module.css";

export interface CanvasViewport {
  position: { x: number; y: number };
  scale: number;
}

export interface InfiniteCanvasProps {
  children?: JSX.Element;
  initialViewport?: CanvasViewport;
  minScale?: number;
  maxScale?: number;
  className?: string;
  showGrid?: boolean;
  gridSize?: number;
  storageKey?: string;
  onViewportChange?: (viewport: CanvasViewport) => void;
}

export function InfiniteCanvas(props: InfiniteCanvasProps) {
  // Default props
  const minScale = props.minScale || 0.1;
  const maxScale = props.maxScale || 5;
  const gridSize = props.gridSize || 50;
  const storageKey = props.storageKey || "peach_preserves_canvas_viewport";

  // Container and state refs
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [contentRef, setContentRef] = createSignal<HTMLDivElement>();

  // Viewport state using Solid's createStore
  const [viewport, setViewport] = createStore<CanvasViewport>(
    props.initialViewport || {
      position: { x: 0, y: 0 },
      scale: 1,
    },
  );

  // Interaction state
  const [isPanning, setIsPanning] = createSignal(false);
  const [lastPointerPosition, setLastPointerPosition] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const [isSpacebar, setIsSpacebar] = createSignal(false);

  // Load viewport from localStorage if available
  const loadViewport = () => {
    if (typeof window === "undefined" || !storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setViewport(parsed);
      }
    } catch (e) {
      console.error("Failed to load canvas viewport:", e);
    }
  };

  // Save viewport to localStorage
  const saveViewport = () => {
    if (typeof window === "undefined" || !storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(viewport));
    } catch (e) {
      console.error("Failed to save canvas viewport:", e);
    }
  };

  // Handle panning
  const startPan = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setLastPointerPosition({ x: clientX, y: clientY });
  };

  const updatePan = (clientX: number, clientY: number) => {
    if (!isPanning() || !lastPointerPosition()) return;

    const deltaX = clientX - lastPointerPosition()!.x;
    const deltaY = clientY - lastPointerPosition()!.y;

    setViewport("position", {
      x: viewport.position.x + deltaX,
      y: viewport.position.y + deltaY,
    });

    setLastPointerPosition({ x: clientX, y: clientY });
  };

  const endPan = () => {
    if (isPanning()) {
      setIsPanning(false);
      setLastPointerPosition(null);
      saveViewport();

      // Notify parent of viewport change
      if (props.onViewportChange) {
        props.onViewportChange(viewport);
      }
    }
  };

  // Handle mouse events
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && (isSpacebar() || e.target === containerRef())) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning()) {
      e.preventDefault();
      updatePan(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    endPan();
  };

  // Handle touch events
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      startPan(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      // Two fingers - we'll handle pinch-to-zoom
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isPanning() && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      updatePan(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      // Handle pinch-to-zoom
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // Calculate the distance between the touches
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );

      // Detect if this is the first move in the pinch
      if (!lastPinchDistance()) {
        setLastPinchDistance(distance);
        return;
      }

      // Calculate the delta distance since last move
      const deltaDistance = distance - lastPinchDistance()!;
      setLastPinchDistance(distance);

      // Calculate scale change based on distance change
      const scaleFactor = 1 + deltaDistance * 0.01;

      // Calculate midpoint of the two touches
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;

      // Zoom centered at the midpoint of the pinch
      zoomAtPoint(midX, midY, scaleFactor);
    }
  };

  const handleTouchEnd = () => {
    endPan();
    setLastPinchDistance(null);
  };

  // For pinch-to-zoom tracking
  const [lastPinchDistance, setLastPinchDistance] = createSignal<number | null>(
    null,
  );

  // Handle wheel zoom
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const container = containerRef();
    if (!container) return;

    // Determine zoom direction and factor
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;

    // Get mouse position relative to container
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    zoomAtPoint(mouseX, mouseY, scaleFactor);
  };

  // Zoom at specific point
  const zoomAtPoint = (pointX: number, pointY: number, scaleFactor: number) => {
    const container = containerRef();
    if (!container) return;

    // Calculate new scale, clamped to min/max
    const newScale = Math.max(
      minScale,
      Math.min(maxScale, viewport.scale * scaleFactor),
    );

    // If scale didn't change, don't do anything
    if (newScale === viewport.scale) return;

    // Get the position of the point in world coordinates before zoom
    const worldX = (pointX - viewport.position.x) / viewport.scale;
    const worldY = (pointY - viewport.position.y) / viewport.scale;

    // Calculate new position to keep the point at the same screen position
    const newPositionX = pointX - worldX * newScale;
    const newPositionY = pointY - worldY * newScale;

    setViewport({
      position: { x: newPositionX, y: newPositionY },
      scale: newScale,
    });

    saveViewport();

    // Notify parent of viewport change
    if (props.onViewportChange) {
      props.onViewportChange(viewport);
    }
  };

  // Reset canvas to initial state
  const resetCanvas = () => {
    setViewport(
      props.initialViewport || {
        position: { x: 0, y: 0 },
        scale: 1,
      },
    );
    saveViewport();

    // Notify parent of viewport change
    if (props.onViewportChange) {
      props.onViewportChange(viewport);
    }
  };

  // Keyboard handler for spacebar panning
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space" && !e.repeat) {
      setIsSpacebar(true);

      // Change cursor if container exists
      const container = containerRef();
      if (container) {
        container.style.cursor = "grab";
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      setIsSpacebar(false);

      // Reset cursor
      const container = containerRef();
      if (container) {
        container.style.cursor = "";
      }
    }
  };

  // Load viewport from localStorage on mount
  onMount(() => {
    loadViewport();

    // Add event listeners to window/document
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    onCleanup(() => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    });
  });

  // Children to render with proper reactivity
  const resolvedChildren = resolveChildren(() => props.children);

  // Notify parent of viewport changes
  createEffect(() => {
    if (props.onViewportChange) {
      props.onViewportChange(viewport);
    }
  });

  // Apply grid pattern that scales with zoom
  const createGridPattern = () => {
    if (!showGrid() || !props.showGrid) return "none";

    // Calculate visible grid size based on zoom level
    const visibleGridSize = gridSize * viewport.scale;

    // Calculate grid offset to keep it aligned as we pan
    const offsetX =
      ((viewport.position.x % visibleGridSize) + visibleGridSize) %
      visibleGridSize;
    const offsetY =
      ((viewport.position.y % visibleGridSize) + visibleGridSize) %
      visibleGridSize;

    return `
      linear-gradient(
        to right,
        rgba(0, 0, 0, 0.05) 1px,
        transparent 1px
      ),
      linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.05) 1px,
        transparent 1px
      )
    `;
  };

  // Grid drawing helpers
  const [showGrid, setShowGrid] = createSignal(props.showGrid || false);

  const gridStyle = () => {
    if (!showGrid() || !props.showGrid) return {};

    // Calculate visible grid size based on zoom level
    const visibleGridSize = gridSize * viewport.scale;

    // Calculate grid offset to keep it aligned as we pan
    const offsetX =
      ((viewport.position.x % visibleGridSize) + visibleGridSize) %
      visibleGridSize;
    const offsetY =
      ((viewport.position.y % visibleGridSize) + visibleGridSize) %
      visibleGridSize;

    return {
      backgroundImage: createGridPattern(),
      backgroundSize: `${visibleGridSize}px ${visibleGridSize}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
    };
  };

  return (
    <TransformProvider viewport={viewport}>
      <div
        ref={setContainerRef}
        class={`${styles["infinite-canvas-container"]} ${isPanning() ? styles.grabbing : ""} ${props.className || ""}`}
        style={{
          cursor: isPanning() ? "grabbing" : isSpacebar() ? "grab" : "default",
          ...gridStyle(),
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
      >
        <div
          ref={setContentRef}
          class={styles["infinite-canvas-content"]}
          style={{
            transform: `translate(${viewport.position.x}px, ${viewport.position.y}px) scale(${viewport.scale})`,
          }}
        >
          {resolvedChildren()}
        </div>

        {/* Optional controls - basic zoom in/out and reset */}
        <div class={styles["canvas-controls"]}>
          <button
            class={styles["canvas-control-button"]}
            onClick={() =>
              zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 1.2)
            }
            title="Zoom In"
          >
            +
          </button>
          <button
            class={styles["canvas-control-button"]}
            onClick={() =>
              zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 0.8)
            }
            title="Zoom Out"
          >
            -
          </button>
          <button
            class={styles["canvas-control-button"]}
            onClick={resetCanvas}
            title="Reset View"
          >
            ↺
          </button>
        </div>

        {/* Scale indicator */}
        <div class={styles["canvas-scale-indicator"]}>
          {Math.round(viewport.scale * 100)}%
        </div>
      </div>
    </TransformProvider>
  );
}

// Export a helper function for accessing the canvas functions from parent components
export function createInfiniteCanvas() {
  const resetViewport = (
    viewport: CanvasViewport = { position: { x: 0, y: 0 }, scale: 1 },
  ) => {
    return viewport;
  };

  return {
    resetViewport,
  };
}
