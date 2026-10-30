import Image from "next/image";
import logoMark from "../logo.png";
import styles from "./Logo.module.css";

/**
 * The one Grafeat logo mark + wordmark, shared by the homepage header, the
 * legal-page header, and the footer — always links home, so clicking it
 * anywhere in the app is a reliable "take me to grafeat.com" action.
 */
export function Logo({ priority = false }: { priority?: boolean }) {
  return (
    <a href="/" className={styles.logo}>
      <Image src={logoMark} alt="" width={30} height={30} className={styles.logoMark} priority={priority} />
      Grafeat
    </a>
  );
}
