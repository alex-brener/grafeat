import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

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
                  <div key={it.id} style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
                    <div
                      onClick={it.onTap}
                      style={{ position: "relative", aspectRatio: "4/5", borderRadius: 3, overflow: "hidden", cursor: "pointer", background: "#E9E4D8" }}
                    >
                      {it.art}
                      {it.selected && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            boxShadow: "inset 0 0 0 3px #5C6127",
                            borderRadius: 3,
                            background: "rgba(92,97,39,.12)",
                          }}
                        />
                      )}
                      {it.isVideo && (
                        <div
                          style={{
                            position: "absolute",
                            left: 8,
                            top: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 7px",
                            borderRadius: 4,
                            background: "rgba(22,21,18,.72)",
                            color: "#F4F1EA",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ fontSize: 8 }}>▶</span>Reel {it.dur}
                        </div>
                      )}
                      {it.selected && (
                        <div
                          onClick={it.onToggle}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: 8,
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "#5C6127",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {it.selNum}
                        </div>
                      )}
                      {it.unselected && (
                        <div
                          onClick={it.onToggle}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: 8,
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            border: "1.5px solid rgba(255,255,255,.95)",
                            background: "rgba(22,21,18,.22)",
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={it.onOpen}
                        style={{
                          position: "absolute",
                          right: 8,
                          bottom: 8,
                          height: 26,
                          padding: "0 10px",
                          borderRadius: 999,
                          border: "none",
                          background: "rgba(251,250,246,.9)",
                          color: "#1D1C18",
                          cursor: "pointer",
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        View
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                      <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{it.handle}</span>
                      <span style={{ color: "#6F6A5E", flex: "none", fontVariantNumeric: "tabular-nums" }}>{it.time}</span>
                    </div>
                  </div>
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

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "12px 20px",
          background: "rgba(251,250,246,.97)",
          borderTop: "1px solid #E2DDD1",
          boxShadow: "0 -8px 24px rgba(29,28,24,.05)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: "none" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600 }}>
            Today&apos;s feature
          </span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
            {v.selCount} <span style={{ color: "#6F6A5E" }}>of 10</span>
          </span>
        </div>
        {v.wide && (
          <div style={{ display: "flex", gap: 6, minWidth: 0, overflow: "hidden" }}>
            {v.slots.map((sl, i) =>
              sl.filled ? (
                <div
                  key={i}
                  onClick={sl.onClick}
                  style={{ position: "relative", width: 40, height: 50, flex: "none", borderRadius: 3, overflow: "hidden", cursor: "pointer" }}
                >
                  {sl.art}
                  <span
                    style={{
                      position: "absolute",
                      left: 3,
                      bottom: 3,
                      minWidth: 16,
                      height: 16,
                      padding: "0 3px",
                      borderRadius: 8,
                      background: "#5C6127",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {sl.num}
                  </span>
                </div>
              ) : (
                <div key={i} style={{ width: 40, height: 50, flex: "none", borderRadius: 3, border: "1px dashed #CFC9BB" }} />
              )
            )}
          </div>
        )}
        <div style={{ flex: 1 }} />
        {v.noSel && <span style={{ fontSize: 13, color: "#5E5A50", textAlign: "right" }}>Pick up to 10 works for today&apos;s carousel</span>}
        {v.hasSel && (
          <button
            type="button"
            onClick={v.goCompose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              padding: "0 18px",
              borderRadius: 6,
              border: "none",
              background: "#1D1C18",
              color: "#F4F1EA",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Compose feature <span>→</span>
          </button>
        )}
      </div>
    </>
  );
}
