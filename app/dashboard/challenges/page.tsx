import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listChallenges } from "@/lib/challenge";
import { getChallengeSyncStats } from "@/lib/sync-stats";
import { deriveChallengeStatus } from "@/lib/timezone";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { CuratorPageShell } from "../CuratorPageShell";
import { CuratorChallengeCard } from "@/app/curator-shared/CuratorChallengeCard";
import dashboardStyles from "../Dashboard.module.css";
import styles from "./Challenges.module.css";

/** No single challenge is "open" while browsing this list (unlike the demo, which always has exactly one) — the header shows no day picker/stepper/Settings link here. */
export default async function ChallengesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) {
    redirect("/login");
  }

  const workspace = await ensureActiveWorkspace(headersList);
  const db = getDb();
  const challenges = workspace ? await listChallenges(db, workspace.id) : [];
  // One query per challenge — fine at pilot scale (a handful of challenges
  // per workspace); revisit only if a real workspace ever has enough
  // challenges for this to matter (same judgment call as elsewhere in this
  // codebase: lib/sync-stats.ts's own per-challenge read).
  const statsByChallenge = await Promise.all(challenges.map((c) => getChallengeSyncStats(db, c.id)));

  return (
    <CuratorPageShell email={session.user.email} challengeContext={null} maxWidth={1080}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
        <h1 className={styles.heading} style={{ margin: 0 }}>
          Challenges
        </h1>
        <a href="/dashboard/challenges/new" className={dashboardStyles.primaryCta}>
          New challenge
        </a>
      </div>
      <p className={styles.sub}>{workspace?.name ?? "Your workspace"}</p>

      {challenges.length > 0 ? (
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {challenges.map((c, i) => {
            const displayStatus = deriveChallengeStatus(c.status, c.endDate, c.timezone);
            const s = statsByChallenge[i];
            // Honest placeholder, not fabricated artwork — Grafeat has no
            // "representative submission picks" concept for a challenge
            // card yet (UX-A visual-parity decision: don't invent thumbnails).
            const mosaicSlot = (
              <>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} style={{ position: "relative", aspectRatio: "1", borderRadius: 2, background: "var(--color-border)" }} />
                ))}
              </>
            );
            const note = `${s.discovered} discovered · ${s.eligible} eligible${s.lastSyncRun ? ` · last sync ${s.lastSyncRun.status}` : " · never synced"}`;
            return (
              <CuratorChallengeCard
                key={c.id}
                mosaicSlot={mosaicSlot}
                name={c.name}
                datesLabel={`${c.startDate} – ${c.endDate}`}
                handle={c.requiredMention}
                status={displayStatus === "active" ? "active" : displayStatus === "ended" ? "completed" : "draft"}
                note={note}
                progress={null}
                actions={[
                  { label: displayStatus === "active" ? "Open" : "View", href: `/dashboard/challenges/${c.id}`, variant: "primary" },
                  { label: "Settings", href: `/dashboard/challenges/${c.id}/settings`, variant: "text" },
                ]}
              />
            );
          })}
        </div>
      ) : (
        <div className={dashboardStyles.emptyState}>
          <h3 className={dashboardStyles.emptyStateHeading}>No challenges yet</h3>
          <p className={dashboardStyles.emptyStateBody}>
            Set up your first challenge and Grafeat will start discovering and verifying submissions automatically.
          </p>
          <a href="/dashboard/challenges/new" className={dashboardStyles.primaryCta}>
            New challenge
          </a>
        </div>
      )}
    </CuratorPageShell>
  );
}
