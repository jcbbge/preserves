import { createSignal } from "solid-js";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { Polaroid } from "./Polaroid";

import styles from "./DashboardNav.module.css";

interface DashboardNavProps {
  isDragging?: boolean;
  onDownload: () => void;
}

export default function DashboardNav(props: DashboardNavProps) {
  const { user } = usePeach();
  const exportContext = useExport();


  // Get user avatar and bio from context
  const getUserAvatar = () => {
    return user.data?.avatarSrc;
  };

  const getUserBio = () => {
    return user.data?.bio;
  };

  const handleDownloadClick = () => {
    props.onDownload();
  };

  const isDownloading = () => {
    return exportContext.exportData.status === "preparing" || 
           exportContext.exportData.status === "exporting";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !isDownloading()) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      
      // If focused element is a button, trigger its click handler
      if (target.tagName === "BUTTON") {
        target.click();
      }
    }
  };

  return (
    <div class={styles["dashboard-nav-container"]} onKeyDown={handleKeyDown}>
      {/* User avatar polaroid - top layer */}
      <div class={styles["avatar-polaroid-wrapper"]}>
        <Polaroid
          id="user-avatar"
          src={getUserAvatar()}
          caption={getUserBio()}
          class={`${styles["avatar-polaroid"]} ${props.isDragging ? styles["dragging"] : ""}`}
          onMouseDown={(e) => {}} // Allow events to bubble for dragging
        />
      </div>

      {/* Download button polaroid - bottom layer, peeking out */}
      <div class={`${styles["download-polaroid-wrapper"]} ${props.isDragging ? styles["dragging"] : ""}`}>
        <button
          type="button"
          class={styles["download-button"]}
          onClick={handleDownloadClick}
          disabled={isDownloading()}
          tabindex="0"
          autofocus
        >
          <div class={styles["download-polaroid-container"]}>
            <div class={styles["download-image-area"]}>
              <div class={styles["download-photo"]}>
                {isDownloading() ? "Downloading..." : "Download"}
              </div>
              <div class={styles["arrow-down-container"]}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                </svg>
              </div>
              <div class={styles["polaroid-grit-overlay"]}></div>
            </div>
            <div class={styles["download-caption"]}>
              <span class={styles["download-text"]}>
                Download My Data
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}