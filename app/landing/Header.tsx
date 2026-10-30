import { Logo } from "./Logo";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <Logo priority />
      <div className={styles.spacer} />
      <nav className={styles.nav}>
        <a href="#how" className={styles.navLink}>
          How it works
        </a>
        <a href="#questions" className={styles.navLink}>
          Questions
        </a>
        <a href="#early-access" className={styles.navCta}>
          I run a challenge
        </a>
      </nav>
    </header>
  );
}
