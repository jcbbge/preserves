import { createSignal, createEffect, onMount, For, Show } from "solid-js";

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

interface SimplePhotoCanvasProps {
  photos: PolaroidPhoto[];
  onPhotoFlip: (id: string) => void;
  onPhotoPin: (id: string) => void;
  onPhotoMove: (id: string, position: { x: number; y: number }) => void;
  onPhotoRotate: (id: string, rotation: number) => void;
}

// Deterministic pseudo-random number generator based on a string (photo.id)
function seededRandom(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const x = Math.abs(Math.sin(h) * 10000) % 1;
  return min + x * (max - min);
}

// Deterministic pick from array
function seededPick(seed: string, arr: any[]) {
  const idx = Math.floor(seededRandom(seed, 0, arr.length));
  return arr[idx];
}

export function SimplePhotoCanvas(props: SimplePhotoCanvasProps) {
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement>();

  // Basic interaction handlers
  const handleFlip = (id: string, e: MouseEvent | TouchEvent) => {
    e.stopPropagation();
    props.onPhotoFlip(id);
  };

  const handlePin = (id: string, e: MouseEvent | TouchEvent) => {
    e.stopPropagation();
    props.onPhotoPin(id);
  };

  const handleRotate = (id: string, e: MouseEvent | TouchEvent) => {
    e.stopPropagation();
    const photo = props.photos.find(p => p.id === id);
    if (photo) {
      const newRotation = (photo.rotation || 0) + 15;
      props.onPhotoRotate(id, newRotation % 360);
    }
  };

  // Drag state
  let draggedPhoto: string | null = null;
  let initialMouseX = 0;
  let initialMouseY = 0;
  let initialElementX = 0;
  let initialElementY = 0;

  const handleDragStart = (id: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore if already dragging
    if (draggedPhoto) return;

    // Find photo data
    const photo = props.photos.find(p => p.id === id);
    if (!photo) return;

    // Get element
    const element = document.getElementById(`photo-${id}`);
    if (!element) return;

    // Get actual element position (as rendered)
    const rect = element.getBoundingClientRect();

    // Remember initial mouse and element positions
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;
    initialElementX = rect.left;
    initialElementY = rect.top;

    // Start tracking this photo
    draggedPhoto = id;

    // Visual feedback
    element.classList.add("dragging");

    // Bring to front
    const maxZIndex = Math.max(...props.photos.map(p => p.zIndex || 0)) + 1;
    element.style.zIndex = maxZIndex.toString();
    
    // Enable GPU acceleration
    element.style.willChange = "transform";
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!draggedPhoto) return;

    // Safety check for mouse release
    if (e.buttons === 0) {
      handleDragEnd(e);
      return;
    }

    // Calculate how much the mouse has moved
    const deltaX = e.clientX - initialMouseX;
    const deltaY = e.clientY - initialMouseY;

    // Get element
    const element = document.getElementById(`photo-${draggedPhoto}`);
    if (!element) return;

    // Get photo data for rotation
    const photo = props.photos.find(p => p.id === draggedPhoto);
    if (!photo) return;

    // Calculate the current board position
    const boardRect = corkboardRef()?.getBoundingClientRect() || { left: 0, top: 0 };
    
    // Calculate position relative to board
    const boardX = initialElementX - boardRect.left + deltaX;
    const boardY = initialElementY - boardRect.top + deltaY;

    // Apply transform directly for smooth motion
    element.style.transform = `translate(${boardX}px, ${boardY}px) rotate(${photo.rotation || 0}deg)`;
  };

  const handleDragEnd = (e: MouseEvent) => {
    if (!draggedPhoto) return;

    // Get photo data
    const photo = props.photos.find(p => p.id === draggedPhoto);
    if (!photo) {
      draggedPhoto = null;
      return;
    }

    // Get element
    const element = document.getElementById(`photo-${draggedPhoto}`);
    if (!element) {
      draggedPhoto = null;
      return;
    }

    // Calculate how much the mouse has moved
    const deltaX = e.clientX - initialMouseX;
    const deltaY = e.clientY - initialMouseY;

    // Calculate board position
    const boardRect = corkboardRef()?.getBoundingClientRect() || { left: 0, top: 0 };
    const boardX = initialElementX - boardRect.left + deltaX;
    const boardY = initialElementY - boardRect.top + deltaY;

    // Store id before resetting drag state
    const draggedId = draggedPhoto;
    draggedPhoto = null;

    // Finish visual changes
    element.classList.remove("dragging");
    element.style.willChange = "auto";

    // Notify parent of the move with final position
    props.onPhotoMove(draggedId, { x: boardX, y: boardY });
  };

  // Handle touch events
  const handleTouchStart = (id: string, e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault(); // Prevent scrolling
      
      // Convert touch to mouse event
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window
      }) as any;
      
      handleDragStart(id, mouseEvent);
    }
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && draggedPhoto) {
      e.preventDefault(); // Prevent scrolling
      
      // Convert touch to mouse event
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window,
        buttons: 1 // Simulate left button pressed
      }) as any;
      
      handleDragMove(mouseEvent);
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (draggedPhoto) {
      e.preventDefault(); // Prevent scrolling behavior
      
      // Use the last touch position
      const lastTouch = e.changedTouches[0];
      const mouseEvent = new MouseEvent('mouseup', {
        clientX: lastTouch.clientX,
        clientY: lastTouch.clientY,
        bubbles: true,
        cancelable: true,
        view: window
      }) as any;
      
      handleDragEnd(mouseEvent);
    }
  };

  // Set up event listeners
  onMount(() => {
    const board = corkboardRef();
    if (board) {
      // Mouse events
      board.addEventListener('mousemove', handleDragMove);
      board.addEventListener('mouseup', handleDragEnd);
      board.addEventListener('mouseleave', handleDragEnd);
      
      // Touch events
      board.addEventListener('touchmove', handleTouchMove, { passive: false });
      board.addEventListener('touchend', handleTouchEnd, { passive: false });
      board.addEventListener('touchcancel', handleTouchEnd, { passive: false });

      return () => {
        // Clean up
        board.removeEventListener('mousemove', handleDragMove);
        board.removeEventListener('mouseup', handleDragEnd);
        board.removeEventListener('mouseleave', handleDragEnd);
        board.removeEventListener('touchmove', handleTouchMove);
        board.removeEventListener('touchend', handleTouchEnd);
        board.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  });

  return (
    <div
      ref={setCorkboardRef}
      class="corkboard"
    >
      <Show when={props.photos.length === 0}>
        <div class="no-photos">
          <p>No photos found yet.</p>
        </div>
      </Show>

      <For each={props.photos} keyed>
        {(photo) => {
          const hasText = !!photo.messageText;
          let firstWords = '';
          if (hasText) {
            const words = photo.messageText.split(/\s+/).slice(0, 4);
            firstWords = words.join(' ');
          }
          // Deterministic random for this photo
          const randomAngleText = hasText ? seededRandom(photo.id + 'text', -6, 6) : 0;
          const randomXText = hasText ? seededRandom(photo.id + 'x', -12, 12) : 0;
          const randomYText = hasText ? seededRandom(photo.id + 'y', -5, 5) : 0;
          const randomAngleDate = seededRandom(photo.id + 'date', -6, 6);
          const randomXDate = seededRandom(photo.id + 'dx', -12, 12);
          const randomYDate = seededRandom(photo.id + 'dy', -5, 5);

          // Subtle off-white/eggshell color palette
          const bgColors = [
            '#f8f6f1', // eggshell
            '#f6f3e9', // light cream
            '#f7f5ed', // warm white
            '#f3f0e7'  // subtle tan
          ];
          const polaroidBg = seededPick(photo.id + 'bg', bgColors);

          // 1 in 6 chance for a coffee ring
          const showCoffeeRing = seededRandom(photo.id + 'coffee', 0, 1) > 0.83;

          return (
            <div
              id={`photo-${photo.id}`}
              class={`polaroid ${photo.isFlipped ? 'flipped' : ''} ${photo.isPinned ? 'pinned' : ''}`}
              style={{
                "transform": `translate(${photo.position?.x || 0}px, ${photo.position?.y || 0}px) rotate(${photo.rotation || 0}deg)`,
                "z-index": photo.zIndex || 1,
                "background": polaroidBg
              }}
              onMouseDown={(e) => handleDragStart(photo.id, e)}
              onTouchStart={(e) => handleTouchStart(photo.id, e)}
            >
              <div class="polaroid-image-area">
                {photo.mediaUrl ? (
                  <img
                    class="polaroid-photo"
                    src={photo.mediaUrl}
                    alt="Photo"
                    loading="lazy"
                  />
                ) : (
                  <div class="polaroid-photo polaroid-text-content">{photo.messageText}</div>
                )}
                {/* Gritty texture overlay */}
                <div class="polaroid-grit-overlay" />
                {/* Coffee ring stain overlay */}
                {showCoffeeRing && (
                  <div class="coffee-ring-overlay">
                    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="45" cy="45" rx="36" ry="18" stroke="#b89c6d" stroke-width="3" opacity="0.32"/>
                      <ellipse cx="60" cy="60" rx="8" ry="3" stroke="#b89c6d" stroke-width="1.5" opacity="0.18"/>
                    </svg>
                  </div>
                )}
              </div>
              <div class="polaroid-caption">
                {hasText && (
                  <span
                    class="polaroid-handwritten"
                    style={{
                      display: 'inline-block',
                      transform: `rotate(${randomAngleText}deg) translate(${randomXText}px, ${randomYText}px)`
                    }}
                  >
                    {firstWords}
                  </span>
                )}
                <span
                  class="polaroid-handwritten"
                  style={{
                    display: 'inline-block',
                    transform: `rotate(${randomAngleDate}deg) translate(${randomXDate}px, ${randomYDate}px)`
                  }}
                >
                  {new Date(photo.createdTime).toLocaleDateString()}
                </span>
              </div>
              <div class="polaroid-actions">
                <button class="polaroid-action flip-btn" onClick={(e) => handleFlip(photo.id, e)}>↺</button>
                <button class="polaroid-action rotate-btn" onClick={(e) => handleRotate(photo.id, e)}>⟳</button>
                <button class={`polaroid-action pin-btn ${photo.isPinned ? 'active' : ''}`} onClick={(e) => handlePin(photo.id, e)}>📌</button>
              </div>
            </div>
          );
        }}
      </For>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
        .corkboard {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          user-select: none;
          touch-action: none;
        }

        .polaroid {
          position: absolute;
          width: 220px;
          height: 270px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 12px 32px 12px;
          box-sizing: border-box;
          cursor: grab;
          transition: box-shadow 0.2s, border 0.2s;
        }
        .polaroid.dragging {
          box-shadow: 0 12px 32px rgba(0,0,0,0.28);
          z-index: 1000 !important;
          transition: none !important;
          cursor: grabbing;
        }
        .polaroid.pinned {
          box-shadow: 0 10px 28px rgba(0,0,0,0.22);
        }
        .polaroid.pinned:before {
          content: '';
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          background: #cc0000;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 3;
        }
        
        .polaroid-image-area {
          position: relative;
          width: 196px;
          height: 196px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .polaroid-photo {
          width: 196px;
          height: 196px;
          object-fit: cover;
          border-radius: 4px;
          background: #eee;
          box-shadow: 0 1.5px 4px rgba(0,0,0,0.06) inset;
          margin-bottom: 0;
          display: block;
        }
        .polaroid-grit-overlay {
          pointer-events: none;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100%; height: 100%;
          z-index: 2;
          background: url('data:image/svg+xml;utf8,<svg width="196" height="196" xmlns="http://www.w3.org/2000/svg"><filter id="f1" x="0" y="0"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="turb"/><feColorMatrix type="saturate" values="0.2"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 0.08 0.12 0.18 0.12 0.08 0 0"/></feComponentTransfer><feBlend in2="SourceGraphic" mode="multiply"/></filter><rect width="196" height="196" fill="none" filter="url(%23f1)"/></svg>');
          opacity: 0.22;
          border-radius: 4px;
        }
        .coffee-ring-overlay {
          pointer-events: none;
          position: absolute;
          left: 0; top: 0;
          z-index: 3;
          opacity: 0.7;
          mix-blend-mode: multiply;
        }
        .polaroid-text-content {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: #333;
          background: #f5f5f5;
          text-align: center;
          height: 196px;
          width: 196px;
          border-radius: 4px;
          font-family: 'Courier New', Courier, monospace;
          white-space: pre-line;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 196px;
          max-height: 196px;
        }
        .polaroid-caption {
          margin-top: 10px;
          width: 100%;
          min-height: 32px;
          text-align: center;
          font-size: 1.05rem;
          color: #444;
          font-family: 'Caveat', 'Segoe UI', Arial, sans-serif;
          letter-spacing: 0.04em;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          position: relative;
          overflow: visible;
          max-width: 196px;
        }
        .polaroid-handwritten {
          font-family: 'Caveat', 'Segoe UI', Arial, sans-serif;
          font-size: 1.2rem;
          color: #333;
          margin-bottom: 2px;
          line-height: 1.1;
          white-space: pre;
          pointer-events: none;
          overflow: visible;
          max-width: 180px;
        }
        
        .polaroid-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 5;
        }
        
        .polaroid:hover .polaroid-actions {
          opacity: 1;
        }
        
        .polaroid-action {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.8);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          transition: transform 0.1s, background-color 0.2s;
        }
        
        .polaroid-action:hover {
          background: rgba(255,255,255,0.95);
          transform: scale(1.1);
        }
        
        .polaroid-action:active {
          transform: scale(0.95);
        }
        
        .polaroid-action.active {
          background: rgba(255, 220, 100, 0.9);
        }

        .no-photos {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
      `}</style>
    </div>
  );
}