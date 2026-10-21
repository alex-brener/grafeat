import type { CuratorViewModel } from "./useChallengeCurator";

export function CuratorHeader({ v }: { v: CuratorViewModel }) {
  return (
    <header
      style={{
        flex: "none",
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 20px",
        borderBottom: "1px solid #E2DDD1",
        background: "#F4F1EA",
      }}
    >
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, letterSpacing: "-0.01em", whiteSpace: "nowrap", fontWeight: 400 }}>
        Grafeat
      </div>
      <span style={{ width: 1, height: 20, background: "#E2DDD1" }} />
      <button
        type="button"
        onClick={v.goProjects}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          padding: "6px 8px",
          marginLeft: -8,
          borderRadius: 6,
          cursor: "pointer",
          color: "#1D1C18",
          fontSize: 13.5,
          fontWeight: 600,
          minWidth: 0,
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Creative October 2026</span>
        {v.wide && <span style={{ fontWeight: 400, color: "#6F6A5E", whiteSpace: "nowrap" }}>Day 16 of 31</span>}
        <span style={{ color: "#6F6A5E", fontSize: 11 }}>▾</span>
      </button>
      <div style={{ flex: 1 }} />
      {v.showSteps && (
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {v.steps.map((s) => (
            <span key={s.n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {s.notFirst && <span style={{ width: 18, height: 1, background: "#CFC9BB" }} />}
              {s.active && (
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
              {s.idle && (
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
              {s.locked && (
                <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", color: "#A39E90", fontSize: 13, fontWeight: 500 }}>
                  <span>{s.n}</span>
                  {s.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={v.goSettings}
        style={{ background: "none", border: "none", color: "#5E5A50", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "6px 8px" }}
      >
        Settings
      </button>
      <div
        title="@creativeoctober"
        style={{
          width: 30,
          height: 30,
          flex: "none",
          borderRadius: "50%",
          background: "#5C6127",
          color: "#F4F1EA",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.02em",
        }}
      >
        co
      </div>
    </header>
  );
}
