import {
  createSignal,
  onMount,
  onCleanup,
  children as resolveChildren,
  JSX,
  createEffect,
  createMemo,
  createContext,
  useContext,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { TransformProvider, Point, CanvasViewport } from "./TransformContext";
import { createInteractionManager } from "./InteractionManager";
import {
  InfiniteCanvasProps,
  InfiniteCanvasAPI,
  Z_INDEX_RANGES,
} from "~/types/infiniteCanvasTypes";
import styles from "./InfiniteCanvas.module.css";

// Create a context for the canvas API
const InfiniteCanvasContext = createContext<InfiniteCanvasAPI>();

// Access the canvas API in child components
export function useInfiniteCanvas() {
  const context = useContext(InfiniteCanvasContext);
  if (!context) {
    throw new Error("useInfiniteCanvas must be used within an InfiniteCanvas");
  }
  return context;
}

// Map of registered items with their positions and sizes
interface RegisteredItem {
  id: string;
  position: Point;
  size: { width: number; height: number };
}

export function InfiniteCanvas(props: InfiniteCanvasProps) {
  // Default props with destructuring for clarity
  const {
    initialViewport = { position: { x: 0, y: 0 }, scale: 1 },
    minScale = 0.1,
    maxScale = 5,
    gridSize = 50,
    storageKey = "peach_preserves_canvas_viewport",
    showGrid: initialShowGrid = false,
    panMode = "always",
    disablePanning = false,
    disableZooming = false,
    bounds,
    backgroundColor = "#f8f8f8",
  } = props;

  // Container and state refs
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [contentRef, setContentRef] = createSignal<HTMLDivElement>();
  const [containerRect, setContainerRect] = createSignal<DOMRect>();

  // Viewport state using Solid's createStore
  const [viewport, setViewport] = createStore<CanvasViewport>(initialViewport);

  // Item registration for advanced features
  const [registeredItems, setRegisteredItems] = createStore<RegisteredItem[]>(
    [],
  );

  // Interaction state with the interaction manager
  const [isSpacebar, setIsSpacebar] = createSignal(false);
  const [showGridState, setShowGridState] = createSignal(initialShowGrid);

  // Create interaction manager
  const interactionManager = createInteractionManager({
    options: {
      panPriority: panMode === "always" ? "high" : "normal",
      dragPriority: "normal",
    },
  });

  // For pinch-to-zoom tracking
  const [lastPinchDistance, setLastPinchDistance] = createSignal<number | null>(
    null,
  );

  // Load viewport from localStorage if available
  const loadViewport = () => {
    if (typeof window === "undefined" || !storageKey) {
      // Use initial viewport if no storage
      setViewport(initialViewport);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const storedViewport = JSON.parse(stored);
        setViewport(storedViewport);
      } else {
        // No stored viewport, use initial
        setViewport(initialViewport);
      }
    } catch (e) {
      console.error("[INFINITE CANVAS] Failed to load viewport from localStorage:", e);
      // Fallback to initial viewport
      setViewport(initialViewport);
    }
  };

  // Save viewport to localStorage
  const saveViewport = () => {
    if (typeof window === "undefined" || !storageKey) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(viewport));
    } catch (e) {
      console.error("[INFINITE CANVAS] Failed to save viewport:", e);
      // Silent fail - not critical
    }
  };

  // Handle panning - now using interaction manager
  const startPan = (clientX: number, clientY: number) => {
    const point = { x: clientX, y: clientY };

    // Start pan interaction
    interactionManager.startInteraction("pan", null, point, viewport);
  };

  const updatePan = (clientX: number, clientY: number) => {
    // Only update if we're in a pan interaction
    if (
      interactionManager.state.type !== "pan" ||
      !interactionManager.state.active
    ) {
      return;
    }

    // Calculate delta directly instead of relying on store state
    if (!interactionManager.state.startPoint || !interactionManager.state.startViewport) {
      return;
    }

    const delta = {
      dx: clientX - interactionManager.state.startPoint.x,
      dy: clientY - interactionManager.state.startPoint.y
    };

    // Calculate new position with bounds check
    let newX = interactionManager.state.startViewport.position.x + delta.dx;
    let newY = interactionManager.state.startViewport.position.y + delta.dy;

    // Apply bounds if specified
    if (bounds) {
      newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
      newY = Math.max(bounds.minY, Math.min(bounds.maxY, newY));
    }

    // Update viewport position
    setViewport("position", { x: newX, y: newY });

    // Update interaction position for consistency
    interactionManager.updateInteraction({ x: clientX, y: clientY });
  };

  const endPan = () => {
    // Only end if we're in a pan interaction
    if (
      interactionManager.state.type === "pan" &&
      interactionManager.state.active
    ) {
      // End the interaction
      interactionManager.endInteraction();

      // Persist viewport
      saveViewport();

      // Notification happens via createEffect
    }
  };

  // Handle mouse events with interaction management
  const handleMouseDown = (e: MouseEvent) => {
    // Check if we can handle pan based on mode and spacebar
    const canPan =
      panMode === "always" ||
      (panMode === "spacebar" && isSpacebar()) ||
      (panMode === "middle-button" && e.button === 1);

    if (canPan && !disablePanning) {
      // Add spacebar info to event
      (e as any).spacebarPressed = isSpacebar();

      if (interactionManager.shouldHandlePan(e)) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (
      interactionManager.state.type === "pan" &&
      interactionManager.state.active
    ) {
      e.preventDefault();
      updatePan(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (
      interactionManager.state.type === "pan" &&
      interactionManager.state.active
    ) {
      e.preventDefault();
      endPan();
    }
  };

  // Handle touch events with multi-touch support
  const handleTouchStart = (e: TouchEvent) => {
    // Single touch - potential panning
    if (e.touches.length === 1 && !disablePanning) {
      // Check if we should handle this touch for panning
      if (interactionManager.shouldHandlePan(e)) {
        e.preventDefault();
        const touch = e.touches[0];
        startPan(touch.clientX, touch.clientY);
      }
    }
    // Double touch - pinch zoom
    else if (e.touches.length === 2 && !disableZooming) {
      e.preventDefault();
      setLastPinchDistance(null);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Handle single touch panning
    if (
      interactionManager.state.type === "pan" &&
      interactionManager.state.active &&
      e.touches.length === 1
    ) {
      e.preventDefault();
      const touch = e.touches[0];
      updatePan(touch.clientX, touch.clientY);
    }
    // Handle pinch-to-zoom with two fingers
    else if (e.touches.length === 2 && !disableZooming) {
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

      // Calculate zoom factor from distance change
      const deltaDistance = distance - lastPinchDistance()!;
      const scaleFactor = 1 + deltaDistance * 0.01;
      setLastPinchDistance(distance);

      // Calculate midpoint as zoom center
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;

      // Apply zoom
      zoomAtPoint(midX, midY, scaleFactor);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      endPan();
      setLastPinchDistance(null);
    }
  };

  // Handle wheel zoom with bounds checking
  const handleWheel = (e: WheelEvent) => {
    if (disableZooming) return;

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

  // Zoom at specific point - improved version with better numeric stability
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

    // Find the point in world space before scaling
    // This formula converts from screen to world coordinates
    const worldX = (pointX - viewport.position.x) / viewport.scale;
    const worldY = (pointY - viewport.position.y) / viewport.scale;

    // Calculate new position to keep the point stationary on screen
    // This ensures the world point under the mouse/touch stays fixed during zoom
    const newPositionX = pointX - worldX * newScale;
    const newPositionY = pointY - worldY * newScale;

    // Apply bounds if specified
    let finalPositionX = newPositionX;
    let finalPositionY = newPositionY;

    if (bounds) {
      finalPositionX = Math.max(
        bounds.minX,
        Math.min(bounds.maxX, finalPositionX),
      );
      finalPositionY = Math.max(
        bounds.minY,
        Math.min(bounds.maxY, finalPositionY),
      );
    }

    // Update viewport with the new transform
    const newViewport = {
      position: {
        x: finalPositionX,
        y: finalPositionY,
      },
      scale: newScale,
    };

    setViewport(newViewport);

    // Persist the change
    saveViewport();
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

  // Window resize handler
  const handleResize = () => {
    // Update container rect on resize
    const container = containerRef();
    if (container) {
      setContainerRect(container.getBoundingClientRect());
    }
  };

  // Setup on mount
  onMount(() => {
    // Force window size to be accurate using meta tag in document head
    if (typeof document !== 'undefined') {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }

    // Set initial container rect
    const container = containerRef();
    if (container) {
      const rect = container.getBoundingClientRect();
      setContainerRect(rect);
    }

    // Load viewport from localStorage or use initial
    loadViewport();

    // Event listeners for keyboard and window resize
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
    });
  });

  // API Methods for the canvas context

  // Pan to a specific world position
  const panTo = (x: number, y: number, options?: { animate?: boolean }) => {
    // Calculate new position in screen space
    const container = containerRef();
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Convert world to screen, centering it
    const newPositionX = centerX - x * viewport.scale;
    const newPositionY = centerY - y * viewport.scale;

    // Adjust for bounds
    let finalX = newPositionX;
    let finalY = newPositionY;

    if (bounds) {
      finalX = Math.max(bounds.minX, Math.min(bounds.maxX, finalX));
      finalY = Math.max(bounds.minY, Math.min(bounds.maxY, finalY));
    }

    // Apply new position
    if (options?.animate) {
      // TODO: Implement smooth animation
      // For now, just set directly
      setViewport("position", { x: finalX, y: finalY });
    } else {
      setViewport("position", { x: finalX, y: finalY });
    }

    saveViewport();
  };

  // Zoom to a specific scale factor
  const zoomTo = (
    scale: number,
    center?: Point,
    options?: { animate?: boolean },
  ) => {
    // Clamp scale to bounds
    const newScale = Math.max(minScale, Math.min(maxScale, scale));

    // If no change needed, return
    if (newScale === viewport.scale) return;

    // Get container dimensions
    const container = containerRef();
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Use provided center or default to container center
    const centerX = center?.x ?? rect.width / 2;
    const centerY = center?.y ?? rect.height / 2;

    // Calculate the world point at the center
    const worldX = (centerX - viewport.position.x) / viewport.scale;
    const worldY = (centerY - viewport.position.y) / viewport.scale;

    // Calculate new position to keep the center stationary
    const newPositionX = centerX - worldX * newScale;
    const newPositionY = centerY - worldY * newScale;

    // Apply bounds if specified
    let finalX = newPositionX;
    let finalY = newPositionY;

    if (bounds) {
      finalX = Math.max(bounds.minX, Math.min(bounds.maxX, finalX));
      finalY = Math.max(bounds.minY, Math.min(bounds.maxY, finalY));
    }

    // Apply new viewport
    if (options?.animate) {
      // TODO: Implement smooth animation
      // For now, just set directly
      setViewport({
        position: { x: finalX, y: finalY },
        scale: newScale,
      });
    } else {
      setViewport({
        position: { x: finalX, y: finalY },
        scale: newScale,
      });
    }

    saveViewport();
  };

  // Center on a specific item by ID
  const centerOn = (
    itemId: string,
    options?: { scale?: number; animate?: boolean },
  ) => {
    // Find the item by ID in registered items
    const item = registeredItems.find((item) => item.id === itemId);

    // If not found in registered items, try the parent's callback
    if (!item && props.onGetItemPosition) {
      const position = props.onGetItemPosition(itemId);
      if (position) {
        // Use the provided scale or maintain current
        const targetScale = options?.scale ?? viewport.scale;
        panTo(position.x, position.y, { animate: options?.animate });

        if (targetScale !== viewport.scale) {
          zoomTo(targetScale, undefined, { animate: options?.animate });
        }
        return;
      }
    } else if (item) {
      // Center on the registered item
      const targetScale = options?.scale ?? viewport.scale;

      // Center on the item's middle point
      const centerX = item.position.x + item.size.width / 2;
      const centerY = item.position.y + item.size.height / 2;

      panTo(centerX, centerY, { animate: options?.animate });

      if (targetScale !== viewport.scale) {
        zoomTo(targetScale, undefined, { animate: options?.animate });
      }
      return;
    }

    // If we couldn't find the item, do nothing
  };

  // Reset view to initial state or center on focal point
  const resetView = (options?: { animate?: boolean }) => {
    if (props.focalPointId) {
      // Try to center on focal point
      centerOn(props.focalPointId, { scale: 1, animate: options?.animate });
    } else {
      // Reset to initial viewport
      if (options?.animate) {
        // TODO: Add animation
        setViewport(initialViewport);
      } else {
        setViewport(initialViewport);
      }
      saveViewport();
    }
  };

  // Check if an item is visible in the current viewport
  const isItemVisible = (itemId: string): boolean => {
    // First check registered items
    const item = registeredItems.find((item) => item.id === itemId);
    if (item) {
      // Create a rect from the item
      const rect = {
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
      };

      // Check if any part of it is visible
      return isRectVisible(rect);
    }

    // If not registered, check with parent callback
    if (props.onGetItemPosition) {
      const position = props.onGetItemPosition(itemId);
      if (position) {
        // Check if the point is visible using our existing transform functionality
        return isPointVisible(position);
      }
    }

    return false;
  };

  // Helper to check if a point is visible
  const isPointVisible = (point: { x: number; y: number }): boolean => {
    // Convert world point to screen coordinates
    const screenPoint = {
      x: point.x * viewport.scale + viewport.position.x,
      y: point.y * viewport.scale + viewport.position.y,
    };

    // Check if the point is within the container bounds
    const rect = containerRect();
    if (!rect) return true; // If we don't have container dimensions, assume it's visible

    return (
      screenPoint.x >= 0 &&
      screenPoint.x <= rect.width &&
      screenPoint.y >= 0 &&
      screenPoint.y <= rect.height
    );
  };

  // Helper to check if a rectangle is visible
  const isRectVisible = (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean => {
    const container = containerRef();
    if (!container) return false;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Convert rect corners to screen space
    const topLeft = {
      x: rect.x * viewport.scale + viewport.position.x,
      y: rect.y * viewport.scale + viewport.position.y,
    };

    const bottomRight = {
      x: (rect.x + rect.width) * viewport.scale + viewport.position.x,
      y: (rect.y + rect.height) * viewport.scale + viewport.position.y,
    };

    // Check if any part of the rect is visible
    return !(
      bottomRight.x < 0 ||
      bottomRight.y < 0 ||
      topLeft.x > containerWidth ||
      topLeft.y > containerHeight
    );
  };

  // Register an item with the canvas
  const registerItem = (
    id: string,
    position: Point,
    size: { width: number; height: number },
  ) => {
    // Check if item is already registered
    const existing = registeredItems.findIndex((item) => item.id === id);

    if (existing >= 0) {
      // Update existing item
      setRegisteredItems(
        produce((items) => {
          items[existing].position = position;
          items[existing].size = size;
        }),
      );
    } else {
      // Add new item
      setRegisteredItems(
        produce((items) => {
          items.push({ id, position, size });
        }),
      );
    }
  };

  // Unregister an item
  const unregisterItem = (id: string) => {
    setRegisteredItems(
      produce((items) => {
        const index = items.findIndex((item) => item.id === id);
        if (index >= 0) {
          items.splice(index, 1);
        }
      }),
    );
  };

  // Set grid visibility
  const setGridVisible = (visible: boolean) => {
    setShowGridState(visible);
  };

  // Notify parent of viewport changes
  createEffect(() => {
    if (props.onViewportChange) {
      props.onViewportChange(viewport);

      // Debug: Show what world coordinates are at the center of the screen
      const container = containerRef();
      if (container) {
        const centerScreenX = container.clientWidth / 2;
        const centerScreenY = container.clientHeight / 2;
        const centerWorldX =
          (centerScreenX - viewport.position.x) / viewport.scale;
        const centerWorldY =
          (centerScreenY - viewport.position.y) / viewport.scale;
        console.log(
          "[INFINITE CANVAS] Viewport changed - World coordinates at screen center:",
          { x: centerWorldX, y: centerWorldY },
          "Viewport:",
          viewport,
        );
      }
    }
  });

  // Z-index management
  const [zIndexRegistry, setZIndexRegistry] = createStore<
    { id: string; zIndex: number; itemType: "photo" | "menu" | "system" }[]
  >([]);

  // Get next available zIndex in a range
  const getNextZIndex = (range: { MIN: number; MAX: number }): number => {
    const zIndicesInRange = zIndexRegistry
      .filter((item) => item.zIndex >= range.MIN && item.zIndex <= range.MAX)
      .map((item) => item.zIndex);

    if (zIndicesInRange.length === 0) {
      return range.MIN;
    }

    // Find first available index in range
    for (let i = range.MIN; i <= range.MAX; i++) {
      if (!zIndicesInRange.includes(i)) {
        return i;
      }
    }

    // If no gaps, return highest + 1 (capped at MAX)
    return Math.min(Math.max(...zIndicesInRange) + 1, range.MAX);
  };

  // Set an item's z-index
  const setItemZIndex = (id: string, position: "front" | "back" | number) => {
    // Find the item in registered items
    const itemIndex = registeredItems.findIndex((item) => item.id === id);
    if (itemIndex === -1) return;

    // Find if already in registry
    const registryIndex = zIndexRegistry.findIndex((item) => item.id === id);

    // Determine item type from ID pattern or metadata
    const itemType = id.startsWith("menu-")
      ? "menu"
      : id.startsWith("system-")
        ? "system"
        : "photo";

    // Determine which range to use
    const range =
      itemType === "menu"
        ? Z_INDEX_RANGES.MENU_ITEMS
        : itemType === "system"
          ? Z_INDEX_RANGES.SYSTEM
          : Z_INDEX_RANGES.PHOTOS;

    let newZIndex: number;

    // Handle special positions
    if (position === "front") {
      // Get highest z-index in the range and add 1
      const maxCurrentZIndex = Math.max(
        range.MIN - 1,
        ...zIndexRegistry
          .filter(
            (item) =>
              item.zIndex >= range.MIN &&
              item.zIndex <= range.MAX &&
              item.id !== id,
          )
          .map((item) => item.zIndex),
      );
      newZIndex = Math.min(maxCurrentZIndex + 1, range.MAX);
    } else if (position === "back") {
      // Get lowest z-index in the range and subtract 1
      const minCurrentZIndex = Math.min(
        range.MAX + 1,
        ...zIndexRegistry
          .filter(
            (item) =>
              item.zIndex >= range.MIN &&
              item.zIndex <= range.MAX &&
              item.id !== id,
          )
          .map((item) => item.zIndex),
      );
      newZIndex = Math.max(minCurrentZIndex - 1, range.MIN);
    } else {
      // Use provided z-index if in range, otherwise clamp
      newZIndex = Math.max(range.MIN, Math.min(range.MAX, position));
    }

    // Update registry
    if (registryIndex >= 0) {
      setZIndexRegistry(registryIndex, {
        id,
        zIndex: newZIndex,
        itemType,
      });
    } else {
      setZIndexRegistry((registry) => [
        ...registry,
        {
          id,
          zIndex: newZIndex,
          itemType,
        },
      ]);
    }

    // Broadcast the z-index change to parent component via custom event
    if (typeof window !== "undefined") {
      const event = new CustomEvent("canvas-item-zindex-change", {
        detail: { id, zIndex: newZIndex },
      });
      window.dispatchEvent(event);
    }
  };

  // Create API for context
  const canvasApi: InfiniteCanvasAPI = {
    panTo,
    zoomTo,
    centerOn,
    resetView,
    getViewport: () => viewport,
    isItemVisible,
    registerItem,
    unregisterItem,
    setItemZIndex,
    setGridVisible,
  };

  // Grid drawing helpers with improved reactivity
  const gridStyle = createMemo(() => {
    if (!showGridState()) return {};

    // Calculate visible grid size based on zoom level
    const visibleGridSize = gridSize * viewport.scale;

    // Calculate grid offset to keep it aligned as we pan
    const offsetX = viewport.position.x % visibleGridSize;
    const offsetY = viewport.position.y % visibleGridSize;

    return {
      backgroundImage: `
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
      `,
      backgroundSize: `${visibleGridSize}px ${visibleGridSize}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
    };
  });

  // Children to render with proper reactivity
  const resolvedChildren = resolveChildren(() => props.children);

  // Cursor state
  const cursorStyle = createMemo(() => {
    if (
      interactionManager.state.type === "pan" &&
      interactionManager.state.active
    ) {
      return "grabbing";
    } else if (isSpacebar()) {
      return "grab";
    } else {
      return "default";
    }
  });

  return (
    <InfiniteCanvasContext.Provider value={canvasApi}>
      <TransformProvider viewport={viewport} containerRect={containerRect()}>
        <div
          ref={setContainerRef}
          class={`${styles["infinite-canvas-container"]} ${
            interactionManager.state.type === "pan" &&
            interactionManager.state.active
              ? styles.grabbing
              : ""
          } ${props.className || ""}`}
          data-canvas-container="true"
          style={{
            cursor: cursorStyle(),
            "background-color": backgroundColor,
            ...gridStyle(),
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
              onClick={() => {
                const container = containerRef();
                if (container) {
                  const rect = container.getBoundingClientRect();
                  zoomAtPoint(rect.width / 2, rect.height / 2, 1.2);
                }
              }}
              title="Zoom In"
            >
              +
            </button>
            <button
              class={styles["canvas-control-button"]}
              onClick={() => {
                const container = containerRef();
                if (container) {
                  const rect = container.getBoundingClientRect();
                  zoomAtPoint(rect.width / 2, rect.height / 2, 0.8);
                }
              }}
              title="Zoom Out"
            >
              -
            </button>
            <button
              class={styles["canvas-control-button"]}
              onClick={() => resetView({ animate: true })}
              title="Reset View"
            >
              ↺
            </button>
            
            {/* Scale indicator */}
            <div class={styles["canvas-scale-indicator"]}>
              {Math.round(viewport.scale * 100)}%
            </div>
          </div>
        </div>
      </TransformProvider>
    </InfiniteCanvasContext.Provider>
  );
}

// Export a helper function for accessing the canvas functions from parent components
export function createInfiniteCanvas() {
  // This function now returns a proper API
  return {
    // Factory methods for creating a standalone canvas API
    createAPI: (setViewport, viewport, options): InfiniteCanvasAPI => {
      const { minScale = 0.1, maxScale = 5 } = options || {};

      return {
        panTo: (x, y, options) => {
          // Calculate position to center on (x, y)
          const newPositionX = window.innerWidth / 2 - x * viewport.scale;
          const newPositionY = window.innerHeight / 2 - y * viewport.scale;

          // Apply new position
          setViewport("position", { x: newPositionX, y: newPositionY });

          // Animation would go here...
        },
        zoomTo: (scale, center, options) => {
          // Clamp scale to bounds
          const newScale = Math.max(minScale, Math.min(maxScale, scale));

          // Use provided center or default to window center
          const centerX = center?.x ?? window.innerWidth / 2;
          const centerY = center?.y ?? window.innerHeight / 2;

          // Calculate world coordinates of center
          const worldX = (centerX - viewport.position.x) / viewport.scale;
          const worldY = (centerY - viewport.position.y) / viewport.scale;

          // Compute new position
          const newPositionX = centerX - worldX * newScale;
          const newPositionY = centerY - worldY * newScale;

          // Set new viewport
          setViewport({
            position: {
              x: newPositionX,
              y: newPositionY,
            },
            scale: newScale,
          });

          // Animation would go here...
        },
        centerOn: (itemId, options) => {
          // Implementation would depend on having access to items
        },
        resetView: (options) => {
          // Reset to initial viewport
          setViewport({
            position: { x: 0, y: 0 },
            scale: 1,
          });
        },
        getViewport: () => viewport,
        isItemVisible: () => false, // Needs item registry
        registerItem: () => {}, // No-op in this simple implementation
        unregisterItem: () => {}, // No-op in this simple implementation
        setGridVisible: () => {}, // No-op in this simple implementation
      };
    },
  };
}
