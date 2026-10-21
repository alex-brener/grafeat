import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.logo}>Grafeat</span>
      <span>Made for people who run creative challenges on Instagram. Not affiliated with Instagram or Meta.</span>
    </footer>
  );
}
