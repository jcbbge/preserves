import { useNavigate } from "@solidjs/router";
import { usePeach } from "~/context/peach";
import styles from "./[...404].module.css";

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = usePeach();

  const goHome = () => {
    if (isAuthenticated()) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  return (
    <div class={styles["peach-preserve"]}>
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
