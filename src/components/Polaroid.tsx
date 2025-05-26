import { JSX, Show } from "solid-js";
import styles from "./Polaroid.module.css";
import { PolaroidPhoto } from "~/types/polaroid";
import { generateTransformString, generatePolaroidStyles } from "~/utils/polaroidUtils";

export interface PolaroidProps {
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
  captionStyle?: { fontSize: number; offsetY: number };
  
  // Event handlers
  onMouseDown: (e: MouseEvent, id: string) => void;
  onTouchStart?: (e: TouchEvent) => void;

  onPin?: (id: string) => void;
}

export function Polaroid(props: PolaroidProps): JSX.Element {
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



  // Use imported generatePolaroidStyles from polaroidUtils

  // Get visual styles - either from props or generate deterministically
  const {
    textAngle,
    textX,
    textY,
    dateAngle,
    dateX,
    dateY,
    bgColor,
    captionFontSize,
    dateFontSize,
    captionOffsetX,
    captionOffsetY,
    dateOffsetX,
    dateOffsetY,
    showDate,
    wornIntensity
  } = props.useRandomValues
    ? generatePolaroidStyles(props.id)
    : {
        textAngle: props.textAngle || 0,
        textX: props.textX || 0,
        textY: props.textY || 0,
        dateAngle: props.dateAngle || 0,
        dateX: props.dateX || 0,
        dateY: props.dateY || 0,
        bgColor: props.bgColor || "#f8f6f1",
        captionFontSize: 14,
        dateFontSize: 12,
        captionOffsetX: 0,
        captionOffsetY: 0,
        dateOffsetX: 0,
        dateOffsetY: 0,
        showDate: true,
        wornIntensity: 0.2
      };

  // Format date from timestamp if available
  const displayDate = props.date || (props.createdTime 
    ? new Date(props.createdTime * 1000).toLocaleDateString() 
    : "");

  // Caption/message text priority: caption > messageText
  const displayCaption = props.caption || props.messageText || "";

  // Dynamic caption styling based on length
  const dynamicCaptionFontSize = props.captionStyle?.fontSize || captionFontSize;
  const dynamicCaptionOffsetY = (props.captionStyle?.offsetY || 0) + captionOffsetY;

  return (
    <div
      id={`photo-${props.id}`}
      class={`${styles.polaroid} ${props.class || ""} ${props.isPinned ? styles.pinned : ""}`}
      style={{
        transform: generateTransformString(props.position?.x || 0, props.position?.y || 0, props.rotation || 0),
        "z-index": props.zIndex || 1,
        background: bgColor,
      }}

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
              transform: `rotate(${textAngle}deg) translate(${textX + captionOffsetX}px, ${textY + dynamicCaptionOffsetY}px)`,
              "font-size": `${dynamicCaptionFontSize}px`,
              "line-height": "1.2",
              "max-width": "220px",
              "text-align": "left",
              "mask": `radial-gradient(circle at 30% 40%, transparent ${wornIntensity * 100}%, black ${(wornIntensity + 0.1) * 100}%), radial-gradient(circle at 70% 80%, transparent ${wornIntensity * 80}%, black ${(wornIntensity + 0.15) * 100}%)`,
              "-webkit-mask": `radial-gradient(circle at 30% 40%, transparent ${wornIntensity * 100}%, black ${(wornIntensity + 0.1) * 100}%), radial-gradient(circle at 70% 80%, transparent ${wornIntensity * 80}%, black ${(wornIntensity + 0.15) * 100}%)`,
            }}
          >
            {displayCaption}
          </span>
          <Show when={showDate && displayDate}>
            <span
              class={`${styles["polaroid-handwritten"]} ${styles.date}`}
              style={{
                display: "inline-block",
                transform: `rotate(${dateAngle}deg) translate(${dateX + dateOffsetX}px, ${dateY + dateOffsetY}px)`,
                "font-size": `${dateFontSize}px`,
                "mask": `radial-gradient(circle at 40% 30%, transparent ${wornIntensity * 90}%, black ${(wornIntensity + 0.12) * 100}%), radial-gradient(circle at 80% 70%, transparent ${wornIntensity * 70}%, black ${(wornIntensity + 0.18) * 100}%)`,
                "-webkit-mask": `radial-gradient(circle at 40% 30%, transparent ${wornIntensity * 90}%, black ${(wornIntensity + 0.12) * 100}%), radial-gradient(circle at 80% 70%, transparent ${wornIntensity * 70}%, black ${(wornIntensity + 0.18) * 100}%)`,
              }}
            >
              {displayDate}
            </span>
          </Show>
          
          {/* Show like count if available */}
          <Show when={props.likeCount && props.likeCount > 0}>
            <div class={styles["polaroid-likes"]}>❤️ {props.likeCount}</div>
          </Show>
        </div>
        
        {/* Interactive controls */}
        <Show when={props.onPin}>
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
          </div>
        </Show>
      </div>
      

    </div>
  );
}