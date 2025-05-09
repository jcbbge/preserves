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

  // Set up drag handling - basic implementation
  let draggedPhoto: string | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const handleDragStart = (id: string, e: MouseEvent) => {
    // First, check if we're already dragging a photo
    if (draggedPhoto) {
      console.log(`Already dragging photo ${draggedPhoto}, ignoring new drag attempt`);
      return;
    }

    // Add diagnostic logging
    console.log(`Attempting to drag photo ${id}`);

    const photo = props.photos.find(p => p.id === id);
    if (!photo) {
      console.log(`Photo with ID ${id} not found in props.photos`);
      return;
    }

    // Check if this photo is at the top of the stack
    const isTopPhoto = isPhotoOnTop(id);
    console.log(`Photo ${id} is ${isTopPhoto ? '' : 'not '}on top of stack`);

    if (isTopPhoto) {
      // Mark as dragging immediately
      draggedPhoto = id;

      // Get positioning information - make sure we use the exact photo element
      const photoElement = document.getElementById(`photo-${id}`);
      if (!photoElement) {
        console.log(`DOM element for photo ${id} not found`);
        draggedPhoto = null;
        return;
      }

      const rect = photoElement.getBoundingClientRect();

      // Calculate offset within the element
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;

      console.log(`Drag started for photo ${id} at offset (${dragOffsetX}, ${dragOffsetY})`);

      // Add dragging class for visual feedback
      photoElement.classList.add('dragging');

      // Calculate new z-index - ensure it's higher than all others
      const maxZIndex = Math.max(...props.photos.map(p => p.zIndex || 0)) + 1;
      console.log(`Setting z-index to ${maxZIndex} for photo ${id}`);
      photoElement.style.zIndex = maxZIndex.toString();

      // Add GPU hint for better performance during drag
      photoElement.style.willChange = 'transform';

      // Prevent default browser actions
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Helper function to check if a photo is on top of the stack
  const isPhotoOnTop = (id: string): boolean => {
    // Get the clicked photo
    const photo = props.photos.find(p => p.id === id);
    if (!photo) return false;

    // Get photo element bounds
    const photoElement = document.getElementById(`photo-${id}`);
    if (!photoElement) return false;

    // Get z-index of the current photo (use actual DOM z-index if available)
    const photoZIndex = parseInt(photoElement.style.zIndex || '0') || (photo.zIndex || 0);

    // For the point of click, check if any other photo covers it
    const rect = photoElement.getBoundingClientRect();

    // Use the event point for more accurate detection
    // Define a grid of 9 points on the element to check coverage
    const points = [
      { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 },  // Center
      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.25 }, // Top left area
      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.25 }, // Top right area
      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.75 }, // Bottom left area
      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.75 }  // Bottom right area
    ];

    // Check coverage for all points - if ANY point is uncovered, the photo is draggable
    let somePointUncovered = false;

    // For each test point
    pointLoop: for (const point of points) {
      let pointCovered = false;

      // Check all other photos to see if they cover this point
      for (const otherPhoto of props.photos) {
        // Skip self
        if (otherPhoto.id === id) continue;

        const otherElement = document.getElementById(`photo-${otherPhoto.id}`);
        if (otherElement) {
          // Get actual DOM z-index if available, otherwise fall back to photo data
          const otherZIndex = parseInt(otherElement.style.zIndex || '0') || (otherPhoto.zIndex || 0);

          // Only check if the other photo is above this one
          if (otherZIndex > photoZIndex) {
            const otherRect = otherElement.getBoundingClientRect();

            // Check if point is inside the other photo
            if (point.x >= otherRect.left && point.x <= otherRect.right &&
                point.y >= otherRect.top && point.y <= otherRect.bottom) {
              pointCovered = true;
              break; // This point is covered, move to next point
            }
          }
        }
      }

      // If this point isn't covered by any photo, the photo is draggable
      if (!pointCovered) {
        somePointUncovered = true;
        break pointLoop;
      }
    }

    return somePointUncovered;
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!draggedPhoto) return;

    // Check if the mouse button is still pressed (for safety)
    if (e.buttons === 0) {
      console.log('Mouse button released outside element, ending drag');
      handleDragEnd(e);
      return;
    }

    const photo = props.photos.find(p => p.id === draggedPhoto);
    if (!photo) {
      console.log(`Photo with ID ${draggedPhoto} not found during drag move`);
      draggedPhoto = null;
      return;
    }

    const board = corkboardRef();
    if (!board) {
      console.log('Board reference not found during drag move');
      return;
    }

    const boardRect = board.getBoundingClientRect();
    const x = e.clientX - boardRect.left - dragOffsetX;
    const y = e.clientY - boardRect.top - dragOffsetY;

    // Update position in real-time with hardware acceleration
    const photoElement = document.getElementById(`photo-${draggedPhoto}`);
    if (photoElement) {
      // Apply the transform directly without any interpolation
      photoElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${photo.rotation || 0}deg)`;

      // Make sure the dragging class is applied
      if (!photoElement.classList.contains('dragging')) {
        photoElement.classList.add('dragging');
      }
    } else {
      console.log(`DOM element for photo ${draggedPhoto} not found during drag move`);
    }
  };

  const handleDragEnd = (e: MouseEvent) => {
    if (draggedPhoto) {
      const photo = props.photos.find(p => p.id === draggedPhoto);
      const board = corkboardRef();

      if (photo && board) {
        const boardRect = board.getBoundingClientRect();
        const x = e.clientX - boardRect.left - dragOffsetX;
        const y = e.clientY - boardRect.top - dragOffsetY;

        // Get the element before we lose the reference
        const photoElement = document.getElementById(`photo-${draggedPhoto}`);

        // Keep the current transform to avoid flashing
        if (photoElement) {
          // Don't modify the element's transform yet - keep it exactly where it is
          photoElement.classList.remove('dragging');
        }

        // Store the id for use in callbacks
        const draggedId = draggedPhoto;
        draggedPhoto = null;

        // Use a microtask to update the state without visible flash
        // This ensures the change happens in a single paint cycle
        queueMicrotask(() => {
          // Send final position to parent
          props.onPhotoMove(draggedId, { x, y });

          // Handle any cleanup that might affect visuals in the next frame
          requestAnimationFrame(() => {
            const element = document.getElementById(`photo-${draggedId}`);
            if (element) {
              // Now we can reset will-change
              element.style.willChange = 'auto';
            }
          });
        });
      } else {
        // If we don't have photo/board, just clean up
        draggedPhoto = null;
      }
    }
  };

  // Handle touch events similarly to mouse events
  const handleTouchStart = (id: string, e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    
    if (e.touches.length === 1) {
      // Convert touch to equivalent mouse event
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window
      }) as any;
      
      // Pass to existing mouse handler
      handleDragStart(id, mouseEvent);
    }
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    
    if (e.touches.length === 1 && draggedPhoto) {
      // Convert touch to equivalent mouse event
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window,
        buttons: 1 // Simulate left button pressed
      }) as any;
      
      // Pass to existing mouse handler
      handleDragMove(mouseEvent);
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling behavior
    
    if (draggedPhoto) {
      // Use the last touch position for the end event
      const lastTouch = e.changedTouches[0];
      const mouseEvent = new MouseEvent('mouseup', {
        clientX: lastTouch.clientX,
        clientY: lastTouch.clientY,
        bubbles: true,
        cancelable: true,
        view: window
      }) as any;
      
      // Pass to existing mouse handler
      handleDragEnd(mouseEvent);
    }
  };

  // Set up event listeners for both mouse and touch
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
        // Remove mouse events
        board.removeEventListener('mousemove', handleDragMove);
        board.removeEventListener('mouseup', handleDragEnd);
        board.removeEventListener('mouseleave', handleDragEnd);
        
        // Remove touch events
        board.removeEventListener('touchmove', handleTouchMove);
        board.removeEventListener('touchend', handleTouchEnd);
        board.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  });

  // Scatter photos on first render
  const scatterPhotos = () => {
    props.photos.forEach((photo, index) => {
      // Only scatter if position isn't already set
      if (!photo.position || (photo.position.x === 0 && photo.position.y === 0)) {
        const boardWidth = window.innerWidth * 0.9;
        const boardHeight = window.innerHeight * 0.8;

        const centerX = boardWidth / 2;
        const centerY = boardHeight / 2;

        // Random position in a circular pattern around center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 50;

        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        props.onPhotoMove(photo.id, { x, y });
      }
    });
  };

  onMount(() => {
    // If we have new photos without positions, scatter them
    const needsPositioning = props.photos.some(p =>
      !p.position || (p.position.x === 0 && p.position.y === 0)
    );

    if (needsPositioning) {
      setTimeout(scatterPhotos, 500); // Slight delay to ensure DOM is ready
    }
  });

  return (
    <div
      ref={setCorkboardRef}
      class="corkboard"
    >
      <Show when={props.photos.length === 0}>
        <div class="no-photos">
          <p>No memories found yet.</p>
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
                  {new Date(photo.createdTime * 1000).toLocaleDateString()}
                </span>
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
