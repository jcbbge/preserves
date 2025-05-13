import { createSignal, createEffect, onMount, For, JSX } from "solid-js";
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  DragEventHandler,
  createDraggable,
} from "@thisbeyond/solid-dnd";
import { useBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import styles from "./PhotoCanvas.module.css";

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
    if ((e.target as HTMLElement).closest(`.${styles.polaroid}`)) return;

    setIsDraggingCanvas(true);
    setDragStart({
      x: e.clientX - canvasPosition().x,
      y: e.clientY - canvasPosition().y,
    });
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

      const newX = canvasPosition().x - (mouseX / canvasScale()) * delta;
      const newY = canvasPosition().y - (mouseY / canvasScale()) * delta;

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
      y: viewportHeight / 2 - 400, // Center vertically
    });
  });

  // Handle photo drag end
  const onDragEnd: DragEventHandler = ({ draggable }) => {
    if (draggable) {
      const id = draggable.id as string;
      const element = document.getElementById(`photo-${id}`);

      if (element) {
        const rect = element.getBoundingClientRect();
        const x =
          (rect.left - bounds?.().left) / canvasScale() - canvasPosition().x;
        const y =
          (rect.top - bounds?.().top) / canvasScale() - canvasPosition().y;

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
    const photo = props.photos.find((p) => p.id === id);
    if (photo) {
      const newRotation = (photo.rotation || 0) + 15;
      props.onPhotoRotate(id, newRotation);
    }
  };

  return (
    <div class={styles["canvas-container"]}>
      <div
        ref={setCanvasRef}
        class={styles["photo-canvas"]}
        style={{
          transform: `translate(${canvasPosition().x}px, ${canvasPosition().y}px) scale(${canvasScale()})`,
          cursor: isDraggingCanvas() ? "grabbing" : "grab",
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
                  class={`${styles.polaroid} ${photo.isFlipped ? styles.flipped : ""} ${photo.isPinned ? styles.pinned : ""}`}
                  style={{
                    transform: `translate(${photo.position?.x || 0}px, ${photo.position?.y || 0}px) rotate(${photo.rotation || 0}deg)`,
                    "z-index": photo.zIndex || 1,
                  }}
                  onClick={[onPhotoClick, photo.id]}
                  use:draggable
                >
                  <div class={styles["polaroid-front"]}>
                    <div class={styles["polaroid-content"]}>
                      {photo.mediaUrl ? (
                        <img src={photo.mediaUrl} alt="Photo" />
                      ) : (
                        <div class={styles["text-content"]}>{photo.messageText}</div>
                      )}
                    </div>
                    <div class={styles["polaroid-caption"]}>
                      <div class={styles["polaroid-date"]}>
                        {new Date(
                          photo.createdTime * 1000,
                        ).toLocaleDateString()}
                      </div>
                      {photo.likeCount > 0 && (
                        <div class={styles["polaroid-likes"]}>❤️ {photo.likeCount}</div>
                      )}
                    </div>
                    <div class={styles["polaroid-controls"]}>
                      <button
                        class={`${styles["pin-button"]} ${photo.isPinned ? styles.pinned : ""}`}
                        onClick={[onPinClick, photo.id]}
                        title={photo.isPinned ? "Unpin" : "Pin"}
                      >
                        📌
                      </button>
                      <button
                        class={styles["rotate-button"]}
                        onClick={[onRotateStart, photo.id]}
                        title="Rotate"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                  <div class={styles["polaroid-back"]}>
                    <div class={styles["sticky-note"]}>
                      <div class={styles["sticky-note-content"]}>
                        <div class={styles["sticky-note-title"]}>PEACH MEMORY</div>
                        <div class={styles["sticky-note-text"]}>{photo.messageText}</div>
                        <div class={styles["sticky-note-date"]}>
                          {new Date(
                            photo.createdTime * 1000,
                          ).toLocaleDateString()}
                        </div>
                        {photo.commentCount > 0 && (
                          <div class={styles["sticky-note-comments"]}>
                            <div class={styles["comments-count"]}>
                              {photo.commentCount} comments
                            </div>
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
              <div class={`${styles.polaroid} ${styles.dragging}`}>
                <div class={styles["polaroid-content"]}>
                  {/* Simple preview during drag */}
                </div>
              </div>
            )}
          </DragOverlay>
        </DragDropProvider>
      </div>

      <div class={styles["canvas-controls"]}>
        <button
          class={styles["zoom-in"]}
          onClick={() => setCanvasScale((s) => Math.min(3, s + 0.1))}
        >
          +
        </button>
        <button
          class={styles["zoom-out"]}
          onClick={() => setCanvasScale((s) => Math.max(0.5, s - 0.1))}
        >
          -
        </button>
        <button
          class={styles["reset-view"]}
          onClick={() => {
            setCanvasScale(1);
            setCanvasPosition({
              x: window.innerWidth / 2 - 500,
              y: window.innerHeight / 2 - 400,
            });
          }}
        >
          Reset View
        </button>
      </div>


    </div>
  );
}
