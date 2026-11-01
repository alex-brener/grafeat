import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getChallenge, listChallenges } from "@/lib/challenge";
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
import { DashboardShell } from "../../DashboardShell";
import { SyncButton } from "../SyncButton";
import { CurationWorkspace, type DayStats } from "../CurationWorkspace";
import { CurateStepper } from "../CurateStepper";
import { ChallengeSwitcher } from "../ChallengeSwitcher";
import dashboardStyles from "../../Dashboard.module.css";
import styles from "../Challenges.module.css";

const EMPTY_DAY_STATS: DayStats = { discovered: 0, completed: 0, eligible: 0, sampled: 0, selected: 0 };

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const c = await getChallenge(getDb(), workspace.id, id);
  if (!c) {
    notFound();
  }

  const displayStatus = deriveChallengeStatus(c.status, c.endDate, c.timezone);
  const db = getDb();
  // UX-A: the curation surface is scoped to one challenge-local day at a
  // time. Resolve the day list first (powers the day switcher), then the
  // default day (latest grace-elapsed day; null if none has cleared grace
  // yet) before fetching anything day-scoped.
  const daysResult = await listChallengeDays(db, workspace.id, c.id);
  const days = daysResult.outcome === "ok" ? daysResult.days : [];
  const day = pickDefaultDay(days);
  // Independent of each other (each only needs c.id/workspace.id, already
  // resolved above) — run concurrently rather than one at a time (each a
  // separate Neon round-trip, dominated by network RTT rather than query
  // cost; see the Slice B QA measurement this pattern was introduced for).
  const [stats, galleryPage, diagnosticsSummary, selectedResult, dayStatsResult, notYetSampledResult, allChallenges] = await Promise.all([
    getChallengeSyncStats(db, c.id),
    day ? getGallerySubmissions(db, workspace.id, c.id, day, null) : Promise.resolve({ outcome: "ok" as const, items: [], nextCursor: null }),
    day ? getDiagnosticSummary(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, counts: EMPTY_DIAGNOSTIC_COUNTS }),
    day ? getSelectedSubmissions(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, items: [] }),
    day ? getDayStats(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, stats: EMPTY_DAY_STATS }),
    day ? getNotYetSampledCount(db, workspace.id, c.id, day) : Promise.resolve({ outcome: "ok" as const, count: 0 }),
    listChallenges(db, workspace.id),
  ]);
  const galleryItems = galleryPage.outcome === "ok" ? galleryPage.items.map((item) => ({ ...item, publishedAt: item.publishedAt.toISOString() })) : [];
  const galleryNextCursor = galleryPage.outcome === "ok" ? galleryPage.nextCursor : null;
  const diagnosticsCounts = diagnosticsSummary.outcome === "ok" ? diagnosticsSummary.counts : EMPTY_DIAGNOSTIC_COUNTS;
  const selectedItems = selectedResult.outcome === "ok" ? selectedResult.items.map((item) => ({ ...item, publishedAt: item.publishedAt.toISOString() })) : [];
  const dayStats = dayStatsResult.outcome === "ok" ? dayStatsResult.stats : EMPTY_DAY_STATS;
  const notYetSampled = notYetSampledResult.outcome === "ok" ? notYetSampledResult.count : 0;

  return (
    <DashboardShell email={session.user.email}>
      <div className={styles.headerRow}>
        <div>
          <a href="/dashboard/challenges" className={styles.breadcrumb}>
            ← Challenges
          </a>
          <h1 className={styles.heading}>{c.name}</h1>
          <p className={styles.sub}>
            <span className={`${dashboardStyles.statusBadge} ${dashboardStyles[`statusBadge_${displayStatus}`]}`}>
              {displayStatus}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ChallengeSwitcher challenges={allChallenges} currentId={c.id} />
          <a href={`/dashboard/challenges/${c.id}/settings`} className={styles.settingsLink}>
            Settings
          </a>
        </div>
      </div>
      <CurateStepper />

      <section className={styles.card}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Hashtag</span>
          <span className={styles.detailValue}>#{c.hashtag}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Required mention</span>
          <span className={styles.detailValue}>@{c.requiredMention}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Dates</span>
          <span className={styles.detailValue}>
            {c.startDate} – {c.endDate}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Timezone</span>
          <span className={styles.detailValue}>{c.timezone}</span>
        </div>
      </section>

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Discovery &amp; processing</h2>
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
        {stats.lastSyncRun && (
          <p className={styles.sub}>
            Last sync: {stats.lastSyncRun.status}
            {stats.lastSyncRun.lastError ? ` — ${stats.lastSyncRun.lastError}` : ""}
          </p>
        )}
        <SyncButton challengeId={c.id} />
      </section>

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Curate</h2>
        {/*
          CurationWorkspace seeds its own client-side state from these
          initial* props via useState — that initializer only runs on
          mount, so a bare router.refresh() (SyncButton, on a successful
          sync) re-renders this server component with fresh props but
          leaves the already-mounted workspace's state untouched, stuck
          stale until a full page reload. Keying it to the last completed
          sync forces exactly this component to remount (and re-seed from
          the new props) whenever a sync actually finishes, while staying
          stable — and preserving in-progress client state — between syncs.
        */}
        <CurationWorkspace
          key={stats.lastSyncRun?.completedAt?.toISOString() ?? "no-sync-yet"}
          challengeId={c.id}
          initialDay={day}
          initialDays={days}
          initialReady={{ items: galleryItems, nextCursor: galleryNextCursor }}
          initialDiagnosticCounts={diagnosticsCounts}
          initialSelected={selectedItems}
          initialStats={dayStats}
          initialNotYetSampled={notYetSampled}
        />
      </section>
    </DashboardShell>
  );
}
