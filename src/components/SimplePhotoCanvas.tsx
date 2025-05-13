import { createSignal, createEffect, onMount, For, Show } from "solid-js";
import styles from "./SimplePhotoCanvas.module.css";

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
    element.classList.add(styles.dragging);

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
    element.classList.remove(styles.dragging);
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
      class={styles.corkboard}
    >
      <Show when={props.photos.length === 0}>
        <div class={styles["no-photos"]}>
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
              class={`${styles.polaroid} ${photo.isFlipped ? styles.flipped : ''} ${photo.isPinned ? styles.pinned : ''}`}
              style={{
                "transform": `translate(${photo.position?.x || 0}px, ${photo.position?.y || 0}px) rotate(${photo.rotation || 0}deg)`,
                "z-index": photo.zIndex || 1,
                "background": polaroidBg
              }}
              onMouseDown={(e) => handleDragStart(photo.id, e)}
              onTouchStart={(e) => handleTouchStart(photo.id, e)}
            >
              <div class={styles["polaroid-image-area"]}>
                {photo.mediaUrl ? (
                  <img
                    class={styles["polaroid-photo"]}
                    src={photo.mediaUrl}
                    alt="Photo"
                    loading="lazy"
                  />
                ) : (
                  <div class={`${styles["polaroid-photo"]} ${styles["polaroid-text-content"]}`}>{photo.messageText}</div>
                )}
                {/* Gritty texture overlay */}
                <div class={styles["polaroid-grit-overlay"]} />
                {/* Coffee ring stain overlay */}
                {showCoffeeRing && (
                  <div class={styles["coffee-ring-overlay"]}>
                    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="45" cy="45" rx="36" ry="18" stroke="#b89c6d" stroke-width="3" opacity="0.32"/>
                      <ellipse cx="60" cy="60" rx="8" ry="3" stroke="#b89c6d" stroke-width="1.5" opacity="0.18"/>
                    </svg>
                  </div>
                )}
              </div>
              <div class={styles["polaroid-caption"]}>
                {hasText && (
                  <span
                    class={styles["polaroid-handwritten"]}
                    style={{
                      display: 'inline-block',
                      transform: `rotate(${randomAngleText}deg) translate(${randomXText}px, ${randomYText}px)`
                    }}
                  >
                    {firstWords}
                  </span>
                )}
                <span
                  class={styles["polaroid-handwritten"]}
                  style={{
                    display: 'inline-block',
                    transform: `rotate(${randomAngleDate}deg) translate(${randomXDate}px, ${randomYDate}px)`
                  }}
                >
                  {new Date(photo.createdTime).toLocaleDateString()}
                </span>
              </div>
              <div class={styles["polaroid-actions"]}>
                <button class={`${styles["polaroid-action"]} ${styles["flip-btn"]}`} onClick={(e) => handleFlip(photo.id, e)}>↺</button>
                <button class={`${styles["polaroid-action"]} ${styles["rotate-btn"]}`} onClick={(e) => handleRotate(photo.id, e)}>⟳</button>
                <button class={`${styles["polaroid-action"]} ${styles["pin-btn"]} ${photo.isPinned ? styles.active : ''}`} onClick={(e) => handlePin(photo.id, e)}>📌</button>
              </div>
            </div>
          );
        }}
      </For>


    </div>
  );
}