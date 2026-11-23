import styles from "./curator.module.css";
import type { CuratorViewModel } from "./useChallengeCurator";
import { CuratorLightbox } from "@/app/curator-shared/CuratorLightbox";

/**
 * Now a thin adapter over the shared CuratorLightbox (UX-A visual-parity
 * pass) — same markup/styling/behavior as before: Prev/Next still wrap
 * around circularly (the demo's navDetail already handles that via
 * modulo arithmetic), so they're always enabled here, same as the
 * original. `position="absolute"` (the default) matches the original —
 * required so the embedded landing-page preview stays contained within
 * its own frame rather than covering the full page.
 */
export function DetailOverlay({ v }: { v: CuratorViewModel }) {
  if (!v.hasDetail || !v.dt) return null;
  const dt = v.dt;
  return (
    <div className={styles.fadeInFast} style={{ position: "absolute", inset: 0 }}>
      <CuratorLightbox
        art={dt.art}
        isVideo={dt.isVideo}
        handle={dt.handle}
        posted={dt.posted}
        media={dt.media}
        postUrl={dt.postUrl}
        caption={dt.caption}
        checks={dt.checks.map((c) => ({ label: c.label, state: c.ok ? "ok" : c.review ? "review" : "fail", note: c.hasNote ? c.note : undefined }))}
        onClose={v.closeDetail}
        onPrev={v.detailPrev}
        onNext={v.detailNext}
        hasPrev
        hasNext
        extraSlot={dt.hasFeatured ? <div style={{ fontSize: 12.5, color: "#5E5A50" }}>Featured earlier this challenge: {dt.featured}</div> : undefined}
        actionsSlot={
          <>
            {dt.canSelect && (
              <button
                type="button"
                onClick={dt.onSelect}
                style={{ flex: 1, height: 42, borderRadius: 6, border: "none", background: "#1D1C18", color: "#F4F1EA", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Add to feature · {dt.nextNum}/10
              </button>
            )}
            {dt.isSelected && (
              <button
                type="button"
                onClick={dt.onSelect}
                style={{ flex: 1, height: 42, borderRadius: 6, border: "1px solid #5C6127", background: "#E6E6D0", color: "#3A3D16", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Selected as slide {dt.selNum} · Remove
              </button>
            )}
            {dt.isAside && (
              <button
                type="button"
                onClick={dt.onInclude}
                style={{ flex: 1, height: 42, borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Include anyway
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
