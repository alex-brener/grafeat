import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

export function ToastBubble({ v }: { v: CuratorViewModel }) {
  if (!v.hasToast) return null;
  return (
    <div
      className={styles.toastUp}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 92,
        zIndex: 40,
        transform: "translateX(-50%)",
        maxWidth: "calc(100% - 40px)",
        padding: "10px 16px",
        borderRadius: 8,
        background: "#1D1C18",
        color: "#F4F1EA",
        fontSize: 13,
        boxShadow: "0 10px 30px rgba(0,0,0,.2)",
      }}
    >
      {v.toast}
    </div>
  );
}
