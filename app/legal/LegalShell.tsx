import type { ReactNode } from "react";
import { Footer } from "../landing/Footer";
import styles from "./legal.module.css";

interface LegalShellProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  children: ReactNode;
}

export function LegalShell({ eyebrow, title, lastUpdated, intro, children }: LegalShellProps) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.logo}>Grafeat</div>
        <div className={styles.spacer} />
        <a href="/" className={styles.backLink}>
          ← Back to Grafeat
        </a>
      </header>
      <main className={styles.page}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated: {lastUpdated}</p>
        {intro && <p className={styles.intro}>{intro}</p>}
        <article className={styles.prose}>{children}</article>
      </main>
      <Footer />
    </>
  );
}
