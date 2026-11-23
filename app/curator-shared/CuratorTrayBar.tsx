import type { ReactNode } from "react";

export interface CuratorTraySlot {
  id: string;
  art: ReactNode;
  num: number;
  onClick: () => void;
}

export interface CuratorTrayBarProps {
  eyebrow: string;
  count: number;
  /** Instagram's own real carousel cap (10) for the demo; the real app has no cap yet (Compose isn't built), so it passes null rather than showing an unenforced number as fact. */
  max: number | null;
  slots: CuratorTraySlot[];
  wide: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  onCta?: () => void;
  emptyHint?: string;
  /** "absolute" (demo, anchored within ChallengeCurator's frame) vs "fixed" (real app's normal-flow page) — see CuratorLightbox for the same reasoning. */
  position?: "absolute" | "fixed";
  /** The real app's <main> is maxWidth-capped and centered; without this the bar's *content* would span the full viewport and no longer line up with the grid above it on a wide screen. Applied to an inner wrapper, not the bar itself, so the background/border/shadow still span full width — a centered floating bar with a narrower background would show the page's own background color in the gaps on either side. The demo omits it (its frame already is the full reference box, so there's no gap to create). */
  contentMaxWidth?: number;
}

/**
 * Extracted from the landing demo's TodayScreen.tsx bottom bar block,
 * decoupled from CuratorViewModel. The real app has no Compose stage yet,
 * so its CTA renders disabled ("coming soon") rather than pretending to work.
 */
export function CuratorTrayBar({ eyebrow, count, max, slots, wide, ctaLabel, ctaDisabled, onCta, emptyHint, position = "absolute", contentMaxWidth }: CuratorTrayBarProps) {
  return (
    <div
      style={{
        position,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        background: "rgba(251,250,246,.97)",
        borderTop: "1px solid #E2DDD1",
        boxShadow: "0 -8px 24px rgba(29,28,24,.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "12px 20px",
          width: "100%",
          boxSizing: "border-box",
          ...(contentMaxWidth ? { maxWidth: contentMaxWidth } : {}),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: "none" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5E5A50", fontWeight: 600 }}>{eyebrow}</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
            {count} {max !== null && <span style={{ color: "#6F6A5E" }}>of {max}</span>}
          </span>
        </div>
        {wide && (
          <div style={{ display: "flex", gap: 6, minWidth: 0, overflow: "auto" }}>
            {slots.map((sl) => (
              <button
                key={sl.id}
                type="button"
                onClick={sl.onClick}
                style={{ position: "relative", width: 40, height: 50, flex: "none", borderRadius: 3, overflow: "hidden", cursor: "pointer", border: "none", padding: 0 }}
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
              </button>
            ))}
            {max !== null &&
              Array.from({ length: Math.max(0, max - slots.length) }).map((_, i) => (
                <div key={i} style={{ width: 40, height: 50, flex: "none", borderRadius: 3, border: "1px dashed #CFC9BB" }} />
              ))}
          </div>
        )}
        <div style={{ flex: 1 }} />
        {count === 0 && emptyHint && <span style={{ fontSize: 13, color: "#5E5A50", textAlign: "right" }}>{emptyHint}</span>}
        {count > 0 && (
          <button
            type="button"
            onClick={onCta}
            disabled={ctaDisabled}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              padding: "0 18px",
              borderRadius: 6,
              border: "none",
              background: ctaDisabled ? "#CFC9BB" : "#1D1C18",
              color: ctaDisabled ? "#6F6A5E" : "#F4F1EA",
              fontSize: 14,
              fontWeight: 600,
              cursor: ctaDisabled ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {ctaLabel} {!ctaDisabled && <span>→</span>}
          </button>
        )}
      </div>
    </div>
  );
}
