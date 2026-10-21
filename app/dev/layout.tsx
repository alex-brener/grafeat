import styles from "./dev.module.css";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.diagnostic}>{children}</div>;
}
