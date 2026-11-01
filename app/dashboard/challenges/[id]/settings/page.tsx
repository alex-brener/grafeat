import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getChallenge, challengeHasSubmissions, listChallenges } from "@/lib/challenge";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { DashboardShell } from "../../../DashboardShell";
import { ChallengeForm } from "../../ChallengeForm";
import { ChallengeSwitcher } from "../../ChallengeSwitcher";
import dashboardStyles from "../../../Dashboard.module.css";
import styles from "../../Challenges.module.css";

/** UX-A locked decision #7: Settings relocated off the main curation page, reached via its own top-level link rather than an inline section. */
export default async function ChallengeSettingsPage({ params }: { params: Promise<{ id: string }> }) {
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
  const db = getDb();
  const c = await getChallenge(db, workspace.id, id);
  if (!c) {
    notFound();
  }

  const [hasSubmissions, allChallenges] = await Promise.all([challengeHasSubmissions(db, c.id), listChallenges(db, workspace.id)]);

  return (
    <DashboardShell email={session.user.email}>
      <div className={styles.headerRow}>
        <div>
          <a href={`/dashboard/challenges/${c.id}`} className={styles.breadcrumb}>
            ← {c.name}
          </a>
          <h1 className={styles.heading}>Settings</h1>
        </div>
        <ChallengeSwitcher challenges={allChallenges} currentId={c.id} />
      </div>

      <section className={styles.card}>
        <h2 className={dashboardStyles.sectionTitle}>Challenge</h2>
        <ChallengeForm
          mode="edit"
          challengeId={c.id}
          initial={{
            name: c.name,
            startDate: c.startDate,
            endDate: c.endDate,
            timezone: c.timezone,
            status: c.status,
            dailyReviewLimit: c.dailyReviewLimit,
            hasSubmissions,
          }}
        />
      </section>
    </DashboardShell>
  );
}
