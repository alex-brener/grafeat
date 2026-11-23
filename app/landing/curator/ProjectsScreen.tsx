import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";
import { CuratorChallengeCard } from "@/app/curator-shared/CuratorChallengeCard";

/** Now a thin adapter over the shared CuratorChallengeCard (UX-A visual-parity pass) — same markup/styling, demo behavior unchanged. */
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
            <div key={p.id} style={{ position: "relative" }}>
              {p.fresh && <div className={styles.flashOverlayLong} style={{ position: "absolute", inset: 0, background: "#E3E4C6", pointerEvents: "none", zIndex: 1 }} />}
              <CuratorChallengeCard
                mosaicSlot={
                  <>
                    {p.arts.map((a, i) => (
                      <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 2, overflow: "hidden" }}>
                        {a.art}
                      </div>
                    ))}
                  </>
                }
                name={p.name}
                datesLabel={p.dates}
                handle="creativeoctober"
                status={p.active ? "active" : p.draft ? "draft" : "completed"}
                note={p.note}
                progress={p.active ? 52 : null}
                actions={[
                  ...(p.active ? [{ label: "Open Day 16", onClick: v.goToday, variant: "primary" as const }] : []),
                  { label: "Duplicate", onClick: p.onDuplicate, variant: "secondary" as const },
                  { label: "Settings", onClick: v.goSettings, variant: "text" as const },
                ]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
