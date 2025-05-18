# Infinite Canvas System Architecture

This document provides a comprehensive guide to the Infinite Canvas system, a sophisticated framework for creating interactive, zoomable, and draggable canvas experiences. The system is built on SolidJS and designed with a clear separation of concerns, strong type safety, and optimized performance.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [InfiniteCanvas](#infinitecanvas)
4. [CanvasItem](#canvasitem)
5. [createDraggable](#createdraggable)
6. [Coordinate Systems](#coordinate-systems)
7. [Z-Index Management](#z-index-management)
8. [Interaction Management](#interaction-management)
9. [Integration Patterns](#integration-patterns)
10. [Performance Optimizations](#performance-optimizations)
11. [Best Practices](#best-practices)
12. [Examples](#examples)

## System Overview

The Infinite Canvas system provides a framework for creating infinite, zoomable canvases with interactive elements. It's designed for applications that need to present a large workspace where users can zoom, pan, and interact with elements in a spatial context.

The system consists of three main components:

1. **InfiniteCanvas**: The container component that handles viewport transformations, panning, zooming, and item registration.
2. **CanvasItem**: Individual elements positioned within the canvas that adapt to transformations and handle interactions.
3. **createDraggable**: A primitive that provides drag-and-drop functionality for items, with awareness of coordinate systems and canvas interactions.

### Design Principles

- **Separation of Concerns**: Each component has a distinct responsibility.
- **Coordinate System Awareness**: Clear distinction between world and screen coordinates.
- **Flexible Integration**: Components can be used together or independently.
- **Type Safety**: Comprehensive TypeScript interfaces throughout.
- **Optimized Performance**: Conditional rendering and efficient updates.
- **Consistent Event Handling**: Unified approach to mouse and touch events.

## Component Architecture

The architecture follows a hierarchical pattern:

```
InfiniteCanvas
├── TransformContext (provides coordinate conversion)
├── InteractionManager (manages pan/drag conflicts)
├── CanvasItems
│   ├── Item 1 (managed by createDraggable)
│   ├── Item 2 (managed by createDraggable)
│   └── ...
```

### Key Responsibilities

| Component | Primary Responsibilities |
|-----------|--------------------------|
| InfiniteCanvas | Viewport management, coordinate transformation, interaction orchestration |
| CanvasItem | Element positioning, event delegation, visibility optimization |
| createDraggable | Drag state management, coordinate-aware movement, position persistence |

## InfiniteCanvas

The `InfiniteCanvas` serves as the primary container for the canvas experience. It manages the viewport, coordinate transformations, and coordinates interactions between items.

### API

#### Props

```typescript
interface InfiniteCanvasProps {
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
```

#### Context API

The InfiniteCanvas exposes its API through a context that can be accessed using the `useInfiniteCanvas` hook:

```typescript
interface InfiniteCanvasAPI {
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
  setItemZIndex: (id: string, position: "front" | "back" | number) => void;

  // Other
  setGridVisible: (visible: boolean) => void;
  
  // Interaction management
  getInteractionManager: () => InteractionManager;
}
```

### Usage Example

```tsx
<InfiniteCanvas
  initialViewport={{ position: { x: 0, y: 0 }, scale: 1 }}
  storageKey="my_canvas_state"
  minScale={0.1}
  maxScale={5}
  panMode="always"
  showGrid={true}
  backgroundColor="#f0f0f0"
  onViewportChange={(viewport) => saveViewportState(viewport)}
>
  {/* Canvas items go here */}
  <CanvasItem id="item-1" position={{ x: 100, y: 100 }}>
    <div>My Canvas Item</div>
  </CanvasItem>
</InfiniteCanvas>
```

### Best Practices

- **Use `storageKey` for Persistence**: Always provide a unique `storageKey` to persist viewport state across sessions.
- **Set Sensible Bounds**: Define `bounds` to prevent users from navigating too far from content.
- **Handle Viewport Changes**: Implement `onViewportChange` to track viewport state for analytics or synchronization.
- **Customize Interaction Modes**: Use `panMode` to define when panning is activated (e.g., "spacebar" for design tools).

## CanvasItem

The `CanvasItem` component represents an individual element within the InfiniteCanvas. It handles coordinate transformations, event delegation, and visibility optimizations.

### API

#### Props

```typescript
interface CanvasItemProps {
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
```

#### API Methods

```typescript
interface CanvasItemAPI {
  getPosition: () => Point;
  setPosition: (position: Point) => void;
  getWorldBounds: () => { x: number; y: number; width: number; height: number };
  getScreenBounds: () => { x: number; y: number; width: number; height: number };
  select: () => void;
  deselect: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
}
```

### Usage Example

```tsx
<CanvasItem
  id="photo-123"
  position={{ x: 200, y: 150 }}
  rotation={5}
  zIndex={10}
  isDraggable={true}
  isSelectable={true}
  isSelected={selectedId === "photo-123"}
  isDragging={draggingId === "photo-123"}
  onSelect={(id, e) => handleItemSelect(id, e)}
  onDrag={(id, delta) => handleItemDrag(id, delta)}
  onDragEnd={(id, position) => handleItemDragEnd(id, position)}
  onClick={(id) => handleItemClick(id)}
>
  <div className="my-content">
    <img src="photo.jpg" alt="Canvas content" />
  </div>
</CanvasItem>
```

### Best Practices

- **Unique IDs**: Use unique, meaningful IDs that identify the item type (e.g., "photo-123", "menu-settings").
- **Responsive to Selection State**: Update visual state based on `isSelected` and `isDragging`.
- **Controlled Rendering**: Use `alwaysRender={false}` for large canvases to improve performance.
- **Proper Event Management**: Handle events through callbacks rather than directly on children.
- **Use Width/Height Props**: Provide `width` and `height` when known for better registration performance.

## createDraggable

The `createDraggable` primitive provides drag functionality for a collection of items, with awareness of coordinate systems and interaction management.

### API

#### Options

```typescript
interface DraggableOptions {
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
```

#### State API

```typescript
interface DraggableState {
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
```

### Usage Example

```tsx
// Define store for draggable items
const [items, setItems] = createStore<DraggableItem[]>([
  { id: "photo-1", position: { x: 100, y: 100 }, rotation: 0, zIndex: 1 },
  { id: "photo-2", position: { x: 200, y: 150 }, rotation: 5, zIndex: 2 }
]);

// Create draggable behavior
const draggable = createDraggable(items, setItems, {
  route: "dashboard",
  username: currentUser.username,
  transformContext: transform,  // From useTransform()
  canvasAPI: canvasAPI,         // From useInfiniteCanvas()
  dragPriority: "normal",
  onDragStart: (id) => {
    // Custom drag start handling
    draggable.bringToFront(id);
  }
});

// Use in component
return (
  <For each={items}>
    {(item) => (
      <CanvasItem
        id={item.id}
        position={item.position}
        rotation={item.rotation}
        zIndex={item.zIndex}
        isDraggable={true}
        isSelected={draggable.isDragging(item.id)}
        isDragging={draggable.isDragging(item.id)}
        onSelect={(id, e) => draggable.handleDragStart(e, id)}
        onDrag={draggable.handleDragMove}
        onDragEnd={draggable.handleDragEnd}
      >
        {/* Item content */}
      </CanvasItem>
    )}
  </For>
);
```

### Best Practices

- **Store Pattern**: Use a SolidJS store to manage draggable items.
- **Coordinate Awareness**: Always provide the `transformContext` when working with InfiniteCanvas.
- **Priority Management**: Set appropriate `dragPriority` based on the interaction importance.
- **Custom Callbacks**: Implement custom drag callbacks for specialized behavior.
- **DOM Manipulation Tradeoff**: Use `useDirectManipulation: true` for smoother dragging but potentially less accurate React state.

## Coordinate Systems

The Infinite Canvas system deals with two coordinate spaces:

### World Coordinates
- The "true" positions of items in the infinite space
- Independent of viewport transformations
- Persisted in storage
- Used for logical operations and calculations

### Screen Coordinates
- The visible positions on the user's screen
- Affected by panning and zooming
- Used for rendering and direct DOM manipulation
- Converted from/to world coordinates for interactions

### Transformation Functions

The system provides comprehensive transformation functions through the `TransformContext`:

```typescript
interface TransformContextValue {
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
  
  // Visibility checks
  isWorldPointVisible: (point: Point, padding?: number) => boolean;
}
```

### Best Practices

- **Consistent Coordinate Usage**: Store item positions in world coordinates.
- **Transformation Context**: Use the `useTransform()` hook to access transformation functions.
- **Vector vs. Point**: Use Vector for deltas/movements and Point for absolute positions.
- **Visibility Optimization**: Use `isWorldPointVisible` to determine if an item needs rendering.

## Z-Index Management

The Infinite Canvas system provides structured z-index management with defined ranges for different item types.

### Z-Index Ranges

```typescript
const Z_INDEX_RANGES = {
  PHOTOS: { MIN: 0, MAX: 99 },
  MENU_ITEMS: { MIN: 100, MAX: 199 },
  DRAGGING: { MIN: 1000, MAX: 1099 },
  SYSTEM: { MIN: 10000, MAX: 10099 }
};
```

### Z-Index Conventions

- **ID-Based Type Detection**: Items are categorized based on their ID prefix:
  - `photo-*`: Regular content items (0-99)
  - `menu-*`: Menu/UI components (100-199)
  - `system-*`: System-level components (10000+)

- **Special States**:
  - Dragging items are automatically elevated to the DRAGGING range (1000+)
  - Selected items get precedence within their range

### Z-Index Operations

- **bringToFront**: Moves an item to the highest position in its type range
- **sendToBack**: Moves an item to the lowest position in its type range
- **setItemZIndex**: Sets an explicit z-index (clamped to appropriate range)

### Best Practices

- **Consistent ID Conventions**: Use proper prefixes for different item types.
- **Z-Index as a Last Resort**: Use z-index for layering, not for positioning.
- **Range Awareness**: Stay within appropriate ranges for different item types.
- **Delegate to API**: Use the InfiniteCanvas `setItemZIndex` method rather than direct manipulation.

## Interaction Management

The Infinite Canvas system includes a sophisticated interaction management system that mediates between different interaction types like panning, dragging, and zooming.

### Interaction Types

```typescript
type InteractionType = 'pan' | 'drag' | 'zoom' | 'none';
```

### Interaction Priorities

```typescript
type InteractionPriority = 'high' | 'normal' | 'low';
```

### Interaction Manager

```typescript
interface InteractionManager {
  state: InteractionState;
  startInteraction: (options: InteractionOptions | InteractionType, target?: string | null, startPoint?: Point, startViewport?: CanvasViewport) => boolean;
  updateInteraction: (currentPoint: Point) => void;
  endInteraction: (options?: { type?: InteractionType; target?: string | null }) => void;
  cancelInteraction: () => void;
  shouldHandlePan: (e: MouseEvent | TouchEvent) => boolean;
  getDelta: () => Vector | null;
}
```

### Conflict Resolution

When multiple interactions compete (e.g., dragging an item vs. panning the canvas), the system resolves conflicts based on:

1. **Priority**: Higher priority interactions take precedence.
2. **Target Specificity**: Interactions with a specific target get preference.
3. **First Claim**: The first interaction to start is generally favored.

### Best Practices

- **Appropriate Priorities**: Set `dragPriority` in `createDraggable` based on importance.
- **Registration**: Always register drag interactions through the interaction manager.
- **Cancellation**: Properly cancel interactions when interrupted.
- **Threshold Awareness**: Use appropriate thresholds to distinguish clicks from drags.

## Integration Patterns

This section describes common patterns for integrating the three components in various application scenarios.

### Basic Canvas With Items

```tsx
function BasicCanvas() {
  // Define data
  const [items, setItems] = createStore([
    { id: "item-1", position: { x: 100, y: 100 } },
    { id: "item-2", position: { x: 200, y: 150 } }
  ]);

  return (
    <InfiniteCanvas>
      <For each={items}>
        {(item) => (
          <CanvasItem
            id={item.id}
            position={item.position}
          >
            <div>Item Content</div>
          </CanvasItem>
        )}
      </For>
    </InfiniteCanvas>
  );
}
```

### Draggable Canvas Items

```tsx
function DraggableCanvas() {
  // Define items store
  const [items, setItems] = createStore([
    { id: "item-1", position: { x: 100, y: 100 }, zIndex: 1 },
    { id: "item-2", position: { x: 200, y: 150 }, zIndex: 2 }
  ]);

  // Get contexts
  const transform = useTransform();
  const canvasAPI = useInfiniteCanvas();

  // Create draggable behavior
  const draggable = createDraggable(items, setItems, {
    route: "canvas-route",
    transformContext: transform,
    canvasAPI: canvasAPI,
    onDragStart: (id) => draggable.bringToFront(id)
  });

  return (
    <For each={items}>
      {(item) => (
        <CanvasItem
          id={item.id}
          position={item.position}
          zIndex={item.zIndex}
          isDraggable={true}
          isDragging={draggable.isDragging(item.id)}
          onSelect={(id, e) => draggable.handleDragStart(e, id)}
          onDrag={draggable.handleDragMove}
          onDragEnd={draggable.handleDragEnd}
        >
          <div>Draggable Content</div>
        </CanvasItem>
      )}
    </For>
  );
}
```

### Complete Integration with Context Pattern

```tsx
function CompleteCanvas() {
  // Create context for draggable state
  const DraggableContext = createContext<DraggableState>();
  
  // Hook to access draggable state
  const useDraggable = () => {
    const context = useContext(DraggableContext);
    if (!context) {
      throw new Error("useDraggable must be used within a DraggableContext.Provider");
    }
    return context;
  };

  // Component implementation
  function CanvasImplementation() {
    // Create store for items
    const [items, setItems] = createStore([
      { id: "photo-1", position: { x: 100, y: 100 }, zIndex: 1 },
      { id: "menu-settings", position: { x: 500, y: 50 }, zIndex: 100 }
    ]);

    // Get contexts
    const transform = useTransform();
    const canvasAPI = useInfiniteCanvas();

    // Create draggable with all options
    const draggableState = createDraggable(items, setItems, {
      route: "dashboard",
      username: "current-user",
      zIndexRange: { min: 0, max: 99 },
      useDirectManipulation: false,
      dragPriority: "normal",
      dragThreshold: 3,
      transformContext: transform,
      canvasAPI: canvasAPI,
      onDragStart: (id) => draggableState.bringToFront(id),
      onDragEnd: (id, position) => {
        // Save position to server
        saveItemPosition(id, position);
      }
    });

    // Listen for z-index changes
    createEffect(() => {
      const handleZIndexChange = (e: CustomEvent) => {
        const { id, zIndex } = e.detail;
        setItems(item => item.id === id, "zIndex", zIndex);
      };
      
      window.addEventListener('canvas-item-zindex-change', 
                             handleZIndexChange as EventListener);
      
      onCleanup(() => {
        window.removeEventListener('canvas-item-zindex-change', 
                                  handleZIndexChange as EventListener);
      });
    });

    return (
      <DraggableContext.Provider value={draggableState}>
        <InfiniteCanvas
          showGrid={true}
          storageKey="canvas-state"
          panMode="always"
        >
          <For each={items}>
            {(item) => (
              <CanvasItem
                id={item.id}
                position={item.position}
                zIndex={item.zIndex}
                isDraggable={!item.id.startsWith('menu-')}
                isSelected={draggableState.isDragging(item.id)}
                isDragging={draggableState.isDragging(item.id)}
                onSelect={(id, e) => draggableState.handleDragStart(e, id)}
                onDrag={draggableState.handleDragMove}
                onDragEnd={draggableState.handleDragEnd}
                alwaysRender={item.id.startsWith('menu-')}
              >
                {item.id.startsWith('photo-') ? (
                  <PhotoComponent id={item.id} />
                ) : (
                  <MenuComponent id={item.id} />
                )}
              </CanvasItem>
            )}
          </For>
        </InfiniteCanvas>
      </DraggableContext.Provider>
    );
  }

  return <CanvasImplementation />;
}
```

## Performance Optimizations

The Infinite Canvas system includes several performance optimizations:

### Conditional Rendering

- **Visibility Detection**: Only renders items visible in the current viewport.
- **Adaptive Rendering**: Uses the `alwaysRender` prop to control rendering behavior.
- **Show Component**: Utilizes SolidJS `<Show>` for efficient conditional rendering.

### Direct DOM Manipulation

- **createDraggable Option**: `useDirectManipulation: true` for smoother dragging.
- **transform Property**: Manipulates the DOM directly during drag operations.
- **Restoration**: Properly restores state after direct manipulation.

### Efficient State Updates

- **Targeted Updates**: Uses fine-grained reactivity to update only what changed.
- **Store Pattern**: Leverages SolidJS store for efficient updates.
- **Partial Update Functions**: Updates specific properties through selector functions.

### Resource Cleanup

- **Event Listener Management**: Proper cleanup of event listeners on component unmount.
- **ResizeObserver Cleanup**: Disconnects observers when components are removed.
- **Interaction Cancellation**: Ensures interactions are properly canceled when interrupted.

## Best Practices

This section covers global best practices for using the Infinite Canvas system effectively.

### Project Organization

- **Component Hierarchy**: Follow the natural hierarchy of the system.
- **State Management**: Keep item state in a central store accessible to both InfiniteCanvas and createDraggable.
- **Type Definition**: Define proper interfaces for your specific item types.

### Performance Considerations

- **Limiting Item Count**: Monitor performance with large numbers of items.
- **Visibility Optimization**: Use visibility-based rendering for large collections.
- **Avoid Rerenders**: Structure components to minimize unnecessary rerenders.

### User Experience

- **Smooth Transitions**: Add animation for zooming and centering.
- **Proper Z-Index Management**: Follow z-index conventions for consistent layering.
- **Touch Support**: Ensure good touch interaction through proper event handling.

### Common Pitfalls

- **Coordinate System Confusion**: Always be aware of whether you're working with world or screen coordinates.
- **Missing Context Providers**: Ensure InfiniteCanvas is properly wrapped around components that use its context.
- **Direct DOM Manipulation**: Be cautious with direct DOM manipulation and ensure state is properly synchronized.

## Examples

### Photo Gallery Canvas

This example demonstrates a typical implementation for a photo gallery with draggable photos:

```tsx
function PhotoGalleryCanvas() {
  // Photo data with position, rotation, etc.
  const [photos, setPhotos] = createStore(fetchedPhotos.map(photo => ({
    ...photo,
    position: photo.position || { x: 0, y: 0 },
    rotation: photo.rotation || 0,
    zIndex: photo.zIndex || 1
  })));

  // Access transform context and canvas API
  const transform = useTransform();
  const canvasAPI = useInfiniteCanvas();

  // Create draggable behavior
  const draggable = createDraggable(photos, setPhotos, {
    route: "gallery",
    username: currentUser.id,
    transformContext: transform,
    canvasAPI: canvasAPI,
    dragPriority: "normal",
    onDragStart: (id) => {
      // Bring photo to front when dragging starts
      draggable.bringToFront(id);
      
      // Track analytics
      trackInteraction("drag_start", { photoId: id });
    },
    onDragEnd: (id, position) => {
      // Save to server
      savePhotoPosition(id, position);
      
      // Track analytics
      trackInteraction("drag_end", { photoId: id, position });
    }
  });

  // Handle photo rotation
  const rotatePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    
    const newRotation = (photo.rotation + 15) % 360;
    setPhotos(p => p.id === id, "rotation", newRotation);
    savePhotoRotation(id, newRotation);
  };

  // Event handler for clicks
  const handlePhotoClick = (id: string) => {
    // Select photo or show details
    setSelectedPhotoId(id);
    draggable.bringToFront(id);
  };

  // Center viewport on a specific photo
  const centerOnPhoto = (id: string) => {
    canvasAPI.centerOn(id, { scale: 1, animate: true });
  };

  return (
    <div class="gallery-container">
      <InfiniteCanvas
        showGrid={false}
        storageKey={`gallery_${currentUser.id}`}
        initialViewport={getStoredViewport() || { position: { x: 0, y: 0 }, scale: 1 }}
        onViewportChange={saveViewport}
        panMode="always"
        backgroundColor="#f5f2e8"
      >
        <For each={photos}>
          {(photo) => (
            <CanvasItem
              id={photo.id}
              position={photo.position}
              rotation={photo.rotation}
              zIndex={photo.zIndex}
              isDraggable={true}
              isSelected={selectedPhotoId === photo.id}
              isDragging={draggable.isDragging(photo.id)}
              onSelect={(id, e) => draggable.handleDragStart(e, id)}
              onDrag={draggable.handleDragMove}
              onDragEnd={draggable.handleDragEnd}
              onClick={handlePhotoClick}
            >
              <PhotoComponent
                src={photo.src}
                caption={photo.caption}
                date={photo.date}
                onRotate={() => rotatePhoto(photo.id)}
              />
            </CanvasItem>
          )}
        </For>
      </InfiniteCanvas>
      
      {/* Controls outside the canvas */}
      <div class="gallery-controls">
        <button onClick={() => canvasAPI.resetView({ animate: true })}>
          Reset View
        </button>
        <button onClick={() => centerOnPhoto(featuredPhotoId)}>
          Show Featured
        </button>
      </div>
    </div>
  );
}
```

### Whiteboard Application

This example shows how to implement a collaborative whiteboard with different item types:

```tsx
function WhiteboardCanvas() {
  // Different types of items with appropriate ID prefixes
  const [items, setItems] = createStore([
    // Regular content items (z-index 0-99)
    { id: "shape-1", type: "rectangle", position: { x: 100, y: 100 }, zIndex: 1 },
    { id: "shape-2", type: "circle", position: { x: 200, y: 150 }, zIndex: 2 },
    { id: "text-1", type: "text", position: { x: 300, y: 200 }, zIndex: 3, text: "Hello" },
    
    // Menu items (z-index 100-199)
    { id: "menu-toolbar", type: "toolbar", position: { x: 50, y: 50 }, zIndex: 100 },
    { id: "menu-colorpicker", type: "colorpicker", position: { x: 450, y: 50 }, zIndex: 101 }
  ]);

  // Transform context and canvas API
  const transform = useTransform();
  const canvasAPI = useInfiniteCanvas();
  
  // Create draggable behavior
  const draggable = createDraggable(items, setItems, {
    route: "whiteboard",
    username: currentUser.id,
    transformContext: transform,
    canvasAPI: canvasAPI,
  });
  
  // Custom rendering based on item type
  const renderItem = (item) => {
    switch (item.type) {
      case "rectangle":
        return <RectangleShape width={100} height={80} />;
      case "circle":
        return <CircleShape radius={40} />;
      case "text":
        return <TextShape text={item.text} />;
      case "toolbar":
        return <Toolbar onCreateShape={createNewShape} />;
      case "colorpicker":
        return <ColorPicker onSelectColor={setCurrentColor} />;
      default:
        return <div>Unknown item type</div>;
    }
  };
  
  // Determine if an item is draggable
  const isItemDraggable = (item) => {
    // Menu items are always draggable, shapes depend on edit mode
    return item.id.startsWith("menu-") || editMode === "move";
  };
  
  // Determine if an item is always rendered
  const shouldAlwaysRender = (item) => {
    // Menu items should always be visible
    return item.id.startsWith("menu-");
  };

  return (
    <InfiniteCanvas
      showGrid={true}
      gridSize={20}
      storageKey="whiteboard-state"
    >
      <For each={items}>
        {(item) => (
          <CanvasItem
            id={item.id}
            position={item.position}
            zIndex={item.zIndex}
            isDraggable={isItemDraggable(item)}
            isDragging={draggable.isDragging(item.id)}
            isSelected={selectedItemId === item.id}
            onSelect={(id, e) => draggable.handleDragStart(e, id)}
            onDrag={draggable.handleDragMove}
            onDragEnd={draggable.handleDragEnd}
            onClick={(id) => selectItem(id)}
            alwaysRender={shouldAlwaysRender(item)}
          >
            {renderItem(item)}
          </CanvasItem>
        )}
      </For>
    </InfiniteCanvas>
  );
}
```

## Conclusion

The Infinite Canvas system provides a comprehensive framework for creating interactive, zoomable canvases with draggable items. By clearly separating concerns between InfiniteCanvas, CanvasItem, and createDraggable, the system offers flexibility, performance, and a clean architecture.

When implementing your own canvas-based experiences, follow the patterns and best practices outlined in this document to achieve optimal performance and a consistent user experience.

For specific customization needs, refer to the type definitions and interfaces to understand the available options and ensure proper integration between components.