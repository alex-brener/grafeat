"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CuratorChrome } from "@/app/curator-shared/CuratorChrome";
import type { CuratorStep } from "@/app/curator-shared/CuratorStepper";
import { useWideBreakpoint } from "@/app/curator-shared/useWideBreakpoint";
import { AvatarMenu } from "./AvatarMenu";

export interface CuratorPageShellProps {
  email: string;
  /** Null on the Challenges list itself — no single challenge is in context there, unlike the demo (which always has exactly one open challenge). */
  challengeContext: { id: string; name: string } | null;
  dayTrigger?: ReactNode;
  activeStep?: "curate" | "compose" | "publish";
  maxWidth: number;
  children: ReactNode;
}

/**
 * Replaces DashboardShell (generic logo+email+sign-out header, 880px-capped
 * content) for the three UX-A surfaces that need visual parity with the
 * full-screen demo: the Challenges list, a challenge's Curate workspace,
 * and its Settings page. DashboardShell's own 880px max-width is also too
 * narrow for the demo's gallery (1440px) and challenge-list (1080px)
 * layouts, so this shell lets each page set its own `maxWidth` instead.
 * `/dashboard` (home) and `/dashboard/challenges/new` are out of this
 * prompt's scope and keep using DashboardShell unchanged.
 */
export function CuratorPageShell({ email, challengeContext, dayTrigger, activeStep, maxWidth, children }: CuratorPageShellProps) {
  const router = useRouter();
  const wide = useWideBreakpoint();

  const steps: CuratorStep[] =
    challengeContext && activeStep
      ? [
          {
            n: 1,
            label: "Curate",
            state: activeStep === "curate" ? "active" : "idle",
            onClick: () => router.push(`/dashboard/challenges/${challengeContext.id}`),
          },
          // Compose/Publish are genuinely disabled — not implemented yet (UX-A is explicitly Curate-only). Never a dead link.
          { n: 2, label: "Compose", state: "locked" },
          { n: 3, label: "Publish", state: "locked" },
        ]
      : [];

  return (
    <div style={{ minHeight: "100vh", background: "#F4F1EA", color: "#1D1C18", display: "flex", flexDirection: "column" }}>
      <CuratorChrome
        challengeName={challengeContext?.name ?? "Challenges"}
        onChallengeNameClick={() => router.push("/dashboard/challenges")}
        dayTrigger={dayTrigger}
        wide={wide}
        steps={steps}
        onSettings={challengeContext ? () => router.push(`/dashboard/challenges/${challengeContext.id}/settings`) : undefined}
        avatarSlot={<AvatarMenu email={email} />}
      />
      <main style={{ flex: 1, width: "100%", maxWidth, margin: "0 auto", padding: "28px 28px 80px", boxSizing: "border-box" }}>{children}</main>
    </div>
  );
}
