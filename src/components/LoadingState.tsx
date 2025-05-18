import styles from '~/routes/dashboard.module.css';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div class={styles.loading}>
      <div class={styles["loading-spinner"]}></div>
      <p>{message}</p>
    </div>
  );
}