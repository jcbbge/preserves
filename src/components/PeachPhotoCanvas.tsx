import { For } from 'solid-js';
import { createStore } from 'solid-js/store';
import styles from '~/routes/dashboard.module.css';
import { PolaroidPhoto } from '~/types/polaroid';
import { InfiniteCanvas, CanvasItem } from '~/primitives/infiniteCanvas';
import { Polaroid } from '~/components/Polaroid';
import { createDraggable } from '~/primitives/createDraggable';
import { 
  savePhotoPosition, 
  savePhotoRotation, 
  getCanvasViewport, 
  saveCanvasViewport 
} from '~/utils/storage';

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
  const [polaroidPhotos, setPolaroidPhotos] = createStore<PolaroidPhoto[]>([...photos]);
  
  // Use the createDraggable primitive for polaroid dragging behavior
  const { draggedId, handleDragStart, handleTouchStart, isDragging } =
    createDraggable(polaroidPhotos, setPolaroidPhotos, {
      route,
      username,
      zIndexRange: { min: 0, max: 9 },
      cssModuleStyles: styles,
    });
    
  // Handler for polaroid movement
  const handlePolaroidMove = (id: string, deltaX: number, deltaY: number) => {
    setPolaroidPhotos(
      (photo) => photo.id === id,
      "position",
      (pos) => ({
        x: (pos?.x || 0) + deltaX,
        y: (pos?.y || 0) + deltaY,
      })
    );
  };
  
  // Handler for end of polaroid movement
  const handlePolaroidMoveEnd = (id: string) => {
    const photo = polaroidPhotos.find((p) => p.id === id);
    if (photo && photo.position) {
      // Save position to localStorage
      savePhotoPosition(id, photo.position, route, username);
      
      // Save rotation if available
      if (photo.rotation !== undefined) {
        savePhotoRotation(id, photo.rotation, route, username);
      }
    }
  };
  
  // Handle canvas viewport change
  const handleViewportChange = (viewport) => {
    saveCanvasViewport(viewport, route, username);
  };

  return (
    <div 
      class={styles.corkboard}
      style={{ 
        width: `${canvasWidth}px`, 
        height: `${canvasHeight}px` 
      }}
    >
      <InfiniteCanvas
        showGrid={false}
        storageKey={`peach_preserves_${username}_${route}_canvas`}
        initialViewport={getCanvasViewport(route, username) || { position: { x: 0, y: 0 }, scale: 1 }}
        className={styles["canvas-container"]}
        onViewportChange={handleViewportChange}
      >
        <For each={polaroidPhotos}>
          {(photo) => (
            <CanvasItem
              id={photo.id}
              position={photo.position || { x: 0, y: 0 }}
              rotation={photo.rotation}
              zIndex={photo.zIndex}
              isDraggable={true}
              isSelected={isDragging(photo.id)}
              onSelect={(id, e) => handleDragStart(e, id)}
              onMove={handlePolaroidMove}
              onMoveEnd={handlePolaroidMoveEnd}
            >
              <Polaroid
                id={photo.id}
                src={photo.src}
                caption={photo.caption}
                date={photo.date}
                position={{ x: 0, y: 0 }} // Position handled by CanvasItem
                rotation={0} // Rotation handled by CanvasItem
                zIndex={1} // zIndex handled by CanvasItem
                useRandomValues={true}
                onMouseDown={(e) => e.stopPropagation()} // Prevent duplicate events
                onTouchStart={(e) => e.stopPropagation()} // Prevent duplicate events
                class={styles["background-polaroid"]}
              />
            </CanvasItem>
          )}
        </For>
      </InfiniteCanvas>
    </div>
  );
}