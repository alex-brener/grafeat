import Image from "next/image";
import { SignOutButton } from "./SignOutButton";
import logoMark from "../icon.png";
import styles from "./Dashboard.module.css";

/**
 * The branded header (logo + account controls) + page chrome, shared by the
 * dashboard home and every /dashboard/challenges/* page — extracted so the
 * header isn't copy-pasted into each new page (Slice B).
 */
export function DashboardShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image src={logoMark} alt="" width={26} height={26} className={styles.logoMark} priority />
          Grafeat
        </div>
        <div className={styles.spacer} />
        <div className={styles.accountControls}>
          <span>{email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
