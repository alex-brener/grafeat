import type { CuratorViewModel } from "./useChallengeCurator";

export function PublishScreen({ v }: { v: CuratorViewModel }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 28px 60px" }}>
        <button type="button" onClick={v.goCompose} style={{ background: "none", border: "none", padding: 0, color: "#5E5A50", fontSize: 13, cursor: "pointer" }}>
          ← Back to composer
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "flex-start", justifyContent: "center", marginTop: 18 }}>
          <div style={{ flex: "0 1 380px", minWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600 }}>
              Approximate Instagram preview
            </span>
            <div style={{ background: "#fff", border: "1px solid #E2DDD1", borderRadius: 10, overflow: "hidden", boxShadow: "0 18px 40px rgba(29,28,24,.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#5C6127", color: "#F4F1EA", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  co
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>creativeoctober</span>
                <span style={{ color: "#6F6A5E", letterSpacing: "1px" }}>···</span>
              </div>
              <div style={{ position: "relative", aspectRatio: "4/5", background: "#E9E4D8" }}>
                {v.pv.art}
                <span style={{ position: "absolute", right: 10, top: 10, padding: "3px 9px", borderRadius: 999, background: "rgba(22,21,18,.7)", color: "#fff", fontSize: 11.5, fontWeight: 600 }}>
                  {v.pv.pos}
                </span>
                {v.pv.isVideo && (
                  <span style={{ position: "absolute", left: 10, bottom: 10, padding: "3px 9px", borderRadius: 999, background: "rgba(22,21,18,.7)", color: "#fff", fontSize: 11.5, fontWeight: 600 }}>
                    {v.pv.audioLabel}
                  </span>
                )}
                <button type="button" onClick={v.pvPrev} style={{ position: "absolute", left: 8, top: "50%", marginTop: -14, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.85)", cursor: "pointer", color: "#1D1C18" }}>
                  ‹
                </button>
                <button type="button" onClick={v.pvNext} style={{ position: "absolute", right: 8, top: "50%", marginTop: -14, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.85)", cursor: "pointer", color: "#1D1C18" }}>
                  ›
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "10px 0 4px" }}>
                {v.dots.map((d, i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: d.on ? "#3B82C4" : "#D5D1C6" }} />
                ))}
              </div>
              <div style={{ padding: "6px 14px 16px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#1D1C18" }}>
                <strong style={{ fontWeight: 600 }}>creativeoctober</strong> {v.igCaption}
                {v.igCollapsed && (
                  <button type="button" onClick={v.toggleIg} style={{ background: "none", border: "none", padding: 0, color: "#6F6A5E", fontSize: 13, cursor: "pointer" }}>
                    … more
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: "1 1 380px", minWidth: 280, maxWidth: 460, display: "flex", flexDirection: "column", gap: 22 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 44, lineHeight: 1 }}>Ready to publish Day 16</h2>
            <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #E2DDD1" }}>
              {v.pubChecks.map((k) => (
                <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #E2DDD1", fontSize: 13.5 }}>
                  {k.ok && (
                    <span style={{ width: 18, height: 18, flex: "none", borderRadius: "50%", background: "#5C6127", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      ✓
                    </span>
                  )}
                  {k.bad && (
                    <span style={{ width: 18, height: 18, flex: "none", borderRadius: "50%", border: "1.5px solid #8A6510", color: "#8A6510", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      !
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{k.label}</span>
                  {k.bad && (
                    <button type="button" onClick={v.goCompose} style={{ background: "none", border: "none", padding: 0, color: "#8A6510", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                      Review
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {v.pubModes.map((m) => (
                <div
                  key={m.label}
                  onClick={m.onClick}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 6, border: "1px solid #CFC9BB", cursor: "pointer", background: "#FBFAF6" }}
                >
                  {m.on && <span style={{ width: 16, height: 16, flex: "none", borderRadius: "50%", border: "5px solid #1D1C18" }} />}
                  {m.off && <span style={{ width: 16, height: 16, flex: "none", borderRadius: "50%", border: "1.5px solid #A39E90" }} />}
                  <span style={{ flex: 1, fontWeight: 500 }}>{m.label}</span>
                  {m.hasTime && (
                    <select
                      value={v.pubTime}
                      onChange={v.onPubTime}
                      onClick={v.stop}
                      style={{ height: 30, border: "1px solid #CFC9BB", borderRadius: 6, background: "#fff", padding: "0 8px", fontSize: 13 }}
                    >
                      <option value="18:00">Today, 18:00</option>
                      <option value="19:30">Today, 19:30</option>
                      <option value="21:00">Today, 21:00</option>
                      <option value="09:00">Tomorrow, 09:00</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
            {v.notPublishing && (
              <>
                {v.hasUnverified && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", borderRadius: 8, background: "#F3EAD6", border: "1px solid #E6D6AE" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span style={{ color: "#8A6510", fontWeight: 700 }}>⚠</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{v.unverifiedTitle}</span>
                        <span style={{ fontSize: 12.5, color: "#5E5A50", wordBreak: "break-word" }}>{v.unverifiedNames}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={v.goCompose} style={{ height: 44, padding: "0 16px", borderRadius: 6, border: "1px solid #CFC9BB", background: "#FBFAF6", color: "#1D1C18", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        Review
                      </button>
                      <button type="button" onClick={v.publish} style={{ flex: 1, height: 44, borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        {v.publishAnywayLabel}
                      </button>
                    </div>
                  </div>
                )}
                {v.allClear && (
                  <button type="button" onClick={v.publish} style={{ height: 48, borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    {v.publishLabel}
                  </button>
                )}
                {v.blocked && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button type="button" disabled style={{ height: 48, borderRadius: 6, border: "none", background: "#D8D3C6", color: "#6F6A5E", fontSize: 15, fontWeight: 600, cursor: "not-allowed" }}>
                      {v.publishLabel}
                    </button>
                    <span style={{ fontSize: 12.5, color: "#5E5A50" }}>{v.blockedNote}</span>
                  </div>
                )}
              </>
            )}
            {v.publishing && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 6, background: "#EEEAE0" }}>
                {v.pubSteps.map((p) => (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                    {p.done && (
                      <>
                        <span style={{ color: "#5C6127", fontWeight: 700, width: 14 }}>✓</span>
                        <span>{p.label}</span>
                      </>
                    )}
                    {p.active && (
                      <>
                        <span style={{ width: 14, color: "#1D1C18" }}>…</span>
                        <span style={{ fontWeight: 600 }}>{p.label}</span>
                      </>
                    )}
                    {p.todo && (
                      <>
                        <span style={{ width: 14 }} />
                        <span style={{ color: "#8A8577" }}>{p.label}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p style={{ margin: 0, fontSize: 12, color: "#6F6A5E" }}>
              Shared under your Creative October participation terms. Demo only: nothing is posted to Instagram.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
