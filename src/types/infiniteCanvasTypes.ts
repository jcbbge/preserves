import { JSX } from "solid-js";
import { Point, Vector, CanvasViewport } from "~/primitives/infiniteCanvas/TransformContext";

// Define interaction types and interfaces
export type InteractionType = 'pan' | 'drag' | 'zoom' | 'selection' | 'pinch' | 'none';
export type InteractionPriority = 'high' | 'normal' | 'low';

export interface InteractionState {
  type: InteractionType;
  target: string | null;
  active: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  startViewport: CanvasViewport | null;
}

export interface InteractionOptions {
  type: InteractionType;
  target: string | null;
  priority?: InteractionPriority;
}

export interface InteractionManager {
  state: InteractionState;
  startInteraction: (options: InteractionOptions | InteractionType, target?: string | null, startPoint?: Point, startViewport?: CanvasViewport) => boolean;
  updateInteraction: (currentPoint: Point) => void;
  endInteraction: (options?: { type?: InteractionType; target?: string | null }) => void;
  cancelInteraction: () => void;
  shouldHandlePan: (e: MouseEvent | TouchEvent) => boolean;
  getDelta: () => Vector | null;
}

// Z-index ranges for different item types
export const Z_INDEX_RANGES = {
  PHOTOS: { MIN: 0, MAX: 99 },
  MENU_ITEMS: { MIN: 100, MAX: 199 },
  DRAGGING: { MIN: 1000, MAX: 1099 },
  SYSTEM: { MIN: 10000, MAX: 10099 }
};

// InfiniteCanvas Props
export interface InfiniteCanvasProps {
  // Core functionality
  initialViewport?: CanvasViewport;
  children?: JSX.Element;

  // Config options
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  minScale?: number;
  maxScale?: number;

  // Visual options
  className?: string;
  showGrid?: boolean;
  gridSize?: number;
  backgroundColor?: string;

  // Persistence
  storageKey?: string;

  // Event handling configs
  panMode?: "always" | "spacebar" | "middle-button";
  disablePanning?: boolean;
  disableZooming?: boolean;

  // Callbacks
  onViewportChange?: (viewport: CanvasViewport) => void;
  focalPointId?: string;
  onGetItemPosition?: (id: string) => Point | undefined;
}

// Public API methods for InfiniteCanvas
export interface InfiniteCanvasAPI {
  // Viewport control
  panTo: (x: number, y: number, options?: { animate?: boolean }) => void;
  zoomTo: (scale: number, center?: Point, options?: { animate?: boolean }) => void;
  centerOn: (itemId: string, options?: { scale?: number; animate?: boolean }) => void;
  resetView: (options?: { animate?: boolean }) => void;

  // Information
  getViewport: () => CanvasViewport;
  isItemVisible: (itemId: string) => boolean;

  // Item registration
  registerItem: (id: string, position: Point, size: { width: number; height: number }) => void;
  unregisterItem: (id: string) => void;
  
  // Z-index management
  setItemZIndex?: (id: string, position: "front" | "back" | number) => void;

  // Other
  setGridVisible: (visible: boolean) => void;
  
  // Interaction management
  getInteractionManager?: () => InteractionManager;
}

// CanvasItem Props
export interface CanvasItemProps {
  // Core properties
  id: string;
  position: Point;

  // Optional properties
  rotation?: number;
  scale?: number;
  zIndex?: number;
  visible?: boolean;

  // Size for optimization (if known)
  width?: number;
  height?: number;

  // Interaction properties
  isDraggable?: boolean;
  isSelectable?: boolean;
  isResizable?: boolean;
  isRotatable?: boolean;
  alwaysRender?: boolean;  // Force rendering even when out of viewport

  // Visual state
  isSelected?: boolean;
  isDragging?: boolean;

  // Event callbacks
  onSelect?: (id: string, e: MouseEvent) => void;
  onDeselect?: (id: string) => void;
  onDragStart?: (id: string, e: MouseEvent) => void;
  onDrag?: (id: string, delta: Vector) => void;
  onDragEnd?: (id: string, finalPosition: Point) => void;
  onClick?: (id: string, e: MouseEvent) => void;

  // Content
  children: JSX.Element;
  class?: string;
  style?: JSX.CSSProperties;
}

// CanvasItem API
export interface CanvasItemAPI {
  getPosition: () => Point;
  setPosition: (position: Point) => void;
  getWorldBounds: () => { x: number; y: number; width: number; height: number };
  getScreenBounds: () => { x: number; y: number; width: number; height: number };
  select: () => void;
  deselect: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
}