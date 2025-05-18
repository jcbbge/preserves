import { Show } from 'solid-js';
import styles from '~/routes/dashboard.module.css';

type ErrorNotificationProps = {
  message: string | null;
  onDismiss: () => void;
};

export function ErrorNotification({ message, onDismiss }: ErrorNotificationProps) {
  return (
    <Show when={message}>
      <div class={styles["error-note"]}>
        <p>{message}</p>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </Show>
  );
}