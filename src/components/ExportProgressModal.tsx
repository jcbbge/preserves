import { Show } from 'solid-js';
import styles from '~/routes/dashboard.module.css';
import { useExport } from '~/context/export';

export function ExportProgressModal() {
  const exportContext = useExport();
  
  return (
    <Show when={exportContext.exportData.status === "exporting" || exportContext.exportData.status === "preparing"}>
      <div
        class={styles["download-progress"]}
        role="region"
        aria-live="polite"
      >
        <div
          class={`${styles.polaroid} ${styles["progress-polaroid"]}`}
        >
          <div class={styles["polaroid-image-area"]}>
            <div
              class={`${styles["polaroid-photo"]} ${styles["progress-content"]}`}
            >
              <div class={styles["progress-header"]}>
                <h3>Downloading Your Peach Data</h3>
              </div>

              <div class={styles["progress-details"]}>
                <div class={styles["progress-activity"]}>
                  {exportContext.exportData.progress.currentActivity}
                </div>

                <div class={styles["progress-bar-wrapper"]}>
                  <div
                    class={styles["progress-bar"]}
                    style={{
                      width: `${exportContext.exportData.progress.percentage}%`,
                    }}
                    role="progressbar"
                    aria-valuenow={
                      exportContext.exportData.progress.percentage
                    }
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>

                <div class={styles["progress-stats"]}>
                  <span class={styles["progress-percentage"]}>
                    {Math.round(
                      exportContext.exportData.progress.percentage,
                    )}
                    %
                  </span>
                  {exportContext.exportData.progress.completedItems >
                    0 && (
                    <span class={styles["progress-count"]}>
                      {exportContext.exportData.progress.completedItems}{" "}
                      / {exportContext.exportData.progress.totalItems}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div class={styles["polaroid-grit-overlay"]} />
          </div>
          <div class={styles["polaroid-caption"]}>
            <div class={styles["caption-content"]}>
              <span class={styles["polaroid-handwritten"]}>
                Preserving your peaches
              </span>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}