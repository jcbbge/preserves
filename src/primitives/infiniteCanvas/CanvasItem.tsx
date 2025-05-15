import { JSX, createEffect, createSignal } from "solid-js";
import { useTransform, worldToScreen } from "./TransformContext";

export interface CanvasItemProps {
  id: string;
  position: { x: number; y: number };
  rotation?: number;
  scale?: number;
  zIndex?: number;
  isDraggable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, e: MouseEvent) => void;
  onMove?: (id: string, deltaX: number, deltaY: number) => void;
  onMoveEnd?: (id: string) => void;
  class?: string;
  style?: JSX.CSSProperties;
  children: JSX.Element;
}

export function CanvasItem(props: CanvasItemProps) {
  // Get viewport transform from context
  const viewport = useTransform();

  // Refs for drag handling
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const [initialPosition, setInitialPosition] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  // Generate transform string
  const getTransform = () => {
    // Start with rotation and item-specific scale
    let transform = `rotate(${props.rotation || 0}deg)`;

    // Add scale if specified
    if (props.scale && props.scale !== 1) {
      transform += ` scale(${props.scale})`;
    }

    return transform;
  };

  // Convert world position to screen position
  const getScreenPosition = () => {
    return worldToScreen(props.position.x, props.position.y, viewport);
  };

  // Handle mouse down for drag start
  const handleMouseDown = (e: MouseEvent) => {
    if (!props.isDraggable) return;

    // Prevent default to avoid text selection and other browser behaviors
    e.preventDefault();
    e.stopPropagation();

    // Record starting position for the drag
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition({ ...props.position });
    setIsDragging(true);

    // Call the onSelect handler if provided
    if (props.onSelect) {
      props.onSelect(props.id, e);
    }
  };

  // Handle touch start
  const handleTouchStart = (e: TouchEvent) => {
    if (!props.isDraggable || e.touches.length !== 1) return;

    // Prevent default scrolling
    e.preventDefault();
    e.stopPropagation();

    // Get the touch
    const touch = e.touches[0];

    // Record starting position for the drag
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setInitialPosition({ ...props.position });
    setIsDragging(true);

    // Convert touch to mouse event for the onSelect handler
    if (props.onSelect) {
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window,
      }) as MouseEvent;

      props.onSelect(props.id, mouseEvent);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging() || !dragStart() || !initialPosition() || !props.onMove)
      return;

    // Calculate position delta in screen space
    const deltaX = e.clientX - dragStart()!.x;
    const deltaY = e.clientY - dragStart()!.y;

    // Convert to world space
    const worldDeltaX = deltaX / viewport.scale;
    const worldDeltaY = deltaY / viewport.scale;

    // Call the onMove handler with the delta
    props.onMove(props.id, worldDeltaX, worldDeltaY);
  };

  // Handle touch move
  const handleTouchMove = (e: TouchEvent) => {
    if (
      !isDragging() ||
      !dragStart() ||
      !initialPosition() ||
      !props.onMove ||
      e.touches.length !== 1
    )
      return;

    // Get the touch
    const touch = e.touches[0];

    // Calculate position delta in screen space
    const deltaX = touch.clientX - dragStart()!.x;
    const deltaY = touch.clientY - dragStart()!.y;

    // Convert to world space
    const worldDeltaX = deltaX / viewport.scale;
    const worldDeltaY = deltaY / viewport.scale;

    // Call the onMove handler with the delta
    props.onMove(props.id, worldDeltaX, worldDeltaY);
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (!isDragging()) return;

    setIsDragging(false);
    setDragStart(null);
    setInitialPosition(null);

    // Call the onMoveEnd handler if provided
    if (props.onMoveEnd) {
      props.onMoveEnd(props.id);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging()) return;

    setIsDragging(false);
    setDragStart(null);
    setInitialPosition(null);

    // Call the onMoveEnd handler if provided
    if (props.onMoveEnd) {
      props.onMoveEnd(props.id);
    }
  };

  // Add global event listeners
  createEffect(() => {
    if (isDragging()) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  });

  // Get screen position for render
  const screenPos = getScreenPosition();

  return (
    <div
      id={`canvas-item-${props.id}`}
      class={`canvas-item ${props.isSelected ? "selected" : ""} ${isDragging() ? "dragging" : ""} ${props.class || ""}`}
      style={{
        position: "absolute",
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        transform: getTransform(),
        "transform-origin": "center center",
        "z-index": props.zIndex || 0,
        cursor: props.isDraggable
          ? isDragging()
            ? "grabbing"
            : "grab"
          : "default",
        "touch-action": "none",
        "-webkit-user-select": "none",
        "user-select": "none",
        ...(props.style || {}),
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {props.children}
    </div>
  );
}
