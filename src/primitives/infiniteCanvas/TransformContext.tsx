import { createContext, useContext, JSX } from 'solid-js';

// Define the viewport type
export interface CanvasViewport {
  position: { x: number; y: number };
  scale: number;
}

// Create a context for the viewport transform
const TransformContext = createContext<CanvasViewport>({
  position: { x: 0, y: 0 },
  scale: 1
});

// Provider component for the transform context
export interface TransformProviderProps {
  viewport: CanvasViewport;
  children: JSX.Element;
}

export function TransformProvider(props: TransformProviderProps) {
  return (
    <TransformContext.Provider value={props.viewport}>
      {props.children}
    </TransformContext.Provider>
  );
}

// Hook to access the transform context
export function useTransform() {
  return useContext(TransformContext);
}

// Helper to convert screen coordinates to world coordinates
export function screenToWorld(
  screenX: number,
  screenY: number, 
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: (screenX - viewport.position.x) / viewport.scale,
    y: (screenY - viewport.position.y) / viewport.scale
  };
}

// Helper to convert world coordinates to screen coordinates
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: worldX * viewport.scale + viewport.position.x,
    y: worldY * viewport.scale + viewport.position.y
  };
}