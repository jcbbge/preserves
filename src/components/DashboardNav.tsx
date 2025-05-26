import { createSignal } from "solid-js";
import { usePeach } from "~/context/peach";
import { useExport } from "~/context/export";
import { Polaroid } from "./Polaroid";

import styles from "./LoginForm.module.css";

interface DashboardNavProps {
  isDragging?: boolean;
  onDownload: () => void;
}

export default function DashboardNav(props: DashboardNavProps) {
  const { user } = usePeach();
  const exportContext = useExport();

  // Log user data to inspect avatar and username structure
  console.log("[DASHBOARD_NAV] Full user data:", user.data);
  console.log("[DASHBOARD_NAV] User object keys:", user.data ? Object.keys(user.data) : "No user data");

  // Get user avatar and username from API response
  const getUserAvatar = () => {
    // Default avatar if none found
    return user.data?.avatar || user.data?.avatarSrc || "/peachdotcool.png";
  };

  const getUserDisplayName = () => {
    return user.data?.username || "Unknown User";
  };

  const handleDownloadClick = () => {
    props.onDownload();
  };

  const isDownloading = () => {
    return exportContext.exportData.status === "preparing" || 
           exportContext.exportData.status === "exporting";
  };

  return (
    <div class={styles["login-container"]}>
      {/* User avatar polaroid - top layer */}
      <div class={styles["login-polaroid-wrapper"]}>
        <Polaroid
          id="user-avatar"
          src={getUserAvatar()}
          caption={getUserDisplayName()}
          class={`${styles["login-polaroid"]} ${props.isDragging ? styles["dragging"] : ""}`}
          onMouseDown={(e) => {}} // Allow events to bubble for dragging
        />
      </div>

      {/* Download button polaroid - bottom layer, peeking out */}
      <div class={`${styles["connect-polaroid-wrapper"]} ${props.isDragging ? styles["dragging"] : ""}`}>
        <button
          type="button"
          class={styles["connect-button"]}
          onClick={handleDownloadClick}
          disabled={isDownloading()}
        >
          <div class={styles["connect-polaroid-container"]}>
            <div class={styles["connect-image-area"]}>
              <div class={styles["connect-photo"]}>
                {isDownloading() ? "Downloading..." : "Download"}
              </div>
              <div class={styles["arrow-down-container"]}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                </svg>
              </div>
              <div class={styles["polaroid-grit-overlay"]}></div>
            </div>
            <div class={styles["connect-caption"]}>
              <span class={styles["connect-text"]}>
                Download My Data
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}