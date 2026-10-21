import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

export function DoneScreen({ v }: { v: CuratorViewModel }) {
  return (
    <div className={styles.fadeInSlow} style={{ position: "absolute", inset: 0, overflow: "auto" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "56px 28px 60px", display: "flex", flexDirection: "column", gap: 22 }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#5C6127", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ✓
        </span>
        <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 58, lineHeight: 0.98, letterSpacing: "-0.015em" }}>
          {v.doneTitle}
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: "#3E3B33" }}>{v.doneSub}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {v.doneThumbs.map((t, i) => (
            <div key={i} style={{ position: "relative", width: 48, height: 60, borderRadius: 3, overflow: "hidden" }}>
              {t.art}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #E2DDD1", paddingTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>You curated this in {v.elapsed}.</span> <span style={{ color: "#5E5A50" }}>Measured from when you opened this demo.</span>
          </div>
          <div style={{ fontSize: 14, color: "#3E3B33" }}>How long does the same work take you by hand today?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {v.timeOpts.map((t) =>
              t.on ? (
                <span key={t.label} style={{ height: 34, padding: "0 13px", borderRadius: 999, background: "#1D1C18", color: "#F4F1EA", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center" }}>
                  {t.label}
                </span>
              ) : (
                <button
                  key={t.label}
                  type="button"
                  onClick={t.onClick}
                  style={{ height: 34, padding: "0 13px", borderRadius: 999, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13, cursor: "pointer" }}
                >
                  {t.label}
                </button>
              )
            )}
          </div>
          {v.answered && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ fontSize: 13.5, color: "#3E3B33" }}>Thanks, that helps.</span>
              {v.hasCta && (
                <button type="button" onClick={v.onCta} style={{ height: 40, padding: "0 16px", borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Try it with your challenge →
                </button>
              )}
              {v.noCta && (
                <a
                  href="#early-access"
                  style={{ height: 40, padding: "0 16px", borderRadius: 6, background: "#1D1C18", color: "#F4F1EA", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                >
                  Try it with your challenge →
                </a>
              )}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid #E2DDD1", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#5E5A50" }}>Day 17 opens at midnight. Submissions will be collected for you.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={v.goToday} style={{ height: 34, padding: "0 12px", borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Back to Day 16
            </button>
            <button type="button" onClick={v.resetDemo} style={{ height: 34, padding: "0 12px", borderRadius: 6, border: "none", background: "none", color: "#5E5A50", fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Restart demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
