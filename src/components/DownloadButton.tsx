import styles from '~/routes/dashboard.module.css';
import { useExport } from '~/context/export';

type DownloadButtonProps = {
  onClick: () => void;
  downloading: boolean;
};

export function DownloadButton({ onClick, downloading }: DownloadButtonProps) {
  const exportContext = useExport();
  
  return (
    <div class={styles["preserve-button-container"]}>
      <button
        onClick={onClick}
        class={styles["preserve-button"]}
        disabled={
          // Only disable during active processes
          exportContext.exportData.status === "preparing" ||
          exportContext.exportData.status === "exporting" ||
          downloading
        }
        aria-busy={
          exportContext.exportData.status === "exporting" ||
          downloading
        }
      >
        {exportContext.exportData.status === "preparing" ||
        exportContext.exportData.status === "exporting"
          ? "Downloading..."
          : "Download my Data"}
      </button>
    </div>
  );
}