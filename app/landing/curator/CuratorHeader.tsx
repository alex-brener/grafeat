import type { CuratorViewModel } from "./useChallengeCurator";
import { CuratorChrome } from "@/app/curator-shared/CuratorChrome";

/**
 * Now a thin adapter over the shared CuratorChrome (UX-A visual-parity
 * pass) — same markup/styling as before, sourced from the shared
 * component the real authenticated app also renders. Demo behavior is
 * unchanged: the day label stays a static, non-interactive span (the demo
 * has no day data to navigate), and the avatar stays the static "co"
 * circle, same as before this refactor.
 */
export function CuratorHeader({ v }: { v: CuratorViewModel }) {
  return (
    <CuratorChrome
      challengeName="Creative October 2026"
      onChallengeNameClick={v.goProjects}
      wide={v.wide}
      dayTrigger={
        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", color: "#1D1C18", fontSize: 13.5, fontWeight: 600 }}>
          <span style={{ fontWeight: 400, color: "#6F6A5E", whiteSpace: "nowrap" }}>Day 16 of 31</span>
          <span style={{ color: "#6F6A5E", fontSize: 11 }}>▾</span>
        </span>
      }
      steps={
        v.showSteps
          ? v.steps.map((s) => ({ n: s.n, label: s.label, state: s.active ? "active" : s.idle ? "idle" : "locked", onClick: s.onClick }))
          : []
      }
      onSettings={v.goSettings}
      avatarSlot={
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
      }
    />
  );
}
