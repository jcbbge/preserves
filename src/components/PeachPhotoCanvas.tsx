import { For, createEffect, createContext, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import styles from './PeachPhotoCanvas.module.css';
import { PolaroidPhoto } from '~/types/polaroid';
import { InfiniteCanvas, useInfiniteCanvas } from '~/primitives/infiniteCanvas/InfiniteCanvas';
import { CanvasItem } from '~/primitives/infiniteCanvas/CanvasItem';
import { Polaroid } from '~/components/Polaroid';
import { createDraggable, DraggableItem, DraggableState } from '~/primitives/createDraggable';
import { Point, Vector, useTransform } from '~/primitives/infiniteCanvas/TransformContext';
import { 
  savePhotoPosition, 
  savePhotoRotation, 
  getCanvasViewport, 
  saveCanvasViewport 
} from '~/utils/storage';

// Create a context for draggable functionality to be accessible from nested components
const DraggableContext = createContext<DraggableState>();

export const useDraggable = () => {
  const context = useContext(DraggableContext);
  if (!context) {
    throw new Error("useDraggable must be used within a DraggableContext.Provider");
  }
  return context;
};

type PeachPhotoCanvasProps = {
  photos: PolaroidPhoto[];
  username: string;
  route: string;
  canvasWidth: number;
  canvasHeight: number;
};

export function PeachPhotoCanvas({
  photos,
  username,
  route,
  canvasWidth,
  canvasHeight
}: PeachPhotoCanvasProps) {
  // Create store for photos with the proper shape
  const [polaroidPhotos, setPolaroidPhotos] = createStore<(PolaroidPhoto & DraggableItem)[]>(
    photos.map(photo => ({
      ...photo,
      position: photo.position || { x: 0, y: 0 }
    }))
  );
  
  // Get transform context for coordinate conversions
  const transform = useTransform();
  
  // Get canvas API for registration and z-index management
  const canvasAPI = useInfiniteCanvas();
  
  // Listen for z-index change events from InfiniteCanvas
  createEffect(() => {
    const handleZIndexChange = (e: CustomEvent) => {
      const { id, zIndex } = e.detail;
      
      // Update the photo in our store with the new z-index
      const photoIndex = polaroidPhotos.findIndex(p => p.id === id);
      if (photoIndex >= 0) {
        setPolaroidPhotos(
          p => p.id === id,
          "zIndex",
          zIndex
        );
      }
    };
    
    // Add event listener
    window.addEventListener('canvas-item-zindex-change', handleZIndexChange as EventListener);
    
    // Cleanup on effect disposal
    onCleanup(() => {
      window.removeEventListener('canvas-item-zindex-change', handleZIndexChange as EventListener);
    });
  });
  
  // Create the draggable behavior with our enhanced system
  const draggableState = createDraggable(polaroidPhotos, setPolaroidPhotos, {
    route,
    username,
    zIndexRange: { min: 0, max: 9 },
    cssModuleStyles: styles,
    useDirectManipulation: false,
    dragPriority: 'normal',
    dragThreshold: 3,
    transformContext: transform,
    canvasAPI,
    // Optional callbacks for additional behavior
    onDragStart: (id, worldPosition) => {
      // Bring the dragged item to front
      draggableState.bringToFront(id);
    },
    onDragEnd: (id, finalPosition) => {
      // Any additional behavior needed when drag ends
      // For example, you could snap to grid or validate position
    }
  });
  
  // Destructure state for convenience
  const { 
    draggedId, 
    handleDragStart, 
    handleDragMove, 
    handleDragEnd, 
    handleTouchStart, 
    isDragging,
    bringToFront,
    sendToBack
  } = draggableState;
  
  // Handle canvas viewport change - more type safe now
  const handleViewportChange = (viewport) => {
    saveCanvasViewport(viewport, route, username);
  };

  // Helper to handle clicking on a polaroid
  const handlePolaroidClick = (id: string, e: MouseEvent) => {
    // Bring clicked polaroid to front
    bringToFront(id);
  };
  
  // Function to get an item position - used by InfiniteCanvas for focal points
  const getItemPosition = (id: string): Point | undefined => {
    const photo = polaroidPhotos.find(p => p.id === id);
    return photo?.position;
  };
  
  // Function to center on a specific photo
  const centerOnPhoto = (id: string) => {
    canvasAPI.centerOn(id, { scale: 1, animate: true });
  };
  
  // Handle rotation with world-coordinate awareness
  const handleRotatePhoto = (id: string) => {
    const photo = polaroidPhotos.find(p => p.id === id);
    if (!photo) return;
    
    // Rotate in 15 degree increments
    const currentRotation = photo.rotation || 0;
    const newRotation = (currentRotation + 15) % 360;
    
    // Update rotation in store
    setPolaroidPhotos(p => p.id === id, "rotation", newRotation);
    
    // Persist rotation
    savePhotoRotation(id, newRotation, route, username);
  };

  return (
    <div 
      class={styles.corkboard}
      style={{ 
        width: `${canvasWidth}px`, 
        height: `${canvasHeight}px` 
      }}
    >
      <DraggableContext.Provider value={draggableState}>
        <InfiniteCanvas
          showGrid={false}
          storageKey={`peach_preserves_${username}_${route}_canvas`}
          initialViewport={getCanvasViewport(route, username) || { position: { x: 0, y: 0 }, scale: 1 }}
          className={styles["canvas-container"]}
          onViewportChange={handleViewportChange}
          onGetItemPosition={getItemPosition}
          // Added options for better control
          panMode="always"
          minScale={0.1}
          maxScale={5}
          backgroundColor="#f5f2e8" // Corkboard color
        >
          <For each={polaroidPhotos}>
            {(photo) => (
              <CanvasItem
                id={photo.id}
                position={photo.position}
                rotation={photo.rotation}
                zIndex={photo.zIndex}
                isDraggable={true}
                isSelected={isDragging(photo.id)}
                isDragging={isDragging(photo.id)}
                onSelect={(id, e) => handleDragStart(e, id)}
                onDrag={handleDragMove}
                onDragEnd={handleDragEnd}
                onClick={handlePolaroidClick}
                // Additional options available in our improved CanvasItem
                visible={true}
                isSelectable={true}
                alwaysRender={false} // Auto-optimize rendering based on visibility
              >
                <Polaroid
                  id={photo.id}
                  src={photo.src}
                  caption={photo.caption}
                  date={photo.date}
                  messageText={photo.messageText}
                  createdTime={photo.createdTime}
                  likeCount={photo.likeCount}
                  commentCount={photo.commentCount}
                  // These properties are now handled by CanvasItem 
                  position={{ x: 0, y: 0 }}
                  rotation={0}
                  zIndex={1}
                  useRandomValues={true}
                  // Pass through event handlers - use stopPropagation to prevent canvas handling
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  // Support for additional interactions
                  onFlip={photo.isFlippable ? (id) => {
                    setPolaroidPhotos(p => p.id === id, "isFlipped", flipped => !flipped);
                  } : undefined}
                  onPin={photo.isPinnable ? (id) => {
                    setPolaroidPhotos(p => p.id === id, "isPinned", pinned => !pinned);
                  } : undefined}
                  onRotate={photo.isRotatable ? handleRotatePhoto : undefined}
                  class={styles["background-polaroid"]}
                />
              </CanvasItem>
            )}
          </For>
        </InfiniteCanvas>
      </DraggableContext.Provider>
    </div>
  );
}