import { useNavigate } from "@solidjs/router";
import { onMount, For, createSignal } from "solid-js";
import { usePeach } from "~/context/peach";
import { Title } from "@solidjs/meta";
import { createStore } from "solid-js/store";
import styles from "./index.module.css";
import { initializePolaroidPhotos, storeInitialPositions } from "~/utils/photoUtils";
import { redirectIfAuthenticated } from "~/utils/authUtils";
import { PolaroidPhoto } from "~/types/polaroid";
import Polaroid from "~/components/Polaroid";
import { stockImages, predefinedPositions } from "~/data/stockImages";
import { createDraggable } from "~/primitives/createDraggable";
import LoginForm from "~/components/LoginForm";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();
  const [corkboardRef, setCorkboardRef] = createSignal<HTMLDivElement>();
  const [polaroidPhotos, setPolaroidPhotos] = createStore<PolaroidPhoto[]>([]);

  // Storage key for persistable state
  const storageKeyPrefix = "peach_preserves_login_";



  // Use our custom draggable primitive for polaroid dragging behavior
  const { draggedId, handleDragStart, handleTouchStart, isDragging } =
    createDraggable(polaroidPhotos, setPolaroidPhotos, {
      storageKeyPrefix,
      zIndexRange: { min: 0, max: 9 },
      cssModuleStyles: styles,
    });

  // Use onMount to ensure we don't redirect during SSR
  onMount(() => {
    redirectIfAuthenticated(isAuthenticated, navigate);
    const photos = initializePolaroidPhotos(stockImages, {
      predefinedPositions,
      storageKeyPrefix,
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
    });
    setPolaroidPhotos(photos);
    storeInitialPositions(predefinedPositions, storageKeyPrefix);
  });

  return (
    <div class={styles["peach-preserve"]}>
      <Title>Peach Preserves</Title>

      <div ref={setCorkboardRef} class={styles.corkboard}>
        <For each={polaroidPhotos}>
          {(photo) => (
            <Polaroid
              id={photo.id}
              src={photo.src}
              caption={photo.caption}
              date={photo.date}
              position={photo.position}
              rotation={photo.rotation}
              zIndex={photo.zIndex}
              useRandomValues={true}
              onMouseDown={handleDragStart}
              onTouchStart={(e) => handleTouchStart(e, photo.id)}
              class={`${styles["background-polaroid"]} ${isDragging(photo.id) ? styles.dragging : ""}`}
            />
          )}
        </For>
        <LoginForm />
      </div>
    </div>
  );
}
