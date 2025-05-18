import styles from '~/routes/dashboard.module.css';

type PeachHeaderProps = {
  onLogout: () => void;
};

export function PeachHeader({ onLogout }: PeachHeaderProps) {
  return (
    <header class={styles.header}>
      <div class={styles.logo}>
        <img src="/peachdotcool.png" alt="Peach" class={styles["logo-img"]} />
        <span>Peach Preserves</span>
      </div>
      
      <button
        class={styles["logout-button"]}
        onClick={onLogout}
        aria-label="Logout"
      >
        Logout
      </button>
    </header>
  );
}