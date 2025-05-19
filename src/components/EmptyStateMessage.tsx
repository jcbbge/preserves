import styles from './EmptyStateMessage.module.css';

export function EmptyStateMessage() {
  return (
    <div class={styles["no-posts"]}>
      <p>No posts found. Your peaches are still growing! 🌱</p>
    </div>
  );
}