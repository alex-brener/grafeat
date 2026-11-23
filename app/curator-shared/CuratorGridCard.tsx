import type { ReactNode } from "react";

export interface CuratorGridCardProps {
  art: ReactNode;
  /** Omit entirely for a read-only card (e.g. an automatic Set-aside exclusion) — no badge, no tap-to-select. */
  onToggle?: () => void;
  selected?: boolean;
  selNum?: number;
  isVideo?: boolean;
  dur?: string;
  onView: () => void;
  handle: string;
  time: string;
  disabled?: boolean;
  /** Small secondary action row below the meta line — the demo's Ready grid has no equivalent (no manual-reject concept); real UX-A needs Reject/Undo here, so it's an explicit optional slot rather than an invented demo element. */
  footerSlot?: ReactNode;
}

/**
 * Extracted from the landing demo's TodayScreen.tsx per-card JSX (the
 * `v.gridItems.map(...)` block), parameterized with plain props instead of
 * reading from the demo's `it` view-model row — reused by both the demo's
 * Ready/Set-aside grids and the real authenticated CurationWorkspace.
 */
export function CuratorGridCard({ art, onToggle, selected, selNum, isVideo, dur, onView, handle, time, disabled, footerSlot }: CuratorGridCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
      <div
        onClick={onToggle}
        role={onToggle ? "button" : undefined}
        tabIndex={onToggle ? 0 : undefined}
        onKeyDown={
          onToggle
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        aria-label={onToggle ? (selected ? "Remove from feature" : "Add to feature") : undefined}
        style={{
          position: "relative",
          aspectRatio: "4/5",
          borderRadius: 3,
          overflow: "hidden",
          cursor: onToggle ? "pointer" : "default",
          background: "#E9E4D8",
        }}
      >
        {art}
        {selected && (
          <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 3px #5C6127", borderRadius: 3, background: "rgba(92,97,39,.12)" }} />
        )}
        {isVideo && (
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
            <span style={{ fontSize: 8 }}>▶</span>Reel {dur}
          </div>
        )}
        {onToggle && selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            disabled={disabled}
            aria-label="Remove from feature"
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "#5C6127",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontVariantNumeric: "tabular-nums",
              cursor: "pointer",
            }}
          >
            {selNum}
          </button>
        )}
        {onToggle && !selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            disabled={disabled}
            aria-label="Add to feature"
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,.95)",
              background: "rgba(22,21,18,.22)",
              cursor: "pointer",
            }}
          />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
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
        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{handle}</span>
        <span style={{ color: "#6F6A5E", flex: "none", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      {footerSlot}
    </div>
  );
}
