import { createSignal, onMount } from "solid-js";
import { Store, SetStoreFunction, produce } from "solid-js/store";
import { PolaroidPhoto } from "~/types/polaroid";
import { touchToMouseEvent, getHighestPolaroidZIndex } from "~/utils/polaroidUtils";

export interface DraggableOptions {
  route: string;  // Route identifier for storage
  username?: string;  // Optional username for user-specific storage
  zIndexRange?: { min: number; max: number };
  cssModuleStyles?: Record<string, string>;
}

export interface DraggableState {
  draggedId: () => string | null;
  handleDragStart: (e: MouseEvent, id: string) => void;
  handleTouchStart: (e: TouchEvent, id: string) => void;
  isDragging: (id: string) => boolean;
}

export function createDraggable<T extends PolaroidPhoto>(
  items: Store<T[]>,
  setItems: SetStoreFunction<T[]>,
  options: DraggableOptions
): DraggableState {
  const {
    route,
    username,
    zIndexRange = { min: 0, max: 9 },
    cssModuleStyles = {}
  } = options;

  // Drag state
  const [draggedId, setDraggedId] = createSignal<string | null>(null);
  const [dragStartX, setDragStartX] = createSignal(0);
  const [dragStartY, setDragStartY] = createSignal(0);
  const [initialX, setInitialX] = createSignal(0);
  const [initialY, setInitialY] = createSignal(0);

  // Handle drag start
  const handleDragStart = (e: MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the item
    const item = items.find((p) => p.id === id);
    if (!item) return;

    // Get the DOM element
    const element = document.getElementById(`canvas-item-${id}`);
    if (!element) return;

    // Get initial positions for this drag operation
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    setInitialX(item.position?.x || 0);
    setInitialY(item.position?.y || 0);

    // Start dragging
    setDraggedId(id);

    // Add styling if CSS module is provided
    if (cssModuleStyles.dragging) {
      element.classList.add(cssModuleStyles.dragging);
    }

    // Enable GPU acceleration
    element.style.willChange = "transform";

    // Bring to front, but stay within z-index range
    const currentZIndices = items.map((p) => p.zIndex || 0);
    const highestZIndex = getHighestPolaroidZIndex(currentZIndices);
    const newZIndex = Math.min(zIndexRange.max, highestZIndex + 1);

    // Update z-index in store
    setItems(
      (p) => p.id === id,
      produce((item) => {
        item.zIndex = newZIndex;
      }),
    );

    // Save z-index to localStorage
    try {
      // Using dynamic import to avoid circular dependencies
      import("~/utils/storage").then(({ savePhotoZIndex }) => {
        savePhotoZIndex(id, newZIndex, route, username);
      });
    } catch (err) {
      console.error("[DRAGGABLE] Error saving zIndex:", err);
    }
  };

  // Handle touch start by converting to mouse event
  const handleTouchStart = (e: TouchEvent, id: string) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const mouseEvent = touchToMouseEvent(e, 'mousedown');
      handleDragStart(mouseEvent, id);
    }
  };

  // Handle drag movement
  const handleDragMove = (e: MouseEvent) => {
    const id = draggedId();
    if (!id) return;

    // If mouse released, end drag
    if (e.buttons === 0) {
      handleDragEnd(e);
      return;
    }

    // Get element
    const element = document.getElementById(`canvas-item-${id}`);
    if (!element) return;

    // Calculate position delta from drag start
    const deltaX = e.clientX - dragStartX();
    const deltaY = e.clientY - dragStartY();

    // Calculate new position
    const x = initialX() + deltaX;
    const y = initialY() + deltaY;

    // Apply new position directly for immediate feedback
    setItems(
      (p) => p.id === id,
      produce((item) => {
        if (!item.position) item.position = { x: 0, y: 0 };
        item.position.x = x;
        item.position.y = y;
      })
    );
  };

  // Handle drag end
  const handleDragEnd = (e: MouseEvent) => {
    const id = draggedId();
    if (!id) return;

    // Calculate final position
    const deltaX = e.clientX - dragStartX();
    const deltaY = e.clientY - dragStartY();
    const x = initialX() + deltaX;
    const y = initialY() + deltaY;

    // Get element
    const element = document.getElementById(`canvas-item-${id}`);
    if (element) {
      if (cssModuleStyles.dragging) {
        element.classList.remove(cssModuleStyles.dragging);
      }
      element.style.willChange = "auto";
    }

    // Clear drag state
    setDraggedId(null);

    // Save to localStorage
    try {
      import("~/utils/storage").then(({ savePhotoPosition, savePhotoRotation }) => {
        // Save position
        savePhotoPosition(id, { x, y }, route, username);

        // Also save rotation if available
        const item = items.find(p => p.id === id);
        if (item?.rotation !== undefined) {
          savePhotoRotation(id, item.rotation, route, username);
        }
      });
    } catch (err) {
      console.error("[DRAGGABLE] Error saving position:", err);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    const id = draggedId();
    if (!id) return;
    
    // Get element
    const element = document.getElementById(`canvas-item-${id}`);
    if (element && cssModuleStyles.dragging) {
      element.classList.remove(cssModuleStyles.dragging);
    }

    // Clear drag state
    setDraggedId(null);
  };

  // Add mouse and touch event listeners
  onMount(() => {
    // Global event listeners
    const handleMove = (e: MouseEvent) => handleDragMove(e);
    const handleUp = (e: MouseEvent) => handleDragEnd(e);

    // Touch event handlers
    const handleTouchMove = (e: TouchEvent) => {
      if (draggedId() && e.touches.length === 1) {
        e.preventDefault();
        const mouseEvent = touchToMouseEvent(e, 'mousemove');
        handleDragMove(mouseEvent);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  });

  // Helper function to determine if an item is currently being dragged
  const isDragging = (id: string) => draggedId() === id;

  return {
    draggedId,
    handleDragStart,
    handleTouchStart,
    isDragging
  };
}