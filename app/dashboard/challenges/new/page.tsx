import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getConnectionStatus } from "@/lib/meta-connection";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { DashboardShell } from "../../DashboardShell";
import { ChallengeForm } from "../ChallengeForm";
import styles from "../Challenges.module.css";

export default async function NewChallengePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) {
    redirect("/login");
  }

  const workspace = await ensureActiveWorkspace(headersList);
  if (!workspace) {
    redirect("/dashboard");
  }

  const db = getDb();
  const [facebook, instagram] = await Promise.all([
    getConnectionStatus(db, workspace.id, "facebook_login"),
    getConnectionStatus(db, workspace.id, "instagram_login"),
  ]);

  if (!facebook && !instagram) {
    redirect("/dashboard");
  }

  const defaultRequiredMention = facebook?.username ?? instagram?.username ?? "";

  return (
    <DashboardShell email={session.user.email}>
      <div>
        <a href="/dashboard/challenges" className={styles.breadcrumb}>
          ← Challenges
        </a>
        <h1 className={styles.heading}>New challenge</h1>
        <p className={styles.sub}>Grafeat will discover and verify submissions using these details.</p>
      </div>

      <div className={styles.card}>
        <ChallengeForm mode="create" defaultRequiredMention={defaultRequiredMention} />
      </div>
    </DashboardShell>
  );
}
