import type { ReactNode } from "react";

export interface CuratorCheck {
  label: string;
  state: "ok" | "fail" | "review";
  note?: string;
}

export interface CuratorLightboxProps {
  art: ReactNode;
  isVideo?: boolean;
  handle: string;
  posted: string;
  media: string;
  postUrl: string | null;
  caption: string | null;
  checks: CuratorCheck[];
  /** Rendered between the checklist and actionsSlot — e.g. the demo's "Featured earlier this challenge" note. Omit if not applicable. */
  extraSlot?: ReactNode;
  /** Select/Reject/Undo buttons — their exact set differs by context (Ready vs. Set-aside vs. read-only), so the caller supplies them rather than this component guessing. */
  actionsSlot: ReactNode;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  /**
   * "absolute" (default) matches the demo's original DetailOverlay.tsx —
   * it anchors to ChallengeCurator's own `position: relative` frame, which
   * is what correctly constrains it to the embedded landing-page preview
   * (not full-screen) rather than covering the whole page. The real app's
   * CurationWorkspace is normal scrolling page flow, not a contained
   * frame, so it passes "fixed" to cover the viewport instead. Getting
   * this wrong in the demo's direction would be a real regression — the
   * embedded preview's lightbox would escape its frame.
   */
  position?: "absolute" | "fixed";
}

/**
 * Extracted from the landing demo's DetailOverlay.tsx, decoupled from
 * CuratorViewModel. Shared by the demo and the real authenticated
 * lightbox — same overlay, image area, checklist and nav controls;
 * `checks`/`actionsSlot` carry the real (not fabricated)
 * mentionResult/dateEligible data and the context-appropriate actions.
 */
export function CuratorLightbox({ art, isVideo, handle, posted, media, postUrl, caption, checks, extraSlot, actionsSlot, onClose, onPrev, onNext, hasPrev, hasNext, position = "absolute" }: CuratorLightboxProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position, inset: 0, zIndex: 200, background: "rgba(22,21,18,.94)", display: "flex", flexWrap: "wrap", overflow: "auto" }}
    >
      <div style={{ flex: "1 1 420px", minHeight: 420, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 64px" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            left: 18,
            top: 14,
            height: 34,
            padding: "0 12px",
            borderRadius: 6,
            border: "1px solid rgba(244,241,234,.25)",
            background: "transparent",
            color: "#F4F1EA",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            marginTop: -20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(244,241,234,.25)",
            background: "transparent",
            color: "#F4F1EA",
            fontSize: 18,
            cursor: hasPrev ? "pointer" : "not-allowed",
            opacity: hasPrev ? 1 : 0.3,
          }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next"
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            marginTop: -20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(244,241,234,.25)",
            background: "transparent",
            color: "#F4F1EA",
            fontSize: 18,
            cursor: hasNext ? "pointer" : "not-allowed",
            opacity: hasNext ? 1 : 0.3,
          }}
        >
          ›
        </button>
        <div style={{ position: "relative", width: "min(100%,520px)", aspectRatio: "4/5", borderRadius: 3, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,.4)" }}>
          {art}
          {isVideo && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(22,21,18,.6)",
                  color: "#fff",
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingLeft: 4,
                }}
              >
                ▶
              </span>
            </div>
          )}
        </div>
      </div>
      <aside style={{ flex: "0 1 380px", minWidth: 300, background: "#F4F1EA", padding: "26px 26px 30px", display: "flex", flexDirection: "column", gap: 18, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1.05, wordBreak: "break-word" }}>@{handle}</span>
          <span style={{ fontSize: 12.5, color: "#5E5A50" }}>
            {posted} · {media}
          </span>
          {postUrl && (
            <a href={postUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 500 }}>
              Open post on Instagram ↗
            </a>
          )}
        </div>
        {caption && <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", color: "#3E3B33" }}>{caption}</div>}
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #E2DDD1" }}>
          {checks.map((c) => (
            <div key={c.label} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #E2DDD1", fontSize: 13 }}>
              {c.state === "ok" && <span style={{ color: "#5C6127", fontWeight: 700, width: 14, flex: "none" }}>✓</span>}
              {c.state === "fail" && <span style={{ color: "#A4502B", fontWeight: 700, width: 14, flex: "none" }}>✕</span>}
              {c.state === "review" && <span style={{ color: "#8A6510", fontWeight: 700, width: 14, flex: "none" }}>?</span>}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{c.label}</span>
                {c.note && <span style={{ fontSize: 12.5, color: "#5E5A50" }}>{c.note}</span>}
              </div>
            </div>
          ))}
        </div>
        {extraSlot}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>{actionsSlot}</div>
      </aside>
    </div>
  );
}
