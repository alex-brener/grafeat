import type { ReactNode } from "react";
import { CuratorStepper, type CuratorStep } from "./CuratorStepper";

export interface CuratorChromeProps {
  challengeName: string;
  /** Demo: navigates to the Projects/Challenges screen. Real app: opens the challenge switcher. Omit for a non-interactive label. */
  onChallengeNameClick?: () => void;
  /**
   * The "Day N of M ▾" affordance, rendered by the caller — split out from
   * the challenge-name button (the demo's CuratorHeader.tsx combines both
   * into one non-functional button; UX-A's day-navigation requirement
   * needs this to be its own, independently interactive control). The
   * demo passes a static label; the real app passes the day-picker
   * trigger.
   */
  dayTrigger?: ReactNode;
  wide: boolean;
  /** Omit (or pass []) to hide the stepper entirely — matches the demo's `showSteps` condition. */
  steps?: CuratorStep[];
  /** Omit to hide the Settings link — the real app's Challenges list has no single challenge in context, unlike the demo (which always has exactly one open). */
  onSettings?: () => void;
  /** Demo: a static decorative circle. Real app: AvatarMenu (dropdown with sign-out). */
  avatarSlot: ReactNode;
}

/**
 * Extracted from the landing demo's CuratorHeader.tsx, decoupled from
 * CuratorViewModel so both the demo and the real authenticated app render
 * identical header markup/styling from their own data — the "one
 * presentation layer, real-data adapters" pattern for UX-A visual parity.
 */
export function CuratorChrome({ challengeName, onChallengeNameClick, dayTrigger, wide, steps, onSettings, avatarSlot }: CuratorChromeProps) {
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
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, letterSpacing: "-0.01em", whiteSpace: "nowrap", fontWeight: 400 }}>Grafeat</div>
      <span style={{ width: 1, height: 20, background: "#E2DDD1" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 0 }}>
        <button
          type="button"
          onClick={onChallengeNameClick}
          disabled={!onChallengeNameClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            padding: "6px 8px",
            marginLeft: -8,
            borderRadius: 6,
            cursor: onChallengeNameClick ? "pointer" : "default",
            color: "#1D1C18",
            fontSize: 13.5,
            fontWeight: 600,
            minWidth: 0,
          }}
        >
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{challengeName}</span>
        </button>
        {wide && dayTrigger}
      </div>
      <div style={{ flex: 1 }} />
      {steps && steps.length > 0 && <CuratorStepper steps={steps} />}
      <div style={{ flex: 1 }} />
      {onSettings && (
        <button
          type="button"
          onClick={onSettings}
          style={{ background: "none", border: "none", color: "#5E5A50", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "6px 8px" }}
        >
          Settings
        </button>
      )}
      {avatarSlot}
    </header>
  );
}
