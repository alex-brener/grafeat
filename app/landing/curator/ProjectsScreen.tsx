import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

export function ProjectsScreen({ v }: { v: CuratorViewModel }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 28px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 52, lineHeight: 1 }}>Challenges</h2>
          <button
            type="button"
            onClick={v.newChallenge}
            style={{ height: 38, padding: "0 14px", borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            New challenge
          </button>
        </div>
        <p style={{ margin: "10px 0 26px", fontSize: 13.5, color: "#5E5A50", maxWidth: 560 }}>
          Each challenge keeps its own rules, prompts, caption template and publishing settings. Duplicate one to run it again next season.
        </p>
        <div style={{ borderTop: "1px solid #E2DDD1" }}>
          {v.projectRows.map((p) => (
            <div key={p.id} style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center", padding: "20px 0", borderBottom: "1px solid #E2DDD1" }}>
              {p.fresh && <div className={styles.flashOverlayLong} style={{ position: "absolute", inset: 0, background: "#E3E4C6", pointerEvents: "none" }} />}
              <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, width: 104, flex: "none" }}>
                {p.arts.map((a, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 2, overflow: "hidden" }}>
                    {a.art}
                  </div>
                ))}
              </div>
              <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1.05 }}>{p.name}</span>
                <span style={{ fontSize: 13, color: "#5E5A50" }}>{p.dates} · @creativeoctober</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12.5 }}>
                  {p.active && <span style={{ padding: "2px 8px", borderRadius: 999, background: "#E6E6D0", color: "#4A4E1F", fontWeight: 600 }}>Active</span>}
                  {p.draft && <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #CFC9BB", color: "#3E3B33", fontWeight: 600 }}>Draft</span>}
                  {p.done && <span style={{ padding: "2px 8px", borderRadius: 999, background: "#EAE6DC", color: "#5E5A50", fontWeight: 600 }}>Completed</span>}
                  <span style={{ color: "#5E5A50" }}>{p.note}</span>
                </div>
                {p.active && (
                  <div style={{ height: 3, maxWidth: 280, background: "#E2DDD1", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: "52%", height: "100%", background: "#5C6127" }} />
                  </div>
                )}
              </div>
              <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.active && (
                  <button type="button" onClick={v.goToday} style={{ height: 36, padding: "0 14px", borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Open Day 16
                  </button>
                )}
                <button type="button" onClick={p.onDuplicate} style={{ height: 36, padding: "0 14px", borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Duplicate
                </button>
                <button type="button" onClick={v.goSettings} style={{ height: 36, padding: "0 12px", borderRadius: 6, border: "none", background: "none", color: "#5E5A50", fontSize: 13, cursor: "pointer" }}>
                  Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
