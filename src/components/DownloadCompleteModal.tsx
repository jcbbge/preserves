import { Show } from 'solid-js';
import styles from '~/routes/dashboard.module.css';

type DownloadCompleteModalProps = {
  visible: boolean;
};

export function DownloadCompleteModal({ visible }: DownloadCompleteModalProps) {
  return (
    <Show when={visible}>
      <div class={styles["download-complete"]}>
        <div class={styles.polaroid}>
          <div
            class={`${styles["polaroid-content"]} ${styles["success-content"]}`}
          >
            <div class={styles["success-icon"]}>✓</div>
          </div>
          <div class={styles["polaroid-caption"]}>
            Downloaded! Your memories have been safely archived.
          </div>
        </div>
      </div>
    </Show>
  );
}