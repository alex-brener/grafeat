import type { ReactNode } from "react";

export interface CuratorChallengeAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant: "primary" | "secondary" | "text";
}

export interface CuratorChallengeCardProps {
  mosaicSlot: ReactNode;
  name: string;
  datesLabel: string;
  handle: string;
  status: "active" | "draft" | "completed";
  note: string;
  /** 0–100, or null to omit the progress bar entirely — the real app has no publish-count concept yet, so this must stay null rather than fabricate a number (see UX-A visual-parity prompt). */
  progress: number | null;
  actions: CuratorChallengeAction[];
}

/**
 * Extracted from the landing demo's ProjectsScreen.tsx per-row JSX,
 * decoupled from CuratorViewModel. Shared by the demo's Challenges screen
 * and the real authenticated challenges list.
 */
export function CuratorChallengeCard({ mosaicSlot, name, datesLabel, handle, status, note, progress, actions }: CuratorChallengeCardProps) {
  return (
    <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center", padding: "20px 0", borderBottom: "1px solid #E2DDD1" }}>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, width: 104, flex: "none" }}>{mosaicSlot}</div>
      <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1.05 }}>{name}</span>
        <span style={{ fontSize: 13, color: "#5E5A50" }}>
          {datesLabel} · @{handle}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12.5 }}>
          {status === "active" && (
            <span style={{ padding: "2px 8px", borderRadius: 999, background: "#E6E6D0", color: "#4A4E1F", fontWeight: 600 }}>Active</span>
          )}
          {status === "draft" && (
            <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #CFC9BB", color: "#3E3B33", fontWeight: 600 }}>Draft</span>
          )}
          {status === "completed" && (
            <span style={{ padding: "2px 8px", borderRadius: 999, background: "#EAE6DC", color: "#5E5A50", fontWeight: 600 }}>Completed</span>
          )}
          <span style={{ color: "#5E5A50" }}>{note}</span>
        </div>
        {progress !== null && (
          <div style={{ height: 3, maxWidth: 280, background: "#E2DDD1", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: "100%", background: "#5C6127" }} />
          </div>
        )}
      </div>
      <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {actions.map((a) =>
          a.variant === "primary" ? (
            <a
              key={a.label}
              href={a.href}
              onClick={a.onClick}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 6,
                border: "none",
                background: "#1D1C18",
                color: "#F4F1EA",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              {a.label}
            </a>
          ) : a.variant === "secondary" ? (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              style={{ height: 36, padding: "0 14px", borderRadius: 6, border: "1px solid #CFC9BB", background: "transparent", color: "#1D1C18", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              {a.label}
            </button>
          ) : (
            <a
              key={a.label}
              href={a.href}
              onClick={a.onClick}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 6,
                background: "none",
                color: "#5E5A50",
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              {a.label}
            </a>
          )
        )}
      </div>
    </div>
  );
}
