/**
 * Extracted verbatim (structure + inline styles) from the landing demo's
 * CuratorHeader.tsx stepper block (app/landing/curator/CuratorHeader.tsx),
 * decoupled from the demo's CuratorViewModel so both the demo and the real
 * authenticated app can render it from their own data. UX-A visual-parity
 * pass (prompts/grafeat-ux-a-visual-parity-and-day-navigation-claude.md).
 */
export interface CuratorStep {
  n: number;
  label: string;
  state: "active" | "idle" | "locked";
  onClick?: () => void;
}

export function CuratorStepper({ steps }: { steps: CuratorStep[] }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {steps.map((s, i) => (
        <span key={s.n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <span style={{ width: 18, height: 1, background: "#CFC9BB" }} />}
          {s.state === "active" && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 10px",
                borderRadius: 999,
                background: "#1D1C18",
                color: "#F4F1EA",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.7 }}>{s.n}</span>
              {s.label}
            </span>
          )}
          {s.state === "idle" && (
            <button
              type="button"
              onClick={s.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 10px",
                borderRadius: 999,
                background: "none",
                border: "none",
                color: "#5E5A50",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
              {s.label}
            </button>
          )}
          {s.state === "locked" && (
            <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", color: "#A39E90", fontSize: 13, fontWeight: 500 }}>
              <span>{s.n}</span>
              {s.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
