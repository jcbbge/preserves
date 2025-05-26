import { JSX, createEffect, createSignal, onMount, onCleanup, Show } from "solid-js";
import { useTransform, Point, Vector, Rect } from "./TransformContext";
import { CanvasItemProps, CanvasItemAPI, Z_INDEX_RANGES } from "~/types/infiniteCanvasTypes";
import { useInfiniteCanvas } from "./InfiniteCanvas";
import styles from "./InfiniteCanvas.module.css";

export function CanvasItem(props: CanvasItemProps) {
  // Access transform context for coordinate conversion
  const transform = useTransform();
  
  // Access canvas API for registration and advanced features
  let canvasAPI = undefined;
  try {
    canvasAPI = useInfiniteCanvas();
  } catch (e) {
    // Canvas API is optional - will function in standalone mode without it
  }
  
  // Element reference for DOM manipulation and measurement
  const [elementRef, setElementRef] = createSignal<HTMLDivElement>();
  
  // Track visibility status for optimization
  const [isVisible, setIsVisible] = createSignal(true);
  
  // Track actual rendered dimensions for accurate registration
  const [dimensions, setDimensions] = createSignal<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });
  
  // Compute screen position from world coordinates
  const screenPosition = () => {
    return transform.worldToScreen(props.position);
  };
  
  // Generate transform string for rotation and scale
  const getTransform = () => {
    let transformStr = '';
    
    // Add rotation if specified
    if (props.rotation !== undefined) {
      transformStr += `rotate(${props.rotation}deg)`;
    } else {
      transformStr += 'rotate(0deg)';
    }
    
    // Add scale if specified and not 1
    if (props.scale !== undefined && props.scale !== 1) {
      transformStr += ` scale(${props.scale})`;
    }
    
    return transformStr;
  };
  
  // Calculate item's bounds in world coordinates
  const getWorldBounds = (): Rect => {
    const size = dimensions();
    const worldSize = {
      width: size.width / transform.viewport.scale,
      height: size.height / transform.viewport.scale
    };
    
    return {
      x: props.position.x - (worldSize.width / 2),
      y: props.position.y - (worldSize.height / 2),
      width: worldSize.width,
      height: worldSize.height
    };
  };
  
  // Calculate item's bounds in screen coordinates
  const getScreenBounds = (): Rect => {
    const worldBounds = getWorldBounds();
    return transform.worldRectToScreen(worldBounds);
  };
  
  // Item selection handling
  const select = () => {
    if (props.onSelect && !props.isSelected) {
      // Create synthetic event
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      
      props.onSelect(props.id, event);
    }
  };
  
  // Item deselection handling
  const deselect = () => {
    if (props.onDeselect && props.isSelected) {
      props.onDeselect(props.id);
    }
  };
  
  // Move item to front (highest z-index)
  const bringToFront = () => {
    // For now, we'll just log - in a real implementation, this would use Canvas API
    // This is a placeholder for when we add z-index management to the canvas API
    if (canvasAPI && 'setItemZIndex' in canvasAPI) {
      (canvasAPI as any).setItemZIndex(props.id, "front");
    }
  };
  
  // Move item to back (lowest z-index)
  const sendToBack = () => {
    // For now, we'll just log - in a real implementation, this would use Canvas API
    // This is a placeholder for when we add z-index management to the canvas API
    if (canvasAPI && 'setItemZIndex' in canvasAPI) {
      (canvasAPI as any).setItemZIndex(props.id, "back");
    }
  };
  
  // Set position directly - utility method
  const setPosition = (position: Point) => {
    if (props.onDrag) {
      // Calculate delta from current position
      const delta: Vector = {
        dx: position.x - props.position.x,
        dy: position.y - props.position.y
      };
      
      // Call onDrag to update position
      props.onDrag(props.id, delta);
    }
  };
  
  // Expose Canvas Item API methods
  const itemAPI: CanvasItemAPI = {
    getPosition: () => props.position,
    setPosition,
    getWorldBounds,
    getScreenBounds,
    select,
    deselect,
    bringToFront,
    sendToBack
  };
  
  // Check if this item should handle an event
  const shouldHandleEvent = (e: MouseEvent | TouchEvent): boolean => {
    // Don't handle if not interactive
    if (!props.isDraggable && !props.isSelectable) {
      return false;
    }
    
    // If event started on this element or its children, handle it
    const element = elementRef();
    if (!element) return false;
    
    // Check if the event target is this element or a child
    const target = e.target as Node;
    
    // For login menu, allow form inputs to receive events
    if (props.id === "login-menu") {
      const targetElement = target as HTMLElement;
      if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'BUTTON') {
        return false;
      }
    }
    
    return element.contains(target);
  };
  
  // Handle mouse down for dragging and selection
  const handleMouseDown = (e: MouseEvent) => {
    if (!shouldHandleEvent(e)) return;
    
    if (!props.isDraggable || !props.onSelect) {
      return;
    }
    
    // Prevent default to avoid text selection, etc.
    e.preventDefault();
    
    // Stop propagation to prevent canvas panning
    e.stopPropagation();
    
    // Delegate to parent handlers
    props.onSelect(props.id, e);
  };
  
  // Handle touch start for mobile devices
  const handleTouchStart = (e: TouchEvent) => {
    if (!shouldHandleEvent(e) || e.touches.length !== 1) return;
    
    if (!props.isDraggable || !props.onSelect) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Convert touch to mouse event for consistent handling
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
      bubbles: true,
      cancelable: true,
      view: window,
    }) as MouseEvent;
    
    props.onSelect(props.id, mouseEvent);
  };
  
  // Handle click for selection and actions
  const handleClick = (e: MouseEvent) => {
    if (!shouldHandleEvent(e)) return;
    
    if (props.onClick) {
      // Prevent default only if we have a handler
      e.preventDefault();
      e.stopPropagation();
      
      props.onClick(props.id, e);
    }
  };
  
  // Get dimensions of the element
  const updateDimensions = () => {
    const element = elementRef();
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    setDimensions({
      width: rect.width,
      height: rect.height
    });
  };
  
  // Register with canvas when mounted
  onMount(() => {
    // Get initial dimensions
    updateDimensions();
    
    // Register resize observer to update dimensions
    let resizeObserver: ResizeObserver | undefined;
    
    try {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      
      const element = elementRef();
      if (element) {
        resizeObserver.observe(element);
      }
    } catch (e) {
      // ResizeObserver might not be available in all environments
      // Fall back to updating dimensions on mount only
    }
    
    // Register with canvas if API available
    if (canvasAPI) {
      registerWithCanvas();
    }
    
    // Set up cleanup
    onCleanup(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      // Unregister from canvas
      if (canvasAPI) {
        canvasAPI.unregisterItem(props.id);
      }
    });
  });
  
  // Register with canvas, using current dimensions
  const registerWithCanvas = () => {
    if (!canvasAPI) return;
    
    const size = dimensions();
    if (size.width === 0 || size.height === 0) {
      // If dimensions aren't available yet, use default size
      canvasAPI.registerItem(props.id, props.position, {
        width: props.width || 100,
        height: props.height || 100
      });
    } else {
      canvasAPI.registerItem(props.id, props.position, {
        width: size.width / transform.viewport.scale,
        height: size.height / transform.viewport.scale
      });
    }
  };
  
  // Update registration when position or dimensions change
  createEffect(() => {
    // Accessing these props in the effect to track them
    const position = props.position;
    const size = dimensions();
    
    if (canvasAPI) {
      registerWithCanvas();
    }
    
    // Check visibility
    if (canvasAPI && canvasAPI.isItemVisible) {
      const visible = canvasAPI.isItemVisible(props.id);
      setIsVisible(visible);
    } else {
      // If no visibility check available, assume visible
      setIsVisible(true);
    }
  });
  
  // Compute CSS cursor based on interactive state
  const getCursorStyle = () => {
    if (!props.isDraggable && !props.isSelectable) {
      return "default";
    }
    
    if (props.isDragging || props.isSelected) {
      return "grabbing";
    }
    
    return "grab";
  };
  
  // Get z-index with proper range management
  const getZIndex = () => {
    // Guard against undefined props.id
    if (!props.id) {
      return props.zIndex || Z_INDEX_RANGES.PHOTOS.MIN;
    }
    
    // Determine range based on ID pattern
    const isMenu = props.id.startsWith('menu-');
    const isSystem = props.id.startsWith('system-');
    
    if (isMenu) {
      // Menu items should be above regular items
      return props.zIndex || Z_INDEX_RANGES.MENU_ITEMS.MIN;
    } else if (isSystem) {
      // System UI elements should be at the highest level
      return props.zIndex || Z_INDEX_RANGES.SYSTEM.MIN;
    }
    
    // Default to regular photo range
    return props.zIndex || Z_INDEX_RANGES.PHOTOS.MIN;
  };
  
  // Whether to render the component (always render if alwaysRender is true)
  const shouldRender = () => props.alwaysRender || isVisible();
  
  // Conditionally render based on visibility for performance
  return (
    <Show when={shouldRender()}>
      <div
        ref={setElementRef}
        id={`canvas-item-${props.id}`}
        class={`${styles["canvas-item"]} 
               ${props.isSelected && props.id !== "login-menu" ? styles.selected : ""} 
               ${props.isDragging && props.id !== "login-menu" ? styles.dragging : ""} 
               ${props.class || ""}`}
        style={{
          position: "absolute",
          left: `${screenPosition().x}px`,
          top: `${screenPosition().y}px`,
          transform: getTransform(),
          "transform-origin": "center center",
          "z-index": getZIndex(),
          cursor: getCursorStyle(),
          "touch-action": "none",
          "-webkit-user-select": "none",
          "user-select": "none",
          "pointer-events": "all",
          visibility: props.visible === false ? "hidden" : "visible",
          ...(props.style || {}),
        }}
        data-canvas-item-id={props.id}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
      >
        {props.children}
      </div>
    </Show>
  );
}

// Utility to find CanvasItem from any child element
export function findParentCanvasItem(element: HTMLElement): string | null {
  let current = element;
  
  while (current && !current.dataset.canvasItemId) {
    if (current.parentElement) {
      current = current.parentElement;
    } else {
      return null;
    }
  }
  
  return current.dataset.canvasItemId || null;
}
