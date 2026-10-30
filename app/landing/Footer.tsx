import { Logo } from "./Logo";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Logo />
      <span>Made for people who run creative challenges on Instagram. Not affiliated with Instagram or Meta.</span>
      <nav className={styles.nav}>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </nav>
    </footer>
  );
}
