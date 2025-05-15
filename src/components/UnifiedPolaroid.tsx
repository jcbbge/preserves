import { JSX, Show } from "solid-js";
import styles from "./Polaroid.module.css";
import { PolaroidPhoto } from "~/types/polaroid";
import { generateTransformString, generatePolaroidStyles } from "~/utils/polaroidUtils";

export interface UnifiedPolaroidProps {
  id: string;
  
  // Image/content
  src?: string;
  messageText?: string;
  caption?: string;
  
  // Date/metadata
  date?: string;
  createdTime?: number;
  likeCount?: number;
  commentCount?: number;
  
  // Positioning/state
  position?: { x: number; y: number };
  rotation?: number;
  zIndex?: number;
  isFlipped?: boolean;
  isPinned?: boolean;
  
  // Display options
  useRandomValues?: boolean;
  class?: string;
  
  // Visual style properties
  textAngle?: number;
  textX?: number;
  textY?: number;
  dateAngle?: number;
  dateX?: number;
  dateY?: number;
  bgColor?: string;
  
  // Event handlers
  onMouseDown: (e: MouseEvent, id: string) => void;
  onTouchStart?: (e: TouchEvent) => void;
  onFlip?: (id: string) => void;
  onPin?: (id: string) => void;
  onRotate?: (id: string) => void;
}

export function UnifiedPolaroid(props: UnifiedPolaroidProps): JSX.Element {
  // Default touch handler that delegates to mouse handler
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true,
        cancelable: true,
        view: window,
      }) as any;
      props.onMouseDown(mouseEvent, props.id);
    }
  };

  // Double click to flip if enabled
  const handleClick = (e: MouseEvent) => {
    if (e.detail === 2 && props.onFlip) {
      props.onFlip(props.id);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Use imported generatePolaroidStyles from polaroidUtils

  // Get visual styles - either from props or generate deterministically
  const {
    textAngle,
    textX,
    textY,
    dateAngle,
    dateX,
    dateY,
    bgColor
  } = props.useRandomValues
    ? generatePolaroidStyles(props.id)
    : {
        textAngle: props.textAngle || 0,
        textX: props.textX || 0,
        textY: props.textY || 0,
        dateAngle: props.dateAngle || 0,
        dateX: props.dateX || 0,
        dateY: props.dateY || 0,
        bgColor: props.bgColor || "#f8f6f1"
      };

  // Format date from timestamp if available
  const displayDate = props.date || (props.createdTime 
    ? new Date(props.createdTime * 1000).toLocaleDateString() 
    : "");

  // Caption/message text priority: caption > messageText
  const displayCaption = props.caption || props.messageText || "";

  return (
    <div
      id={`photo-${props.id}`}
      class={`${styles.polaroid} ${props.class || ""} ${props.isFlipped ? styles.flipped : ""} ${props.isPinned ? styles.pinned : ""}`}
      style={{
        transform: generateTransformString(props.position?.x || 0, props.position?.y || 0, props.rotation || 0),
        "z-index": props.zIndex || 1,
        background: bgColor,
      }}
      onClick={handleClick}
      onMouseDown={(e) => props.onMouseDown(e, props.id)}
      onTouchStart={props.onTouchStart || handleTouchStart}
    >
      {/* Front of the polaroid */}
      <div class={styles["polaroid-front"]}>
        <div class={styles["polaroid-image-area"]}>
          <Show
            when={props.src}
            fallback={
              <div class={styles["text-content"]}>{displayCaption}</div>
            }
          >
            <img
              src={props.src}
              alt="Polaroid photo"
              class={styles["polaroid-photo"]}
            />
          </Show>
          <div class={styles["polaroid-grit-overlay"]}></div>
        </div>
        
        <div class={styles["polaroid-caption"]}>
          <span
            class={styles["polaroid-handwritten"]}
            style={{
              display: "inline-block",
              transform: `rotate(${textAngle}deg) translate(${textX}px, ${textY}px)`,
            }}
          >
            {displayCaption}
          </span>
          <span
            class={`${styles["polaroid-handwritten"]} ${styles.date}`}
            style={{
              display: "inline-block",
              transform: `rotate(${dateAngle}deg) translate(${dateX}px, ${dateY}px)`,
            }}
          >
            {displayDate}
          </span>
          
          {/* Show like count if available */}
          <Show when={props.likeCount && props.likeCount > 0}>
            <div class={styles["polaroid-likes"]}>❤️ {props.likeCount}</div>
          </Show>
        </div>
        
        {/* Interactive controls */}
        <Show when={props.onPin || props.onRotate}>
          <div class={styles["polaroid-controls"]}>
            <Show when={props.onPin}>
              <button
                class={`${styles["pin-button"]} ${props.isPinned ? styles.pinned : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onPin?.(props.id);
                }}
                title={props.isPinned ? "Unpin" : "Pin"}
              >
                📌
              </button>
            </Show>
            <Show when={props.onRotate}>
              <button
                class={styles["rotate-button"]}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onRotate?.(props.id);
                }}
                title="Rotate"
              >
                🔄
              </button>
            </Show>
          </div>
        </Show>
      </div>
      
      {/* Back of the polaroid (shown when flipped) */}
      <Show when={props.onFlip}>
        <div class={styles["polaroid-back"]}>
          <div class={styles["sticky-note"]}>
            <div class={styles["sticky-note-content"]}>
              <div class={styles["sticky-note-title"]}>PEACH MEMORY</div>
              <div class={styles["sticky-note-text"]}>{props.messageText || displayCaption}</div>
              <div class={styles["sticky-note-date"]}>{displayDate}</div>
              
              {/* Show comments if available */}
              <Show when={props.commentCount && props.commentCount > 0}>
                <div class={styles["sticky-note-comments"]}>
                  <div class={styles["comments-count"]}>
                    {props.commentCount} comments
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}