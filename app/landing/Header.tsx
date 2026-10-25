import Image from "next/image";
import logoMark from "../icon.png";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Image src={logoMark} alt="" width={30} height={30} className={styles.logoMark} priority />
        Grafeat
      </div>
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
