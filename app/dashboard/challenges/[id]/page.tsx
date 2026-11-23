import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getChallenge } from "@/lib/challenge";
import { getChallengeSyncStats } from "@/lib/sync-stats";
import {
  getGallerySubmissions,
  getDiagnosticSummary,
  getSelectedSubmissions,
  getDayStats,
  getNotYetSampledCount,
  listChallengeDays,
  pickDefaultDay,
  EMPTY_DIAGNOSTIC_COUNTS,
} from "@/lib/submission-gallery";
import { deriveChallengeStatus } from "@/lib/timezone";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { SyncButton } from "../SyncButton";
import { CurationWorkspace, type DayStats } from "../CurationWorkspace";
import dashboardStyles from "../../Dashboard.module.css";
import styles from "../Challenges.module.css";

const EMPTY_DAY_STATS: DayStats = { discovered: 0, completed: 0, eligible: 0, sampled: 0, selected: 0 };

/** "day" is a stable, shareable query param (UX-A day-navigation requirement) — an explicit value is used as-is (format-validated only by resolveDay-equivalent logic downstream), so refresh/back-forward/shared links all land on the same day. */
export default async function ChallengeDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ day?: string }> }) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) {
    redirect("/login");
  }

  const workspace = await ensureActiveWorkspace(headersList);
  if (!workspace) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const { day: requestedDay } = await searchParams;
  const db = getDb();
  const c = await getChallenge(db, workspace.id, id);
  if (!c) {
    notFound();
  }

  // UX-A: the curation surface is scoped to one challenge-local day at a
  // time. Resolve the day list first (powers the header day picker), then
  // the active day — an explicit, well-formed `?day=` query param wins
  // (shareable/bookmarkable/back-forward-safe); otherwise the latest
  // grace-elapsed day, same default as before.
  const daysResult = await listChallengeDays(db, workspace.id, c.id);
  const days = daysResult.outcome === "ok" ? daysResult.days : [];
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const day = requestedDay && DAY_RE.test(requestedDay) ? requestedDay : pickDefaultDay(days);
  // Independent of each other (each only needs c.id/workspace.id, already
  // resolved above) — run concurrently rather than one at a time (each a
  // separate Neon round-trip, dominated by network RTT rather than query
  // cost; see the Slice B QA measurement this pattern was introduced for).
  const [stats, galleryPage, diagnosticsSummary, selectedResult, dayStatsResult, notYetSampledResult] = await Promise.all([
    getChallengeSyncStats(db, c.id),
    day ? getGallerySubmissions(db, workspace.id, c.id, day, null) : Promise.resolve({ outcome: "ok" as const, items: [], nextCursor: null }),
    day ? getDiagnosticSummary(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, counts: EMPTY_DIAGNOSTIC_COUNTS }),
    day ? getSelectedSubmissions(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, items: [] }),
    day ? getDayStats(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, stats: EMPTY_DAY_STATS }),
    day ? getNotYetSampledCount(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, count: 0 }),
  ]);
  const galleryItems = galleryPage.outcome === "ok" ? galleryPage.items.map((item) => ({ ...item, publishedAt: item.publishedAt.toISOString() })) : [];
  const galleryNextCursor = galleryPage.outcome === "ok" ? galleryPage.nextCursor : null;
  const diagnosticsCounts = diagnosticsSummary.outcome === "ok" ? diagnosticsSummary.counts : EMPTY_DIAGNOSTIC_COUNTS;
  const selectedItems = selectedResult.outcome === "ok" ? selectedResult.items.map((item) => ({ ...item, publishedAt: item.publishedAt.toISOString() })) : [];
  const dayStats = dayStatsResult.outcome === "ok" ? dayStatsResult.stats : EMPTY_DAY_STATS;
  const notYetSampled = notYetSampledResult.outcome === "ok" ? notYetSampledResult.count : 0;
  const displayStatus = deriveChallengeStatus(c.status, c.endDate, c.timezone);
  const lastSyncSummary = stats.lastSyncRun
    ? `Last synced ${stats.lastSyncRun.completedAt ? new Date(stats.lastSyncRun.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : stats.lastSyncRun.status}${stats.lastSyncRun.lastError ? ` — ${stats.lastSyncRun.lastError}` : ""}`
    : "Never synced yet";

  const syncSection = (
    <section>
      <h2 className={dashboardStyles.sectionTitle}>Sync &amp; processing</h2>
      <div className={styles.statsGrid}>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.discovered}</span>
          <span className={styles.statLabel}>Discovered</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.pending}</span>
          <span className={styles.statLabel}>Backlog</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.completed}</span>
          <span className={styles.statLabel}>Processed</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.eligible}</span>
          <span className={styles.statLabel}>Eligible</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statValue}>{stats.errorPermanent}</span>
          <span className={styles.statLabel}>Failed</span>
        </div>
      </div>
      <p className={styles.sub}>{lastSyncSummary}</p>
      <SyncButton challengeId={c.id} />
    </section>
  );

  return (
    <CurationWorkspace
      key={stats.lastSyncRun?.completedAt?.toISOString() ?? "no-sync-yet"}
      email={session.user.email}
      challengeId={c.id}
      challengeName={c.name}
      challengeStatus={displayStatus}
      hashtag={c.hashtag}
      requiredMention={c.requiredMention}
      challengeStartDate={c.startDate}
      challengeEndDate={c.endDate}
      timezone={c.timezone}
      processingGracePeriodHours={c.processingGracePeriodHours}
      lastSyncSummary={lastSyncSummary}
      initialDay={day}
      initialDays={days}
      initialReady={{ items: galleryItems, nextCursor: galleryNextCursor }}
      initialDiagnosticCounts={diagnosticsCounts}
      initialSelected={selectedItems}
      initialStats={dayStats}
      initialNotYetSampled={notYetSampled}
      syncSection={syncSection}
    />
  );
}
