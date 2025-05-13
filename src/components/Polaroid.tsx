import { JSX } from "solid-js";
import styles from "./Polaroid.module.css";
import { PolaroidProps } from "~/types/polaroid";
import { 
  seededRandom, 
  generatePolaroidStyles, 
  generateTransformString 
} from "~/utils/photoUtils";


export default function Polaroid(props: PolaroidProps): JSX.Element {
  // Touch handler that delegates to mouse handler
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

  // Get visual style values - either from props or generate deterministically
  let { 
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
        textAngle: props.textAngle,
        textX: props.textX,
        textY: props.textY,
        dateAngle: props.dateAngle,
        dateX: props.dateX,
        dateY: props.dateY,
        bgColor: props.bgColor
      };

  return (
    <div
      id={`photo-${props.id}`}
      class={`${styles.polaroid} ${props.class || ""}`}
      style={{
        transform: generateTransformString(props.position?.x || 0, props.position?.y || 0, props.rotation || 0),
        "z-index": props.zIndex || 1,
        background: bgColor || "#fff",
      }}
      onMouseDown={(e) => props.onMouseDown(e, props.id)}
      onTouchStart={props.onTouchStart || handleTouchStart}
    >
      <div class={styles["polaroid-image-area"]}>
        <img
          src={props.src}
          alt="Polaroid photo"
          class={styles["polaroid-photo"]}
        />
        <div class={styles["polaroid-grit-overlay"]}></div>
      </div>
      <div class={styles["polaroid-caption"]}>
        <span
          class={styles["polaroid-handwritten"]}
          style={{
            display: "inline-block",
            transform: `rotate(${textAngle || 0}deg) translate(${textX || 0}px, ${textY || 0}px)`,
          }}
        >
          {props.caption}
        </span>
        <span
          class={`${styles["polaroid-handwritten"]} ${styles.date}`}
          style={{
            display: "inline-block",
            transform: `rotate(${dateAngle || 0}deg) translate(${dateX || 0}px, ${dateY || 0}px)`,
          }}
        >
          {props.date}
        </span>
      </div>
    </div>
  );
}