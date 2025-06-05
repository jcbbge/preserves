import { Show } from 'solid-js';
import styles from './DownloadCompleteModal.module.css';
import { Polaroid } from './Polaroid';

type DownloadCompleteModalProps = {
  visible: boolean;
};

export function DownloadCompleteModal(props: DownloadCompleteModalProps) {
  return (
    <Show when={props.visible}>
      <div class={styles["download-complete"]}>
        <Polaroid
          id="download-complete"
          customContent={
            <div class={styles["success-content"]}>
              <div class={styles["success-icon"]}>✓</div>
            </div>
          }
          caption="Downloaded! Check your downloads folder. Double click on the zip folder."
          bgColor="#f0fff4"
          rotation={-3}
          class={styles["complete-polaroid"]}
          onMouseDown={() => {}}
          useRandomValues={false}
        />
      </div>
    </Show>
  );
}