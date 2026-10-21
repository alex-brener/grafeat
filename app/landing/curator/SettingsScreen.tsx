import { Fragment, type CSSProperties } from "react";
import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";

const fieldLabel: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 };
const textInput: CSSProperties = { height: 40, border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", padding: "0 12px", fontSize: 14, fontWeight: 400, color: "#1D1C18" };
const sectionRow: CSSProperties = { display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderTop: "1px solid #E2DDD1", flexWrap: "wrap" };

export function SettingsScreen({ v }: { v: CuratorViewModel }) {
  return (
    <div ref={v.setRef} style={{ position: "absolute", inset: 0, overflow: "auto" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 28px 80px", display: "flex", gap: 48, alignItems: "flex-start" }}>
        {v.wide && (
          <nav style={{ position: "sticky", top: 0, width: 180, flex: "none", display: "flex", flexDirection: "column", gap: 2, paddingTop: 86 }}>
            {v.setNav.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={s.onClick}
                style={{ textAlign: "left", padding: "7px 10px", border: "none", background: "none", borderRadius: 6, color: "#3E3B33", fontSize: 13.5, cursor: "pointer" }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600 }}>Creative October 2026</div>
          <h2 style={{ margin: "4px 0 30px", fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 52, lineHeight: 1 }}>Settings</h2>

          <section data-sec="general" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 32px", borderBottom: "1px solid #E2DDD1" }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 28 }}>General</h3>
            <label style={fieldLabel}>
              Challenge name
              <input value={v.f.name} onChange={v.on.name} style={textInput} />
            </label>
            <div style={fieldLabel}>
              Instagram account
              <div style={{ display: "flex", alignItems: "center", gap: 10, height: 40, border: "1px solid #E2DDD1", borderRadius: 6, padding: "0 12px", fontWeight: 400, fontSize: 14, background: "#EEEAE0" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5C6127" }} />
                @creativeoctober
                <span style={{ color: "#5E5A50", fontSize: 12.5 }}>Connected · professional account</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ ...fieldLabel, flex: "1 1 180px" }}>
                Starts
                <input type="date" value={v.f.start} onChange={v.on.start} style={textInput} />
              </label>
              <label style={{ ...fieldLabel, flex: "1 1 180px" }}>
                Ends
                <input type="date" value={v.f.end} onChange={v.on.end} style={textInput} />
              </label>
            </div>
          </section>

          <section data-sec="rules" style={{ display: "flex", flexDirection: "column", gap: 0, padding: "32px 0", borderBottom: "1px solid #E2DDD1" }}>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 28 }}>Submission rules</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#5E5A50" }}>A post counts for a day only if it meets every rule below. Days inherit these rules.</p>
            {v.ruleToggles.map((t) => (
              <div key={t.label} style={sectionRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.label}</div>
                  <div style={{ fontSize: 12.5, color: "#5E5A50" }}>{t.sub}</div>
                </div>
                {t.on ? (
                  <button type="button" onClick={t.onClick} aria-label="Toggle" style={{ width: 40, height: 24, flex: "none", borderRadius: 12, border: "none", background: "#5C6127", position: "relative", cursor: "pointer" }}>
                    <span style={{ position: "absolute", right: 3, top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
                  </button>
                ) : (
                  <button type="button" onClick={t.onClick} aria-label="Toggle" style={{ width: 40, height: 24, flex: "none", borderRadius: 12, border: "none", background: "#CFC9BB", position: "relative", cursor: "pointer" }}>
                    <span style={{ position: "absolute", left: 3, top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
                  </button>
                )}
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 0", borderTop: "1px solid #E2DDD1" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Hashtags</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50", maxWidth: 560 }}>
                  Write the pattern once. The year and day are filled in for every day of the challenge, and again for next year when you duplicate it.
                </div>
              </div>
              <label style={{ ...fieldLabel, fontSize: 12.5, maxWidth: 280 }}>
                Hashtag base
                <input value={v.f.tagName} onChange={v.on.tagName} style={textInput} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
                <label style={{ ...fieldLabel, fontSize: 12.5 }}>
                  Challenge hashtag · every post
                  <input value={v.f.tagChallenge} onChange={v.on.tagChallenge} style={{ ...textInput, height: 38, fontFamily: "ui-monospace,Menlo,monospace" }} />
                  <span style={{ fontWeight: 400, color: "#5C6127", fontSize: 13.5 }}>{v.tagChallengePreview}</span>
                </label>
                <label style={{ ...fieldLabel, fontSize: 12.5 }}>
                  Daily hashtag · one per day
                  <input value={v.f.tagDaily} onChange={v.on.tagDaily} style={{ ...textInput, height: 38, fontFamily: "ui-monospace,Menlo,monospace" }} />
                  <span style={{ fontWeight: 400, color: "#5C6127", fontSize: 13.5 }}>
                    {v.tagDailyFirst} … {v.tagDailyLast}
                  </span>
                </label>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 12, color: "#5E5A50" }}>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#1D1C18" }}>{"{name}"}</span>
                <span>hashtag base</span>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#1D1C18" }}>{"{yyyy}"}</span>
                <span>2026</span>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#1D1C18" }}>{"{yy}"}</span>
                <span>26</span>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#1D1C18" }}>{"{dd}"}</span>
                <span>01–31</span>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#1D1C18" }}>{"{d}"}</span>
                <span>1–31</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Posts missing a required hashtag, or with a misspelled one, are set aside automatically.</div>
            </div>
            <div style={sectionRow}>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Allowed media</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Other formats are set aside</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {v.mediaOpts.map((m) =>
                  m.on ? (
                    <button key={m.label} type="button" onClick={m.onClick} style={{ height: 30, padding: "0 11px", borderRadius: 999, border: "1px solid #5C6127", background: "#E6E6D0", color: "#3A3D16", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                      ✓ {m.label}
                    </button>
                  ) : (
                    <button key={m.label} type="button" onClick={m.onClick} style={{ height: 30, padding: "0 11px", borderRadius: 999, border: "1px solid #CFC9BB", background: "transparent", color: "#5E5A50", fontSize: 12.5, cursor: "pointer" }}>
                      {m.label}
                    </button>
                  )
                )}
              </div>
            </div>
            <div style={sectionRow}>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Submission window</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Each day runs midnight to midnight</div>
              </div>
              <select value={v.f.window} onChange={v.on.window} style={{ height: 34, border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", padding: "0 10px", fontSize: 13 }}>
                <option value="exact">00:00–23:59, Europe/Lisbon</option>
                <option value="grace">00:00–23:59, plus 2h grace</option>
                <option value="rolling">Until the next prompt is posted</option>
              </select>
            </div>
          </section>

          <section data-sec="days" style={{ display: "flex", flexDirection: "column", padding: "32px 0", borderBottom: "1px solid #E2DDD1" }}>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 28 }}>Calendar</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#5E5A50", maxWidth: 600 }}>
              31 days from your start and end dates, each with its own hashtag. Nothing to set up here. If you like, give a day a title and it appears in the app and in {"{title}"} in your caption.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "44px 64px minmax(0,1.3fr) minmax(110px,1fr) 84px", borderTop: "1px solid #E2DDD1", fontSize: 13 }}>
              {["Day", "Date", "Daily hashtag"].map((h) => (
                <span key={h} style={{ padding: "8px 0", color: "#5E5A50", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2DDD1" }}>
                  {h}
                </span>
              ))}
              <span style={{ padding: "8px 0 8px 12px", color: "#5E5A50", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2DDD1" }}>
                Title · optional
              </span>
              <span style={{ padding: "8px 0", color: "#5E5A50", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2DDD1", textAlign: "right" }}>
                Status
              </span>
              {v.promptRows.map((r) => (
                <Fragment key={r.day}>
                  <span style={{ padding: "6px 0", borderBottom: "1px solid #E2DDD1", fontFamily: "var(--font-serif)", fontSize: 20, display: "flex", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
                    {r.day}
                  </span>
                  <span style={{ padding: "6px 0", borderBottom: "1px solid #E2DDD1", color: "#5E5A50", display: "flex", alignItems: "center" }}>
                    {r.date}
                  </span>
                  <span style={{ padding: "6px 8px 6px 0", borderBottom: "1px solid #E2DDD1", color: "#5C6127", display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                    {r.tag}
                  </span>
                  <span style={{ padding: "6px 0 6px 12px", borderBottom: "1px solid #E2DDD1", display: "flex", alignItems: "center" }}>
                    <input
                      value={r.prompt}
                      onChange={r.onChange}
                      placeholder="—"
                      className={styles.promptInput}
                      style={{ width: "100%", height: 32, border: "1px solid transparent", borderRadius: 5, background: "transparent", padding: "0 8px", marginLeft: -8, fontSize: 13.5, color: "#1D1C18", outline: "none" }}
                    />
                  </span>
                  <span style={{ padding: "6px 0", borderBottom: "1px solid #E2DDD1", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 12 }}>
                    {r.isToday && <span style={{ padding: "2px 8px", borderRadius: 999, background: "#1D1C18", color: "#F4F1EA", fontWeight: 600 }}>Today</span>}
                    {r.isPast && <span style={{ color: "#5C6127" }}>Published</span>}
                    {r.isFuture && <span style={{ color: "#6F6A5E" }}>Upcoming</span>}
                  </span>
                </Fragment>
              ))}
            </div>
            <button
              type="button"
              onClick={v.toggleAllPrompts}
              style={{ alignSelf: "flex-start", marginTop: 12, background: "none", border: "none", padding: 0, color: "#5E5A50", fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              {v.allPromptsLabel}
            </button>
          </section>

          <section data-sec="selection" style={{ display: "flex", flexDirection: "column", padding: "32px 0", borderBottom: "1px solid #E2DDD1" }}>
            <h3 style={{ margin: "0 0 14px", fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 28 }}>Selection</h3>
            <div style={sectionRow}>
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Maximum featured per day</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Instagram carousels hold up to 10 slides</div>
              </div>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 28 }}>10</span>
            </div>
            <div style={sectionRow}>
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Follower verification</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50", maxWidth: 460 }}>
                  Manual, finalists only. Each creator is verified once and remembered for this challenge. Unverified finalists show a warning before publishing; they never block it.
                </div>
              </div>
              <span style={{ padding: "5px 10px", border: "1px solid #CFC9BB", borderRadius: 4, fontSize: 13, background: "#FBFAF6" }}>Manual · remembered</span>
            </div>
          </section>

          <section data-sec="publishing" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "32px 0", borderBottom: "1px solid #E2DDD1" }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 28 }}>Publishing</h3>
            <label style={fieldLabel}>
              Caption template
              <textarea
                value={v.f.template}
                onChange={v.on.template}
                rows={10}
                style={{ border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", padding: 12, fontSize: 13.5, fontWeight: 400, lineHeight: 1.5, color: "#1D1C18", resize: "vertical" }}
              />
              <span style={{ fontWeight: 400, fontSize: 12.5, color: "#5E5A50" }}>
                {"{day}"}, {"{title}"}, {"{credits}"} and {"{hashtags}"} fill in automatically. {"{title}"} is left out on days without one. {"{credits}"} always follows slide order.
              </span>
            </label>
            <div style={sectionRow}>
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Reel audio, by default</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Can be changed per Reel in the composer</div>
              </div>
              <div style={{ display: "inline-flex", border: "1px solid #CFC9BB", borderRadius: 6, overflow: "hidden" }}>
                {v.audioOpts.map((m) =>
                  m.on ? (
                    <span key={m.label} style={{ height: 32, padding: "0 12px", display: "flex", alignItems: "center", background: "#1D1C18", color: "#F4F1EA", fontSize: 12.5, fontWeight: 600 }}>
                      {m.label}
                    </span>
                  ) : (
                    <button key={m.label} type="button" onClick={m.onClick} style={{ height: 32, padding: "0 12px", border: "none", background: "transparent", color: "#1D1C18", fontSize: 12.5, cursor: "pointer" }}>
                      {m.label}
                    </button>
                  )
                )}
              </div>
            </div>
            <div style={sectionRow}>
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Default publish time</div>
                <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Used when you choose Schedule</div>
              </div>
              <span style={{ padding: "5px 10px", border: "1px solid #CFC9BB", borderRadius: 4, fontSize: 13, background: "#FBFAF6" }}>18:00, Europe/Lisbon</span>
            </div>
          </section>

          <section data-sec="terms" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "32px 0" }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 28 }}>Participation &amp; rights</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#5E5A50", maxWidth: 560 }}>
              You&apos;re responsible for having permission to republish work. This text is linked from your challenge rules and shown in the publish step.
            </p>
            <textarea
              value={v.f.disclaimer}
              onChange={v.on.disclaimer}
              rows={4}
              style={{ border: "1px solid #CFC9BB", borderRadius: 6, background: "#FBFAF6", padding: 12, fontSize: 13.5, lineHeight: 1.5, color: "#1D1C18", resize: "vertical" }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
