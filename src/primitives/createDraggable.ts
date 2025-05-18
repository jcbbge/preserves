import { createSignal, onMount, onCleanup, createEffect } from "solid-js";
import { Store, SetStoreFunction } from "solid-js/store";
import { Point, Vector, TransformContextValue } from "./infiniteCanvas/TransformContext";
import { InfiniteCanvasAPI } from "./infiniteCanvas/types";
import { findParentCanvasItem } from "./infiniteCanvas/CanvasItem";

/**
 * Configuration options for the draggable system
 */
export interface DraggableOptions {
  // Storage/persistence options
  route: string;  // Route identifier for storage
  username?: string;  // Optional username for user-specific storage
  
  // Visual options
  zIndexRange?: { min: number; max: number };
  cssModuleStyles?: Record<string, string>;
  
  // Behavioral options
  useDirectManipulation?: boolean; // Whether to drag with DOM manipulation
  dragPriority?: 'high' | 'normal' | 'low'; // Priority for drag interactions
  dragThreshold?: number; // Distance in pixels before drag starts
  
  // Integration options
  transformContext?: TransformContextValue; // Optional transform context for coordinate conversion
  canvasAPI?: InfiniteCanvasAPI; // Optional canvas API for registration and z-index
  
  // Callbacks
  onDragStart?: (id: string, worldPosition: Point) => void;
  onDragMove?: (id: string, worldPosition: Point, delta: Vector) => void;
  onDragEnd?: (id: string, worldPosition: Point) => void;
  onDragCancel?: (id: string) => void;
}

/**
 * The public API returned by createDraggable
 */
export interface DraggableState {
  // Core state accessors
  draggedId: () => string | null;
  isDragging: (id: string) => boolean;
  
  // Event handlers for CanvasItem integration
  handleDragStart: (e: MouseEvent, id: string) => void;
  handleDragMove: (id: string, delta: Vector) => void;
  handleDragEnd: (id: string, finalPosition: Point) => void;
  handleTouchStart: (e: TouchEvent, id: string) => void;
  
  // Control methods
  cancelDrag: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
}

/**
 * Interface for draggable items
 */
export interface DraggableItem {
  id: string;
  position: Point;
  rotation?: number;
  zIndex?: number;
}

/**
 * Creates a draggable system for items that integrates with InfiniteCanvas
 */
export function createDraggable<T extends DraggableItem>(
  items: Store<T[]>,
  setItems: SetStoreFunction<T[]>,
  options: DraggableOptions
): DraggableState {
  // Destructure options with defaults
  const {
    route,
    username,
    zIndexRange = { min: 0, max: 9 },
    cssModuleStyles = {},
    useDirectManipulation = false,
    dragPriority = 'normal',
    dragThreshold = 3,
    transformContext,
    canvasAPI,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel
  } = options;

  // Main drag state
  const [draggedId, setDraggedId] = createSignal<string | null>(null);
  
  // Detailed tracking state for dragging operations
  const [dragState, setDragState] = createSignal<{
    id: string;
    // Screen coordinates
    startScreenX: number;
    startScreenY: number;
    currentScreenX: number;
    currentScreenY: number;
    // World coordinates
    startWorldPos: Point;
    currentWorldPos: Point;
    // State flags
    isDragActive: boolean;
    hasMoved: boolean;
  } | null>(null);
  
  /**
   * Convert screen coordinates to world coordinates
   */
  const screenToWorld = (screenX: number, screenY: number): Point => {
    if (transformContext) {
      return transformContext.screenToWorld({ x: screenX, y: screenY });
    } else {
      // If no transform context, assume 1:1 mapping
      return { x: screenX, y: screenY };
    }
  };
  
  /**
   * Convert world coordinates to screen coordinates
   */
  const worldToScreen = (worldX: number, worldY: number): Point => {
    if (transformContext) {
      return transformContext.worldToScreen({ x: worldX, y: worldY });
    } else {
      // If no transform context, assume 1:1 mapping
      return { x: worldX, y: worldY };
    }
  };
  
  /**
   * Get an item from the store by id
   */
  const getItemById = (id: string): T | undefined => {
    return items.find(item => item.id === id);
  };
  
  /**
   * Update an item's position in the store
   */
  const updateItemPosition = (id: string, position: Point): void => {
    setItems(
      item => item.id === id,
      "position",
      position
    );
  };
  
  /**
   * Register drag start with canvas API
   */
  const registerDragWithCanvas = (id: string): boolean => {
    if (!canvasAPI || !canvasAPI.getInteractionManager) {
      return true; // No canvas API, allow by default
    }
    
    const interactionManager = canvasAPI.getInteractionManager();
    if (!interactionManager || !interactionManager.startInteraction) {
      return true; // No interaction manager, allow by default
    }
    
    // Try to register interaction with the canvas using proper types
    return interactionManager.startInteraction({
      type: 'drag',
      target: id,
      priority: dragPriority,
    });
  };
  
  /**
   * End drag interaction with canvas API
   */
  const endDragWithCanvas = (id: string): void => {
    if (!canvasAPI || !canvasAPI.getInteractionManager) {
      return;
    }
    
    const interactionManager = canvasAPI.getInteractionManager();
    if (!interactionManager || !interactionManager.endInteraction) {
      return;
    }
    
    interactionManager.endInteraction({
      type: 'drag',
      target: id,
    });
  };
  
  /**
   * Enhanced drag start handler with InfiniteCanvas integration
   */
  const handleDragStart = (e: MouseEvent, id: string): void => {
    // Find the item in store
    const item = getItemById(id);
    if (!item) {
      return;
    }
    
    // Check if canvas allows this drag operation
    if (!registerDragWithCanvas(id)) {
      return; // Canvas rejected the drag operation
    }
    
    // Prevent default behaviors
    e.preventDefault();
    e.stopPropagation();
    
    // Determine start coordinates in both screen and world space
    const startScreenPoint = { x: e.clientX, y: e.clientY };
    const startWorldPoint = transformContext 
      ? transformContext.screenToWorld(startScreenPoint)
      : item.position; // Fallback to item position if no transform
    
    // Update drag state
    setDraggedId(id);
    setDragState({
      id,
      startScreenX: startScreenPoint.x,
      startScreenY: startScreenPoint.y,
      currentScreenX: startScreenPoint.x,
      currentScreenY: startScreenPoint.y,
      startWorldPos: item.position,
      currentWorldPos: item.position,
      isDragActive: true,
      hasMoved: false
    });
    
    // Notify via callback if provided
    if (onDragStart) {
      onDragStart(id, item.position);
    }
    
    // Optional: bring item to front during drag
    if (canvasAPI && canvasAPI.setItemZIndex) {
      canvasAPI.setItemZIndex(id, "front");
    }
    
    // Define move handler - tracks both screen and world coordinates
    const moveHandler = (moveEvent: MouseEvent): void => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const currentState = dragState();
      if (!currentState || currentState.id !== id) return;
      
      // Get current screen coordinates
      const currentScreenX = moveEvent.clientX;
      const currentScreenY = moveEvent.clientY;
      
      // Check if moved beyond threshold
      const screenDeltaX = currentScreenX - currentState.startScreenX;
      const screenDeltaY = currentScreenY - currentState.startScreenY;
      
      // Calculate movement distance for threshold check
      const distance = Math.sqrt(screenDeltaX * screenDeltaX + screenDeltaY * screenDeltaY);
      const hasMoved = distance >= dragThreshold;
      
      // Get world coordinates from screen coordinates
      const currentWorldPos = transformContext
        ? transformContext.screenToWorld({ x: currentScreenX, y: currentScreenY })
        : { 
            x: currentState.startWorldPos.x + screenDeltaX, 
            y: currentState.startWorldPos.y + screenDeltaY 
          };
      
      // Calculate world delta (useful for callbacks)
      const worldDelta: Vector = {
        dx: currentWorldPos.x - currentState.startWorldPos.x,
        dy: currentWorldPos.y - currentState.startWorldPos.y
      };
      
      // Update drag state
      setDragState({
        ...currentState,
        currentScreenX,
        currentScreenY,
        currentWorldPos,
        hasMoved
      });
      
      // Only proceed if we've moved beyond threshold
      if (!hasMoved) return;
      
      // If direct manipulation is enabled, update DOM directly
      if (useDirectManipulation) {
        const element = document.getElementById(`canvas-item-${id}`);
        if (element) {
          // In direct manipulation, apply screen delta directly to DOM
          // This bypasses the react flow for smoother dragging
          const transform = element.style.transform || '';
          const baseTransform = transform.replace(/translate\([^)]*\)/g, '');
          element.style.transform = `translate(${screenDeltaX}px, ${screenDeltaY}px) ${baseTransform}`;
        }
      }
      
      // Update store with new world position
      updateItemPosition(id, currentWorldPos);
      
      // Call custom handler if provided
      if (onDragMove) {
        onDragMove(id, currentWorldPos, worldDelta);
      }
    };
    
    // Define up handler
    const upHandler = (upEvent: MouseEvent): void => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      
      const currentState = dragState();
      if (!currentState || currentState.id !== id) return;
      
      // Remove event listeners first to prevent any further events
      window.removeEventListener('mousemove', moveHandler, { capture: true });
      window.removeEventListener('mouseup', upHandler, { capture: true });
      
      // Get final position from state
      const finalWorldPos = currentState.currentWorldPos;
      
      // If we haven't moved significantly, treat as a click
      if (!currentState.hasMoved) {
        // Restore original position
        updateItemPosition(id, currentState.startWorldPos);
      } else {
        // Save position to storage
        try {
          import("~/utils/storage").then(({ savePhotoPosition }) => {
            savePhotoPosition(id, finalWorldPos, route, username);
          });
        } catch (err) {
          // Silent fail - position will not be persisted but still in memory
        }
      }
      
      // End interaction with canvas
      endDragWithCanvas(id);
      
      // Clear drag state
      setDraggedId(null);
      setDragState(null);
      
      // Call custom handler if provided
      if (onDragEnd) {
        onDragEnd(id, finalWorldPos);
      }
    };
    
    // Add handlers - use capture to get events before they're stopped
    window.addEventListener('mousemove', moveHandler, { capture: true });
    window.addEventListener('mouseup', upHandler, { capture: true });
  };
  
  /**
   * Handle drag move - accepts delta in world coordinates
   */
  const handleDragMove = (id: string, delta: Vector): void => {
    const currentState = dragState();
    if (!currentState || currentState.id !== id) return;
    
    // Calculate new world position
    const newWorldPos: Point = {
      x: currentState.startWorldPos.x + delta.dx,
      y: currentState.startWorldPos.y + delta.dy
    };
    
    // Update store with new position
    updateItemPosition(id, newWorldPos);
    
    // Update drag state with new world position
    setDragState({
      ...currentState,
      currentWorldPos: newWorldPos,
      // Calculate screen coordinates for direct DOM updates
      currentScreenX: currentState.startScreenX + (transformContext 
        ? transformContext.scaleWorldDistance(delta.dx) 
        : delta.dx),
      currentScreenY: currentState.startScreenY + (transformContext
        ? transformContext.scaleWorldDistance(delta.dy)
        : delta.dy),
      hasMoved: true
    });
    
    // Call custom handler if provided
    if (onDragMove) {
      onDragMove(id, newWorldPos, delta);
    }
  };
  
  /**
   * Handle drag end - finalizes the drag with given world position
   */
  const handleDragEnd = (id: string, finalPosition: Point): void => {
    const currentState = dragState();
    if (!currentState || currentState.id !== id) return;
    
    // Update position in store
    updateItemPosition(id, finalPosition);
    
    // Save to storage
    try {
      import("~/utils/storage").then(({ savePhotoPosition }) => {
        savePhotoPosition(id, finalPosition, route, username);
      });
    } catch (err) {
      // Silent fail - position will not be persisted but still in memory
    }
    
    // End interaction with canvas
    endDragWithCanvas(id);
    
    // Clear drag state
    setDraggedId(null);
    setDragState(null);
    
    // Call custom handler if provided
    if (onDragEnd) {
      onDragEnd(id, finalPosition);
    }
  };
  
  /**
   * Touch start handler - converts touch to mouse event
   */
  const handleTouchStart = (e: TouchEvent, id: string): void => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window,
      }) as MouseEvent;
      
      handleDragStart(mouseEvent, id);
    }
  };
  
  /**
   * Cancel ongoing drag operation - important for interrupted drags
   */
  const cancelDrag = (): void => {
    const id = draggedId();
    const state = dragState();
    
    if (id && state) {
      // End canvas interaction
      endDragWithCanvas(id);
      
      // Restore original position
      updateItemPosition(id, state.startWorldPos);
      
      // Notify via callback
      if (onDragCancel) {
        onDragCancel(id);
      }
    }
    
    // Clear drag state
    setDraggedId(null);
    setDragState(null);
  };
  
  /**
   * Bring item to front of z-index stack
   */
  const bringToFront = (id: string): void => {
    if (canvasAPI && canvasAPI.setItemZIndex) {
      canvasAPI.setItemZIndex(id, "front");
    } else {
      // Import Z_INDEX_RANGES
      const { Z_INDEX_RANGES } = require('./infiniteCanvas/types');
      
      // Determine appropriate z-index range based on id pattern
      const range = id.startsWith('menu-') ? Z_INDEX_RANGES.MENU_ITEMS :
                   id.startsWith('system-') ? Z_INDEX_RANGES.SYSTEM :
                   Z_INDEX_RANGES.PHOTOS;
      
      // Fallback to manually setting high z-index
      setItems(
        item => item.id === id,
        "zIndex",
        range.MAX
      );
    }
    
    // If dragging, set to even higher z-index range
    if (draggedId() === id) {
      const { Z_INDEX_RANGES } = require('./infiniteCanvas/types');
      setItems(
        item => item.id === id,
        "zIndex",
        Z_INDEX_RANGES.DRAGGING.MAX
      );
    }
  };
  
  /**
   * Send item to back of z-index stack
   */
  const sendToBack = (id: string): void => {
    if (canvasAPI && canvasAPI.setItemZIndex) {
      canvasAPI.setItemZIndex(id, "back");
    } else {
      // Import Z_INDEX_RANGES
      const { Z_INDEX_RANGES } = require('./infiniteCanvas/types');
      
      // Determine appropriate z-index range based on id pattern
      const range = id.startsWith('menu-') ? Z_INDEX_RANGES.MENU_ITEMS :
                   id.startsWith('system-') ? Z_INDEX_RANGES.SYSTEM :
                   Z_INDEX_RANGES.PHOTOS;
      
      // Fallback to manually setting low z-index
      setItems(
        item => item.id === id,
        "zIndex",
        range.MIN
      );
    }
  };
  
  /**
   * Helper to check if an item is being dragged
   */
  const isDragging = (id: string): boolean => {
    return draggedId() === id;
  };
  
  // Setup global event handling
  onMount(() => {
    // Handle window events that should cancel drags
    const handleBlur = () => cancelDrag();
    const handleVisibilityChange = () => {
      if (document.hidden) cancelDrag();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', handleBlur);
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Clean up events on unmount
    onCleanup(() => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      
      // Ensure any active drag is cancelled
      if (draggedId()) {
        cancelDrag();
      }
    });
  });
  
  // Public API
  return {
    draggedId,
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTouchStart,
    cancelDrag,
    bringToFront,
    sendToBack
  };
}