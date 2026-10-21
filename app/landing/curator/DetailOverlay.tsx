import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

export function DetailOverlay({ v }: { v: CuratorViewModel }) {
  if (!v.hasDetail || !v.dt) return null;
  const dt = v.dt;
  return (
    <div
      className={styles.fadeInFast}
      style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(22,21,18,.94)", display: "flex", flexWrap: "wrap", overflow: "auto" }}
    >
      <div style={{ flex: "1 1 420px", minHeight: 420, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 64px" }}>
        <button
          type="button"
          onClick={v.closeDetail}
          style={{ position: "absolute", left: 18, top: 14, height: 34, padding: "0 12px", borderRadius: 6, border: "1px solid rgba(244,241,234,.25)", background: "transparent", color: "#F4F1EA", fontSize: 13, cursor: "pointer" }}
        >
          Close
        </button>
        <button
          type="button"
          onClick={v.detailPrev}
          aria-label="Previous"
          style={{ position: "absolute", left: 14, top: "50%", marginTop: -20, width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(244,241,234,.25)", background: "transparent", color: "#F4F1EA", fontSize: 18, cursor: "pointer" }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={v.detailNext}
          aria-label="Next"
          style={{ position: "absolute", right: 14, top: "50%", marginTop: -20, width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(244,241,234,.25)", background: "transparent", color: "#F4F1EA", fontSize: 18, cursor: "pointer" }}
        >
          ›
        </button>
        <div style={{ position: "relative", width: "min(100%,520px)", aspectRatio: "4/5", borderRadius: 3, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,.4)" }}>
          {dt.art}
          {dt.isVideo && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(22,21,18,.6)", color: "#fff", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 4 }}>
                ▶
              </span>
            </div>
          )}
        </div>
      </div>
      <aside style={{ flex: "0 1 380px", minWidth: 300, background: "#F4F1EA", padding: "26px 26px 30px", display: "flex", flexDirection: "column", gap: 18, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1.05, wordBreak: "break-word" }}>@{dt.handle}</span>
          <span style={{ fontSize: 12.5, color: "#5E5A50" }}>
            {dt.posted} · {dt.media}
          </span>
          <a href={dt.postUrl} target="_blank" rel="noopener" style={{ fontSize: 12.5, fontWeight: 500 }}>
            Open post on Instagram ↗
          </a>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", color: "#3E3B33" }}>{dt.caption}</div>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #E2DDD1" }}>
          {dt.checks.map((c) => (
            <div key={c.label} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #E2DDD1", fontSize: 13 }}>
              {c.ok && <span style={{ color: "#5C6127", fontWeight: 700, width: 14, flex: "none" }}>✓</span>}
              {c.fail && <span style={{ color: "#A4502B", fontWeight: 700, width: 14, flex: "none" }}>✕</span>}
              {c.review && <span style={{ color: "#8A6510", fontWeight: 700, width: 14, flex: "none" }}>?</span>}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{c.label}</span>
                {c.hasNote && <span style={{ fontSize: 12.5, color: "#5E5A50" }}>{c.note}</span>}
              </div>
            </div>
          ))}
        </div>
        {dt.hasFeatured && <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Featured earlier this challenge: {dt.featured}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {dt.canSelect && (
            <button type="button" onClick={dt.onSelect} style={{ flex: 1, height: 42, borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Add to feature · {dt.nextNum}/10
            </button>
          )}
          {dt.isSelected && (
            <button type="button" onClick={dt.onSelect} style={{ flex: 1, height: 42, borderRadius: 6, border: "1px solid #5C6127", background: "#E6E6D0", color: "#3A3D16", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Selected as slide {dt.selNum} · Remove
            </button>
          )}
          {dt.isAside && (
            <button type="button" onClick={dt.onInclude} style={{ flex: 1, height: 42, borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Include anyway
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
