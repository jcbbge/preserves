import { Show } from 'solid-js';
import styles from './ExportProgressModal.module.css';
import { useExport } from '~/context/export';
import { Polaroid } from './Polaroid';

export function ExportProgressModal() {
  const exportContext = useExport();
  
  return (
    <Show when={exportContext.exportData.status === "exporting" || exportContext.exportData.status === "preparing"}>
      <div
        class={styles["download-progress"]}
        role="region"
        aria-live="polite"
      >
        <Polaroid
          id="export-progress"
          customContent={
            <div class={styles["progress-content"]}>
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
          }
          caption="Preserving your peaches"
          bgColor="#f8f6f1"
          rotation={-2}
          class={styles["progress-polaroid"]}
          onMouseDown={() => {}}
          useRandomValues={false}
        />
      </div>
    </Show>
  );
}