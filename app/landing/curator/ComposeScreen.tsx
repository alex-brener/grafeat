import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

export function ComposeScreen({ v }: { v: CuratorViewModel }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "22px 28px 130px" }}>
          <button type="button" onClick={v.goToday} style={{ background: "none", border: "none", padding: 0, color: "#5E5A50", fontSize: 13, cursor: "pointer" }}>
            ← Back to submissions
          </button>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 14, margin: "8px 0 24px" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 44, lineHeight: 1 }}>Day 16 feature</h2>
            <span style={{ fontSize: 13, color: "#5E5A50" }}>{v.selCount} slides · new carousel on @creativeoctober</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
            {/* preview */}
            <div style={{ flex: "0 1 330px", minWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 4, overflow: "hidden", background: "#E9E4D8" }}>
                {v.pv.art}
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "rgba(22,21,18,.72)",
                    color: "#F4F1EA",
                    fontSize: 11.5,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {v.pv.pos}
                </span>
                {v.pv.isVideo && (
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      padding: "3px 9px",
                      borderRadius: 4,
                      background: "rgba(22,21,18,.72)",
                      color: "#F4F1EA",
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    ▶ Reel {v.pv.dur} · {v.pv.audioLabel}
                  </span>
                )}
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    bottom: 10,
                    padding: "3px 9px",
                    borderRadius: 4,
                    background: "rgba(251,250,246,.9)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  @{v.pv.handle}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <button type="button" onClick={v.pvPrev} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #CFC9BB", background: "transparent", cursor: "pointer", color: "#1D1C18" }}>
                  ‹
                </button>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
                  {v.dots.map((d, i) =>
                    d.on ? (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D1C18" }} />
                    ) : (
                      <span key={i} onClick={d.onClick} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CFC9BB", cursor: "pointer" }} />
                    )
                  )}
                </div>
                <button type="button" onClick={v.pvNext} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #CFC9BB", background: "transparent", cursor: "pointer", color: "#1D1C18" }}>
                  ›
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#6F6A5E" }}>
                Instagram crops every slide of a carousel to the same shape. This feature publishes at 4:5.
              </p>
            </div>

            {/* running order */}
            <div style={{ flex: "1 1 420px", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Running order</h3>
                {v.showDragHint && <span style={{ fontSize: 12.5, color: "#5E5A50" }}>Drag or use the arrows · credits follow the order</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", margin: "8px 0 4px", fontSize: 12.5, color: "#5E5A50" }}>
                <span style={{ fontWeight: 600, color: "#1D1C18" }}>Verification</span>
                <span>{v.verifySummary}</span>
                {v.hasUnchecked && (
                  <span style={{ flexBasis: "100%", color: "#6F6A5E" }}>
                    Open a handle to check their profile. Verified creators are remembered for the rest of the challenge.
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {v.orderItems.map((o) => (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={o.onDragStart}
                    onDragOver={o.onDragOver}
                    onDrop={o.onDrop}
                    onDragEnd={o.onDragEnd}
                    style={{ position: "relative", display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 4px 12px 0", borderBottom: "1px solid #E2DDD1", background: "#F4F1EA" }}
                  >
                    {o.flash && <div className={styles.flashOverlay} style={{ position: "absolute", inset: 0, background: "#E3E4C6", pointerEvents: "none" }} />}
                    {o.isOver && <div style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: "#5C6127" }} />}
                    <span style={{ position: "relative", cursor: "grab", color: "#A39E90", fontSize: 14, paddingTop: 18, userSelect: "none" }}>⋮⋮</span>
                    <span style={{ position: "relative", width: 30, flex: "none", fontFamily: "var(--font-serif)", fontSize: 26, lineHeight: 1, paddingTop: 12, fontVariantNumeric: "tabular-nums" }}>
                      {o.num}
                    </span>
                    <div onClick={o.onPreview} style={{ position: "relative", width: 52, height: 65, flex: "none", borderRadius: 3, overflow: "hidden", cursor: "pointer" }}>
                      {o.art}
                      {o.isPreview && <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 2px #1D1C18" }} />}
                    </div>
                    <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                        <a
                          href={o.profileUrl}
                          target="_blank"
                          rel="noopener"
                          title="Open on Instagram"
                          className={styles.profileLink}
                          style={{ fontWeight: 600, color: "#1D1C18", textDecoration: "none", textUnderlineOffset: "3px" }}
                        >
                          @{o.handle} <span style={{ fontWeight: 400, color: "#6F6A5E" }}>↗</span>
                        </a>
                        <span style={{ fontSize: 12, color: "#6F6A5E" }}>{o.meta}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12.5 }}>
                        {o.vUnchecked && (
                          <>
                            <span style={{ color: "#8A6510" }}>Not verified</span>
                            <button type="button" onClick={o.onVerify} style={{ background: "none", border: "none", padding: 0, color: "#5C6127", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                              Verify
                            </button>
                          </>
                        )}
                        {o.vToday && (
                          <>
                            <span style={{ color: "#5C6127", fontWeight: 600 }}>✓ Verified</span>
                            <button type="button" onClick={o.onUndo} style={{ background: "none", border: "none", padding: 0, color: "#6F6A5E", fontSize: 12, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                              Undo
                            </button>
                          </>
                        )}
                        {o.vPrev && (
                          <>
                            <span style={{ color: "#5C6127", fontWeight: 600 }}>✓ Verified previously</span>
                            <span style={{ color: "#6F6A5E" }}>{o.prevWhen}</span>
                            <button type="button" onClick={o.onReset} style={{ background: "none", border: "none", padding: 0, color: "#6F6A5E", fontSize: 12, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                              Reset
                            </button>
                          </>
                        )}
                      </div>
                      {o.isVideo && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5 }}>
                          <span style={{ color: "#5E5A50" }}>Reel audio</span>
                          <div style={{ display: "inline-flex", border: "1px solid #CFC9BB", borderRadius: 6, overflow: "hidden" }}>
                            {o.audioRemove && <span style={{ height: 26, padding: "0 10px", display: "flex", alignItems: "center", background: "#1D1C18", color: "#F4F1EA", fontWeight: 600 }}>Remove</span>}
                            {o.audioKeep && (
                              <button type="button" onClick={o.setRemove} style={{ height: 26, padding: "0 10px", border: "none", background: "transparent", color: "#1D1C18", fontSize: 12.5, cursor: "pointer" }}>
                                Remove
                              </button>
                            )}
                            {o.audioKeep && <span style={{ height: 26, padding: "0 10px", display: "flex", alignItems: "center", background: "#1D1C18", color: "#F4F1EA", fontWeight: 600 }}>Keep</span>}
                            {o.audioRemove && (
                              <button type="button" onClick={o.setKeep} style={{ height: 26, padding: "0 10px", border: "none", background: "transparent", color: "#1D1C18", fontSize: 12.5, cursor: "pointer" }}>
                                Keep
                              </button>
                            )}
                          </div>
                          <span style={{ color: "#6F6A5E" }}>{o.audioNote}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ position: "relative", display: "flex", gap: 2, flex: "none" }}>
                      <button type="button" onClick={o.onUp} aria-label="Move up" style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: "#5E5A50", fontSize: 13 }}>
                        ↑
                      </button>
                      <button type="button" onClick={o.onDown} aria-label="Move down" style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: "#5E5A50", fontSize: 13 }}>
                        ↓
                      </button>
                      <button type="button" onClick={o.onRemove} aria-label="Remove" style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: "#5E5A50", fontSize: 15 }}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {v.hasOpenSlots && (
                <button
                  type="button"
                  onClick={v.goToday}
                  style={{ marginTop: 12, height: 36, padding: "0 14px", borderRadius: 6, border: "1px dashed #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  + Add from submissions · {v.openSlots} open
                </button>
              )}
            </div>

            {/* caption */}
            <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Caption</h3>
                <button type="button" onClick={v.togglePlain} style={{ background: "none", border: "none", padding: 0, color: "#5E5A50", fontSize: 12.5, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  {v.plainToggleLabel}
                </button>
              </div>
              {v.templateMode && (
                <div style={{ border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", overflow: "hidden" }}>
                  <textarea
                    value={v.opening}
                    onChange={v.onOpening}
                    rows={5}
                    style={{ display: "block", width: "100%", border: "none", background: "transparent", padding: "12px 14px 6px", fontSize: 14, lineHeight: 1.5, color: "#1D1C18", resize: "vertical", outline: "none" }}
                  />
                  <div style={{ margin: "0 8px", padding: "8px 10px 10px", borderRadius: 4, background: "#EEEAE0" }}>
                    <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600, marginBottom: 4 }}>
                      Credits · follow slide order
                    </div>
                    {v.credits.map((c) => (
                      <div key={c.id} style={{ position: "relative", padding: "1px 4px", margin: "0 -4px", borderRadius: 3, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                        {c.flash && <span className={styles.flashOverlay} style={{ position: "absolute", inset: 0, borderRadius: 3, background: "#D9DBB4" }} />}
                        <span style={{ position: "relative" }}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={v.closing}
                    onChange={v.onClosing}
                    rows={2}
                    style={{ display: "block", width: "100%", border: "none", background: "transparent", padding: "10px 14px 4px", fontSize: 14, lineHeight: 1.5, color: "#1D1C18", resize: "vertical", outline: "none" }}
                  />
                  <input
                    value={v.hashtags}
                    onChange={v.onHashtags}
                    style={{ display: "block", width: "100%", border: "none", borderTop: "1px solid #E2DDD1", background: "transparent", padding: "10px 14px", fontSize: 14, color: "#5C6127", outline: "none" }}
                  />
                </div>
              )}
              {v.plain && (
                <>
                  <textarea
                    value={v.plainText}
                    onChange={v.onPlain}
                    rows={16}
                    style={{ display: "block", width: "100%", border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", padding: "12px 14px", fontSize: 14, lineHeight: 1.5, color: "#1D1C18", resize: "vertical", outline: "none" }}
                  />
                  <div style={{ fontSize: 12.5, color: "#8A6510" }}>Credits are plain text now and won&apos;t follow slide order. Switch back to the template to re-link them.</div>
                </>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5 }}>
                {v.capChecks.map((k) => (
                  <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {k.ok && <span style={{ color: "#5C6127", fontWeight: 700, width: 12 }}>✓</span>}
                    {k.bad && <span style={{ color: "#A4502B", fontWeight: 700, width: 12 }}>!</span>}
                    <span style={{ color: "#3E3B33" }}>{k.label}</span>
                    {k.hasFix && (
                      <button type="button" onClick={k.onFix} style={{ background: "none", border: "none", padding: 0, color: "#A4502B", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                        {k.fixLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "12px 20px", background: "rgba(251,250,246,.97)", borderTop: "1px solid #E2DDD1" }}>
        <span style={{ fontSize: 13, color: "#3E3B33", flex: 1, minWidth: 200 }}>{v.composeSummary}</span>
        <button
          type="button"
          onClick={v.goPublish}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Preview &amp; publish <span>→</span>
        </button>
      </div>
    </>
  );
}
