import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";
import { CuratorGridCard } from "@/app/curator-shared/CuratorGridCard";
import { CuratorTrayBar } from "@/app/curator-shared/CuratorTrayBar";

export function TodayScreen({ v }: { v: CuratorViewModel }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 28px 150px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600 }}>
                Friday, October 16 · Day 16 of 31
              </div>
              <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 76, lineHeight: 0.92, letterSpacing: "-0.02em" }}>
                Day 16
              </h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", maxWidth: 520 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#5E5A50" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C6127", boxShadow: "0 0 0 3px #E6E6D0" }} />
                Last collected 16:38 · checks every 15 minutes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <span style={{ color: "#5E5A50" }}>Counted for today when a post has</span>
                <span style={{ padding: "2px 7px", border: "1px solid #CFC9BB", borderRadius: 4 }}>@creativeoctober</span>
                <span style={{ padding: "2px 7px", border: "1px solid #CFC9BB", borderRadius: 4 }}>#creativeoctober2026</span>
                <span style={{ padding: "2px 7px", border: "1px solid #CFC9BB", borderRadius: 4 }}>#creativeoctober2026_day16</span>
                <span style={{ color: "#5E5A50" }}>and was posted</span>
                <span style={{ padding: "2px 7px", border: "1px solid #CFC9BB", borderRadius: 4 }}>Oct 16, 00:00–23:59</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "8px 24px",
              marginTop: 28,
              borderBottom: "1px solid #E2DDD1",
            }}
          >
            <div role="tablist" style={{ display: "flex", gap: 4 }}>
              {v.tabs.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  role="tab"
                  aria-selected={t.on}
                  onClick={t.onClick}
                  className={t.off ? styles.tabOff : undefined}
                  style={
                    t.on
                      ? {
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          padding: "10px 16px 11px",
                          marginBottom: -1,
                          border: "none",
                          borderBottom: "2px solid #1D1C18",
                          borderRadius: "6px 6px 0 0",
                          background: "#EEEAE0",
                          cursor: "pointer",
                          color: "#1D1C18",
                          fontSize: 14.5,
                          fontWeight: 600,
                        }
                      : {
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          padding: "10px 16px 11px",
                          marginBottom: -1,
                          border: "none",
                          borderBottom: "2px solid transparent",
                          borderRadius: "6px 6px 0 0",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#6F6A5E",
                          fontSize: 14.5,
                          fontWeight: 500,
                        }
                  }
                >
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400, lineHeight: 1 }}>{t.count}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <span style={{ paddingBottom: 13, fontSize: 12.5, color: "#6F6A5E" }}>184 collected today</span>
          </div>

          {v.inReady && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "18px 0 18px", fontSize: 13, color: "#5E5A50" }}>
                <span>Everything here meets the Day 16 rules.</span>
                {v.showTapHint && <strong style={{ color: "#1D1C18", fontWeight: 600 }}>{v.tapHint}</strong>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(168px,1fr))", gap: "22px 16px" }}>
                {v.gridItems.map((it) => (
                  <CuratorGridCard
                    key={it.id}
                    art={it.art}
                    onToggle={it.onTap}
                    selected={it.selected}
                    selNum={it.selNum}
                    isVideo={it.isVideo}
                    dur={it.dur}
                    onView={it.onOpen}
                    handle={it.handle}
                    time={it.time}
                  />
                ))}
              </div>
            </>
          )}

          {v.inAside && (
            <>
              <p style={{ margin: "18px 0 6px", fontSize: 13, color: "#5E5A50", maxWidth: 680 }}>
                These don&apos;t meet the Day 16 rules, so they were set aside automatically. There&apos;s nothing to review here. Nothing is
                deleted, and if you&apos;re looking for a specific post you can still include it.
              </p>
              {v.asideGroups.map((g) => (
                <div key={g.title} style={{ marginTop: 26 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 26 }}>{g.title}</h3>
                    <span style={{ fontSize: 13, color: "#5E5A50" }}>
                      {g.count} · {g.sub}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "20px 14px" }}>
                    {g.items.map((a) => (
                      <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <div
                          onClick={a.onOpen}
                          style={{ position: "relative", aspectRatio: "4/5", borderRadius: 3, overflow: "hidden", cursor: "pointer", opacity: 0.8 }}
                        >
                          {a.art}
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          @{a.handle}
                        </div>
                        <div style={{ fontSize: 12, color: "#A4502B", lineHeight: 1.35 }}>{a.reason}</div>
                        <button
                          type="button"
                          onClick={a.onInclude}
                          style={{
                            alignSelf: "flex-start",
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 6,
                            border: "1px solid #CFC9BB",
                            background: "transparent",
                            color: "#1D1C18",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Include anyway
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <CuratorTrayBar
        eyebrow="Today's feature"
        count={v.selCount}
        max={10}
        wide={v.wide}
        slots={v.slots.filter((sl) => sl.filled).map((sl, i) => ({ id: String(i), art: sl.art, num: sl.num!, onClick: sl.onClick! }))}
        ctaLabel="Compose feature"
        ctaDisabled={false}
        onCta={v.goCompose}
        emptyHint="Pick up to 10 works for today's carousel"
      />
    </>
  );
}
