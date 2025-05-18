import { createStore } from "solid-js/store";
import { Point, Vector } from "./TransformContext";

export type InteractionType = "pan" | "drag" | "selection" | "pinch" | "none";

export interface InteractionState {
  type: InteractionType;
  target: string | null;
  active: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  startViewport: { position: Point; scale: number } | null;
}

export type InteractionPriority = "high" | "normal" | "low";

export interface InteractionOptions {
  panPriority?: InteractionPriority;
  dragPriority?: InteractionPriority;
  selectionPriority?: InteractionPriority;
  pinchPriority?: InteractionPriority;
}

export interface InteractionManagerProps {
  options?: InteractionOptions;
}

const DEFAULT_OPTIONS: Required<InteractionOptions> = {
  panPriority: "normal",
  dragPriority: "normal",
  selectionPriority: "normal",
  pinchPriority: "high"
};

export function createInteractionManager(props?: InteractionManagerProps) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...(props?.options || {})
  };

  // Interaction state
  const [state, setState] = createStore<InteractionState>({
    type: "none",
    target: null,
    active: false,
    startPoint: null,
    currentPoint: null,
    startViewport: null
  });

  // Helper to calculate priority value
  const getPriorityValue = (priority: InteractionPriority): number => {
    switch (priority) {
      case "high": return 3;
      case "normal": return 2;
      case "low": return 1;
      default: return 0;
    }
  };

  // Get priority for an interaction type
  const getPriority = (type: InteractionType): number => {
    switch (type) {
      case "pan": return getPriorityValue(options.panPriority);
      case "drag": return getPriorityValue(options.dragPriority);
      case "selection": return getPriorityValue(options.selectionPriority);
      case "pinch": return getPriorityValue(options.pinchPriority);
      default: return 0;
    }
  };

  // Start an interaction
  const startInteraction = (
    type: InteractionType,
    target: string | null,
    point: Point,
    viewport?: { position: Point; scale: number }
  ): boolean => {
    // Always allow if nothing is active
    if (!state.active) {
      setState({
        type,
        target,
        active: true,
        startPoint: point,
        currentPoint: point,
        startViewport: viewport || null
      });
      return true;
    }

    // Check priorities when there's a conflict
    const currentPriority = getPriority(state.type);
    const newPriority = getPriority(type);

    // If new priority is higher, cancel current and start new
    if (newPriority > currentPriority) {
      setState({
        type,
        target,
        active: true,
        startPoint: point,
        currentPoint: point,
        startViewport: viewport || null
      });
      return true;
    }

    // Otherwise, deny the new interaction
    return false;
  };

  // Update current interaction
  const updateInteraction = (point: Point): void => {
    if (state.active) {
      setState("currentPoint", point);
    }
  };

  // End current interaction
  const endInteraction = (): InteractionType => {
    const currentType = state.type;
    setState({
      type: "none",
      target: null,
      active: false,
      startPoint: null,
      currentPoint: null,
      startViewport: null
    });
    return currentType;
  };

  // Get current delta from start
  const getDelta = (): Vector | null => {
    if (!state.active || !state.startPoint || !state.currentPoint) {
      return null;
    }

    return {
      dx: state.currentPoint.x - state.startPoint.x,
      dy: state.currentPoint.y - state.startPoint.y
    };
  };

  // Check if the canvas should handle an event
  const shouldHandlePan = (e: MouseEvent | TouchEvent): boolean => {
    return resolveConflict("pan", null, e) === "allow";
  };

  // Check if an item should handle a drag
  const shouldHandleDrag = (itemId: string, e: MouseEvent | TouchEvent): boolean => {
    return resolveConflict("drag", itemId, e) === "allow";
  };

  // Resolve interaction conflicts
  const resolveConflict = (
    type: InteractionType,
    target: string | null,
    e: MouseEvent | TouchEvent
  ): "allow" | "deny" => {
    // Get target element
    const targetElement = e.target as HTMLElement;
    
    // If there's an active interaction, check if the new one can override it
    if (state.active) {
      const currentPriority = getPriority(state.type);
      const newPriority = getPriority(type);
      
      if (newPriority > currentPriority) {
        return "allow";
      }
      
      if (newPriority === currentPriority) {
        // For equal priorities, prefer the current one
        return "deny";
      }
      
      return "deny";
    }
    
    // For fresh interactions
    
    // Always allow pinch zooming
    if (type === "pinch") {
      return "allow";
    }
    
    // For pan, check if the click is directly on the canvas (not a child)
    if (type === "pan") {
      // Check if the event has the spacebar modifier
      const isSpacebarPressed = (e as any).spacebarPressed;
      
      // If spacebar is pressed, allow panning regardless of target
      if (isSpacebarPressed) {
        return "allow";
      }
      
      // Get the closest parent canvas container
      let element = targetElement;
      while (element && !element.classList.contains("infinite-canvas-container")) {
        element = element.parentElement as HTMLElement;
      }
      
      // Only allow panning if the click is directly on the canvas container
      return targetElement === element ? "allow" : "deny";
    }
    
    // For drag, check if the element is draggable
    if (type === "drag") {
      // Check if the element is or has a parent that's a Canvas Item
      let element = targetElement;
      let isCanvasItem = false;
      let itemId = "";
      
      while (element && !isCanvasItem) {
        if (element.id && element.id.startsWith("canvas-item-")) {
          isCanvasItem = true;
          itemId = element.id.replace("canvas-item-", "");
        }
        element = element.parentElement as HTMLElement;
      }
      
      // Only allow if it's a canvas item and matches the target
      return (isCanvasItem && itemId === target) ? "allow" : "deny";
    }
    
    // By default, allow the interaction
    return "allow";
  };

  return {
    state,
    startInteraction,
    updateInteraction,
    endInteraction,
    getDelta,
    shouldHandlePan,
    shouldHandleDrag,
    resolveConflict
  };
}

export type InteractionManager = ReturnType<typeof createInteractionManager>;