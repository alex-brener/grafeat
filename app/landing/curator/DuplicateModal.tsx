import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

export function DuplicateModal({ v }: { v: CuratorViewModel }) {
  if (!v.dupOpen) return null;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      onClick={v.closeDup}
      className={styles.fadeInFast}
      style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(22,21,18,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={stop}
        style={{ width: "100%", maxWidth: 520, maxHeight: "100%", overflow: "auto", background: "#F4F1EA", borderRadius: 10, padding: 26, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 30px 60px rgba(0,0,0,.25)" }}
      >
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600 }}>Duplicate {v.dupSource}</div>
          <h3 style={{ margin: "4px 0 0", fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 34, lineHeight: 1.05 }}>Run it again</h3>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
          New challenge name
          <input
            value={v.dupName}
            onChange={v.onDupName}
            style={{ height: 40, border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", padding: "0 12px", fontSize: 14, fontWeight: 400, color: "#1D1C18" }}
          />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 6, background: "#EEEAE0", fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>Oct 1–31, 2027 · same hashtag templates, new year</span>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2px 12px", justifyContent: "start", color: "#3E3B33" }}>
            <span style={{ color: "#6F6A5E" }}>Challenge</span>
            <span style={{ color: "#5C6127" }}>{v.dupChal}</span>
            <span style={{ color: "#6F6A5E" }}>Day 01</span>
            <span style={{ color: "#5C6127" }}>{v.dupDay}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Carry over</span>
          {v.dupItems.map((d) => (
            <div key={d.label} onClick={d.onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid #E2DDD1", cursor: "pointer", fontSize: 13.5 }}>
              {d.on && (
                <span style={{ width: 18, height: 18, flex: "none", borderRadius: 4, background: "#5C6127", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✓
                </span>
              )}
              {d.off && <span style={{ width: 18, height: 18, flex: "none", borderRadius: 4, border: "1.5px solid #A39E90" }} />}
              <span style={{ flex: 1 }}>{d.label}</span>
              <span style={{ fontSize: 12, color: "#6F6A5E" }}>{d.sub}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: "#5E5A50" }}>
          Not copied: submissions, selections, verified creators and published features. Every creator starts as not verified in the new challenge.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={v.closeDup} style={{ height: 40, padding: "0 14px", borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13.5, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={v.createDup} style={{ height: 40, padding: "0 16px", borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Create draft
          </button>
        </div>
      </div>
    </div>
  );
}
