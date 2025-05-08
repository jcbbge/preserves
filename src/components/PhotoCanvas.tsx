import { createSignal, createEffect, onMount, For, JSX } from "solid-js";
import { DragDropProvider, DragDropSensors, DragOverlay, DragEventHandler, createDraggable } from "@thisbeyond/solid-dnd";
import { useBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";

export interface PolaroidPhoto {
  id: string;
  messageText: string;
  mediaUrl?: string;
  createdTime: number;
  likeCount: number;
  commentCount: number;
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  isFlipped?: boolean;
  isPinned?: boolean;
}

interface PhotoCanvasProps {
  photos: PolaroidPhoto[];
  onPhotoFlip: (id: string) => void;
  onPhotoPin: (id: string) => void;
  onPhotoMove: (id: string, position: { x: number; y: number }) => void;
  onPhotoRotate: (id: string, rotation: number) => void;
}

export function PhotoCanvas(props: PhotoCanvasProps) {
  const [canvasRef, setCanvasRef] = createSignal<HTMLDivElement>();
  const [canvasPosition, setCanvasPosition] = createSignal({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = createSignal(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = createSignal<string | null>(null);
  
  // Get canvas bounds for positioning
  const bounds = useBounds(canvasRef);
  
  // Handle canvas drag
  const onCanvasMouseDown = (e: MouseEvent) => {
    // Only start canvas drag if not on a photo
    if ((e.target as HTMLElement).closest('.polaroid')) return;
    
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - canvasPosition().x, y: e.clientY - canvasPosition().y });
    e.preventDefault();
  };
  
  // Move canvas with mouse
  const onCanvasMouseMove = (e: MouseEvent) => {
    if (!isDraggingCanvas()) return;
    
    const newX = e.clientX - dragStart().x;
    const newY = e.clientY - dragStart().y;
    setCanvasPosition({ x: newX, y: newY });
    e.preventDefault();
  };
  
  // Stop canvas drag
  const onCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
  };
  
  // Handle zoom with wheel
  const onCanvasWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, canvasScale() + delta));
    
    // Zoom toward cursor position
    const canvasBounds = bounds?.();
    if (canvasBounds) {
      const mouseX = e.clientX - canvasBounds.x;
      const mouseY = e.clientY - canvasBounds.y;
      
      const newX = canvasPosition().x - ((mouseX / canvasScale()) * delta);
      const newY = canvasPosition().y - ((mouseY / canvasScale()) * delta);
      
      setCanvasScale(newScale);
      setCanvasPosition({ x: newX, y: newY });
    } else {
      setCanvasScale(newScale);
    }
  };
  
  // Set up event listeners
  onMount(() => {
    const canvas = canvasRef();
    if (canvas) {
      createEventListener(canvas, "mousedown", onCanvasMouseDown);
      createEventListener(window, "mousemove", onCanvasMouseMove);
      createEventListener(window, "mouseup", onCanvasMouseUp);
      createEventListener(canvas, "wheel", onCanvasWheel, { passive: false });
    }
    
    // Initialize canvas position to center
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    setCanvasPosition({ 
      x: viewportWidth / 2 - 500, // Center the 1000px canvas
      y: viewportHeight / 2 - 400  // Center vertically
    });
  });
  
  // Handle photo drag end
  const onDragEnd: DragEventHandler = ({ draggable }) => {
    if (draggable) {
      const id = draggable.id as string;
      const element = document.getElementById(`photo-${id}`);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const x = (rect.left - bounds?.().left) / canvasScale() - canvasPosition().x;
        const y = (rect.top - bounds?.().top) / canvasScale() - canvasPosition().y;
        
        props.onPhotoMove(id, { x, y });
      }
      
      setActiveDragId(null);
    }
  };
  
  // Toggle photo flip
  const onPhotoClick = (id: string, e: MouseEvent) => {
    // Don't flip if we're dragging
    if (isDraggingCanvas()) return;
    
    // Double click to flip
    if (e.detail === 2) {
      props.onPhotoFlip(id);
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  // Pin a photo in place
  const onPinClick = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    props.onPhotoPin(id);
  };
  
  // Rotate a photo
  const onRotateStart = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    // Implement rotation logic here
    const photo = props.photos.find(p => p.id === id);
    if (photo) {
      const newRotation = (photo.rotation || 0) + 15;
      props.onPhotoRotate(id, newRotation);
    }
  };
  
  return (
    <div class="canvas-container">
      <div 
        ref={setCanvasRef} 
        class="photo-canvas"
        style={{
          transform: `translate(${canvasPosition().x}px, ${canvasPosition().y}px) scale(${canvasScale()})`,
          cursor: isDraggingCanvas() ? 'grabbing' : 'grab'
        }}
      >
        <DragDropProvider onDragEnd={onDragEnd}>
          <DragDropSensors />
          <For each={props.photos}>
            {(photo) => {
              // Create draggable for this photo
              const draggable = createDraggable(photo.id);
              
              return (
                <div 
                  id={`photo-${photo.id}`}
                  class={`polaroid ${photo.isFlipped ? 'flipped' : ''} ${photo.isPinned ? 'pinned' : ''}`}
                  style={{
                    transform: `translate(${photo.position?.x || 0}px, ${photo.position?.y || 0}px) rotate(${photo.rotation || 0}deg)`,
                    "z-index": photo.zIndex || 1
                  }}
                  onClick={[onPhotoClick, photo.id]}
                  use:draggable
                >
                  <div class="polaroid-front">
                    <div class="polaroid-content">
                      {photo.mediaUrl ? (
                        <img src={photo.mediaUrl} alt="Photo" />
                      ) : (
                        <div class="text-content">{photo.messageText}</div>
                      )}
                    </div>
                    <div class="polaroid-caption">
                      <div class="polaroid-date">
                        {new Date(photo.createdTime * 1000).toLocaleDateString()}
                      </div>
                      {photo.likeCount > 0 && (
                        <div class="polaroid-likes">❤️ {photo.likeCount}</div>
                      )}
                    </div>
                    <div class="polaroid-controls">
                      <button 
                        class={`pin-button ${photo.isPinned ? 'pinned' : ''}`}
                        onClick={[onPinClick, photo.id]}
                        title={photo.isPinned ? "Unpin" : "Pin"}
                      >
                        📌
                      </button>
                      <button
                        class="rotate-button"
                        onClick={[onRotateStart, photo.id]}
                        title="Rotate"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                  <div class="polaroid-back">
                    <div class="sticky-note">
                      <div class="sticky-note-content">
                        <div class="sticky-note-title">PEACH MEMORY</div>
                        <div class="sticky-note-text">{photo.messageText}</div>
                        <div class="sticky-note-date">
                          {new Date(photo.createdTime * 1000).toLocaleDateString()}
                        </div>
                        {photo.commentCount > 0 && (
                          <div class="sticky-note-comments">
                            <div class="comments-count">{photo.commentCount} comments</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
          <DragOverlay>
            {activeDragId() && (
              <div class="polaroid dragging">
                <div class="polaroid-content">
                  {/* Simple preview during drag */}
                </div>
              </div>
            )}
          </DragOverlay>
        </DragDropProvider>
      </div>
      
      <div class="canvas-controls">
        <button class="zoom-in" onClick={() => setCanvasScale(s => Math.min(3, s + 0.1))}>
          +
        </button>
        <button class="zoom-out" onClick={() => setCanvasScale(s => Math.max(0.5, s - 0.1))}>
          -
        </button>
        <button class="reset-view" onClick={() => {
          setCanvasScale(1);
          setCanvasPosition({ 
            x: window.innerWidth / 2 - 500,
            y: window.innerHeight / 2 - 400
          });
        }}>
          Reset View
        </button>
      </div>
      
      <style jsx>{`
        .canvas-container {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background-color: #f5f0e5; /* Cork board color */
          background-image: 
            radial-gradient(rgba(160, 120, 90, 0.1) 15%, transparent 16%),
            radial-gradient(rgba(160, 120, 90, 0.1) 15%, transparent 16%);
          background-size: 10px 10px;
          background-position: 0 0, 5px 5px;
        }
        
        .photo-canvas {
          position: absolute;
          width: 100%;
          height: 100%;
          transform-origin: 0 0;
          transition: transform 0.1s ease-out;
          min-width: 1000px;
          min-height: 800px;
        }
        
        .polaroid {
          position: absolute;
          width: 280px;
          height: 340px;
          background: white;
          padding: 1rem;
          padding-bottom: 2.5rem;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.3s ease;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          cursor: grab;
          transform-origin: center center;
        }
        
        .polaroid:hover {
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
          z-index: 10 !important;
        }
        
        .polaroid.dragging {
          cursor: grabbing;
          opacity: 0.8;
          transform: scale(1.05) !important;
          z-index: 100 !important;
        }
        
        .polaroid.pinned::before {
          content: "📌";
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 24px;
          z-index: 5;
        }
        
        .polaroid::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          right: 0;
          height: 5px;
          background: rgba(0, 0, 0, 0.06);
          transform: scaleX(0.97);
          border-radius: 50%;
          z-index: -1;
        }
        
        .polaroid-front, .polaroid-back {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          backface-visibility: hidden;
        }
        
        .polaroid-back {
          transform: rotateY(180deg);
        }
        
        .polaroid.flipped {
          transform: rotateY(180deg) !important;
        }
        
        .polaroid-content {
          width: 100%;
          height: 260px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9f9f9;
          margin-bottom: 0.5rem;
          position: relative;
        }
        
        .polaroid-content img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .text-content {
          padding: 1rem;
          font-size: 1rem;
          color: var(--text-dark);
          height: 100%;
          width: 100%;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          white-space: pre-wrap;
          overflow-wrap: break-word;
          line-height: 1.5;
        }
        
        .polaroid-caption {
          position: absolute;
          bottom: 0.5rem;
          left: 0;
          right: 0;
          padding: 0 1rem;
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-dark);
          font-family: 'Courier New', monospace;
        }
        
        .polaroid-controls {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 5px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .polaroid:hover .polaroid-controls {
          opacity: 1;
        }
        
        .pin-button, .rotate-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .pin-button:hover, .rotate-button:hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.9);
        }
        
        .pin-button.pinned {
          transform: scale(1.1);
          color: var(--peach-primary);
        }
        
        /* Sticky note back */
        .sticky-note {
          background-color: #fffee0;
          width: 100%;
          height: 100%;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          font-family: 'Courier New', monospace;
        }
        
        .sticky-note-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .sticky-note-title {
          font-weight: bold;
          text-align: center;
          margin-bottom: 1rem;
          transform: rotate(-1deg);
          color: var(--peach-secondary);
        }
        
        .sticky-note-text {
          flex: 1;
          overflow-y: auto;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 1rem;
        }
        
        .sticky-note-date {
          text-align: right;
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
        }
        
        .sticky-note-comments {
          border-top: 1px dashed var(--peach-accent);
          padding-top: 0.5rem;
          font-size: 0.8rem;
        }
        
        /* Canvas controls */
        .canvas-controls {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          display: flex;
          gap: 0.5rem;
          z-index: 1000;
        }
        
        .canvas-controls button {
          background-color: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .canvas-controls button:hover {
          background-color: var(--peach-accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}