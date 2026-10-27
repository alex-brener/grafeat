import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getChallenge } from "@/lib/challenge";
import { getChallengeSyncStats } from "@/lib/sync-stats";
import { getGallerySubmissions, getDiagnosticSummary } from "@/lib/submission-gallery";
import { deriveChallengeStatus } from "@/lib/timezone";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { DashboardShell } from "../../DashboardShell";
import { ChallengeForm } from "../ChallengeForm";
import { SyncButton } from "../SyncButton";
import { SubmissionGallery } from "../SubmissionGallery";
import { DiagnosticsPanel } from "../DiagnosticsPanel";
import dashboardStyles from "../../Dashboard.module.css";
import styles from "../Challenges.module.css";

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
  const stats = await getChallengeSyncStats(db, c.id);

  const galleryPage = await getGallerySubmissions(db, workspace.id, c.id, null);
  const galleryItems = galleryPage.outcome === "ok" ? galleryPage.items.map((item) => ({ ...item, publishedAt: item.publishedAt.toISOString() })) : [];
  const galleryNextCursor = galleryPage.outcome === "ok" ? galleryPage.nextCursor : null;

  const diagnosticsSummary = await getDiagnosticSummary(db, workspace.id, c.id);
  const diagnosticsCounts =
    diagnosticsSummary.outcome === "ok" ? diagnosticsSummary.counts : { pending: 0, technical_failure: 0, not_verified: 0, outside_dates: 0 };

  return (
    <DashboardShell email={session.user.email}>
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
        <h2 className={dashboardStyles.sectionTitle}>Gallery</h2>
        <SubmissionGallery challengeId={c.id} initialItems={galleryItems} initialNextCursor={galleryNextCursor} />
      </section>

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Diagnostics</h2>
        <p className={styles.sub}>Submissions not yet in the gallery, grouped by why — read-only.</p>
        <DiagnosticsPanel challengeId={c.id} initialCounts={diagnosticsCounts} />
      </section>

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Edit</h2>
        <div className={styles.card}>
          <ChallengeForm
            mode="edit"
            challengeId={c.id}
            initial={{
              name: c.name,
              startDate: c.startDate,
              endDate: c.endDate,
              timezone: c.timezone,
              status: c.status,
            }}
          />
        </div>
      </section>
    </DashboardShell>
  );
}
