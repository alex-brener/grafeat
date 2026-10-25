import Image from "next/image";
import logoMark from "../logo.png";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.logo}>
        <Image src={logoMark} alt="" width={34} height={34} className={styles.logoMark} />
        Grafeat
      </span>
      <span>Made for people who run creative challenges on Instagram. Not affiliated with Instagram or Meta.</span>
      <nav className={styles.nav}>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
      </nav>
    </footer>
  );
}
