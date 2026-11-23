import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getChallenge, challengeHasSubmissions } from "@/lib/challenge";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { CuratorPageShell } from "../../../CuratorPageShell";
import { ChallengeForm } from "../../ChallengeForm";
import dashboardStyles from "../../../Dashboard.module.css";
import styles from "../../Challenges.module.css";

/** UX-A locked decision #7: Settings relocated off the main curation page, reached via its own top-level link rather than an inline section. Same shell/header as Curate for continuity — no day picker or stepper here, since Settings applies to the whole challenge, not one day or workflow step. */
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

  const hasSubmissions = await challengeHasSubmissions(db, c.id);

  return (
    <CuratorPageShell email={session.user.email} challengeContext={{ id: c.id, name: c.name }} maxWidth={880}>
      <a href={`/dashboard/challenges/${c.id}`} className={styles.breadcrumb}>
        ← {c.name}
      </a>
      <h1 className={styles.heading}>Settings</h1>
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
    </CuratorPageShell>
  );
}
