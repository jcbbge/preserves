import { Show } from 'solid-js';
import styles from '~/routes/dashboard.module.css';
import { useExport } from '~/context/export';

export function ExportErrorModal() {
  const exportContext = useExport();
  
  return (
    <Show when={exportContext.exportData.status === "error" && exportContext.exportData.error}>
      <div class={styles["error-modal"]}>
        <div class={`${styles.polaroid} ${styles["error-polaroid"]}`}>
          <div class={styles["polaroid-image-area"]}>
            <div
              class={`${styles["polaroid-photo"]} ${styles["error-content"]}`}
            >
              <div class={styles["error-header"]}>
                <h3>Download Failed</h3>
              </div>
              <div class={styles["error-message"]}>
                {exportContext.exportData.error.message}
              </div>
              <div class={styles["error-actions"]}>
                <button
                  onClick={() => exportContext.retryExport()}
                  class={styles["retry-button"]}
                >
                  Try Again
                </button>
                <button
                  onClick={() => exportContext.resetExport()}
                  class={styles["cancel-button"]}
                >
                  Cancel
                </button>
              </div>
            </div>
            <div class={styles["polaroid-grit-overlay"]} />
          </div>
          <div class={styles["polaroid-caption"]}>
            <div class={styles["caption-content"]}>
              <span class={styles["polaroid-handwritten"]}>
                Oops! Something went wrong
              </span>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}