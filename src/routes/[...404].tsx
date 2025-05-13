import { useNavigate } from "@solidjs/router";
import styles from "./404.module.css";

export default function NotFound() {
  const navigate = useNavigate();

  const goHome = () => {
    navigate("/dashboard");
  };

  return (
    <div class={styles["peach-preserve"]}>
      <header class={styles.header}>
        <div class={styles.logo}>
          <img src="/peachdotcool.png" alt="Peach" class={styles["logo-img"]} />
          <span>Peach Preserves</span>
        </div>
      </header>

      <div class={styles["not-found"]}>
        <div class={styles.polaroid} onClick={goHome}>
          <div class={styles["polaroid-image-area"]}>
            <div
              class={`${styles["polaroid-photo"]} ${styles["polaroid-text-content"]}`}
            >
              :(
            </div>
            <div class={styles["polaroid-grit-overlay"]} />
          </div>
          <div class={styles["polaroid-caption"]}>
            <div class={styles["caption-content"]}>
              <span class={styles["polaroid-handwritten"]}>
                404 - Page not found
              </span>
              <span class={styles["return-link"]}>Return Home</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
