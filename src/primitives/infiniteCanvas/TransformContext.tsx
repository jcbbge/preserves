import { createContext, useContext, JSX, createSignal, createEffect } from 'solid-js';

// Type definitions for points, vectors, and sizes
export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  dx: number;
  dy: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Define the viewport type with more explicit naming
export interface CanvasViewport {
  position: Point;
  scale: number;
}

// Define the transform context value interface
export interface TransformContextValue {
  // Current viewport state
  viewport: CanvasViewport;
  
  // Coordinate transformation methods
  worldToScreen: (point: Point) => Point;
  worldToScreenVector: (vector: Vector) => Vector;
  screenToWorld: (point: Point) => Point;
  screenToWorldVector: (vector: Vector) => Vector;
  
  // Scale utilities
  scaleWorldDistance: (distance: number) => number;
  scaleScreenDistance: (distance: number) => number;
  
  // Rect transformation
  worldRectToScreen: (rect: Rect) => Rect;
  screenRectToWorld: (rect: Rect) => Rect;
  
  // Check if a world point is visible in the current viewport
  isWorldPointVisible: (point: Point, padding?: number) => boolean;
}

// Create a context with a default implementation
const TransformContext = createContext<TransformContextValue>({
  viewport: { position: { x: 0, y: 0 }, scale: 1 },
  worldToScreen: (point) => ({ x: point.x, y: point.y }),
  worldToScreenVector: (vector) => ({ dx: vector.dx, dy: vector.dy }),
  screenToWorld: (point) => ({ x: point.x, y: point.y }),
  screenToWorldVector: (vector) => ({ dx: vector.dx, dy: vector.dy }),
  scaleWorldDistance: (distance) => distance,
  scaleScreenDistance: (distance) => distance,
  worldRectToScreen: (rect) => ({ ...rect }),
  screenRectToWorld: (rect) => ({ ...rect }),
  isWorldPointVisible: () => true
});

// Provider component for the transform context
export interface TransformProviderProps {
  viewport: CanvasViewport;
  children: JSX.Element;
  containerRect?: DOMRect;
}

export function TransformProvider(props: TransformProviderProps) {
  // Helper functions for coordinate transformations
  const worldToScreen = (point: Point): Point => {
    return {
      x: point.x * props.viewport.scale + props.viewport.position.x,
      y: point.y * props.viewport.scale + props.viewport.position.y
    };
  };

  const worldToScreenVector = (vector: Vector): Vector => {
    return {
      dx: vector.dx * props.viewport.scale,
      dy: vector.dy * props.viewport.scale
    };
  };

  const screenToWorld = (point: Point): Point => {
    return {
      x: (point.x - props.viewport.position.x) / props.viewport.scale,
      y: (point.y - props.viewport.position.y) / props.viewport.scale
    };
  };

  const screenToWorldVector = (vector: Vector): Vector => {
    return {
      dx: vector.dx / props.viewport.scale,
      dy: vector.dy / props.viewport.scale
    };
  };

  // Scale helpers
  const scaleWorldDistance = (distance: number): number => {
    return distance * props.viewport.scale;
  };

  const scaleScreenDistance = (distance: number): number => {
    return distance / props.viewport.scale;
  };

  // Rectangle transformations
  const worldRectToScreen = (rect: Rect): Rect => {
    const topLeft = worldToScreen({ x: rect.x, y: rect.y });
    const size = {
      width: rect.width * props.viewport.scale,
      height: rect.height * props.viewport.scale
    };
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: size.width,
      height: size.height
    };
  };

  const screenRectToWorld = (rect: Rect): Rect => {
    const topLeft = screenToWorld({ x: rect.x, y: rect.y });
    const size = {
      width: rect.width / props.viewport.scale,
      height: rect.height / props.viewport.scale
    };
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: size.width,
      height: size.height
    };
  };

  // Visibility check
  const isWorldPointVisible = (point: Point, padding = 0): boolean => {
    if (!props.containerRect) return true;
    
    const screenPoint = worldToScreen(point);
    return (
      screenPoint.x + padding >= 0 &&
      screenPoint.x - padding <= props.containerRect.width &&
      screenPoint.y + padding >= 0 &&
      screenPoint.y - padding <= props.containerRect.height
    );
  };

  // Construct the context value
  const transformValue: TransformContextValue = {
    viewport: props.viewport,
    worldToScreen,
    worldToScreenVector,
    screenToWorld,
    screenToWorldVector,
    scaleWorldDistance,
    scaleScreenDistance,
    worldRectToScreen,
    screenRectToWorld,
    isWorldPointVisible
  };

  return (
    <TransformContext.Provider value={transformValue}>
      {props.children}
    </TransformContext.Provider>
  );
}

// Hook to access the transform context
export function useTransform() {
  const context = useContext(TransformContext);
  if (!context) {
    throw new Error("useTransform must be used within a TransformProvider");
  }
  return context;
}

// Standalone helper functions (for use outside of components)
export function screenToWorldHelper(
  screenX: number,
  screenY: number, 
  viewport: CanvasViewport
): Point {
  return {
    x: (screenX - viewport.position.x) / viewport.scale,
    y: (screenY - viewport.position.y) / viewport.scale
  };
}

export function worldToScreenHelper(
  worldX: number,
  worldY: number,
  viewport: CanvasViewport
): Point {
  return {
    x: worldX * viewport.scale + viewport.position.x,
    y: worldY * viewport.scale + viewport.position.y
  };
}