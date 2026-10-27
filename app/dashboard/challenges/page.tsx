import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listChallenges } from "@/lib/challenge";
import { deriveChallengeStatus } from "@/lib/timezone";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { DashboardShell } from "../DashboardShell";
import dashboardStyles from "../Dashboard.module.css";
import styles from "./Challenges.module.css";

export default async function ChallengesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) {
    redirect("/login");
  }

  const workspace = await ensureActiveWorkspace(headersList);
  const challenges = workspace ? await listChallenges(getDb(), workspace.id) : [];

  return (
    <DashboardShell email={session.user.email}>
      <div>
        <a href="/dashboard" className={styles.breadcrumb}>
          ← Dashboard
        </a>
        <h1 className={styles.heading}>Challenges</h1>
        <p className={styles.sub}>{workspace?.name ?? "Your workspace"}</p>
      </div>

      {challenges.length > 0 ? (
        <>
          <ul className={styles.list}>
            {challenges.map((c) => {
              const displayStatus = deriveChallengeStatus(c.status, c.endDate, c.timezone);
              return (
                <li key={c.id}>
                  <a href={`/dashboard/challenges/${c.id}`} className={styles.listRow}>
                    <span className={styles.listRowMain}>
                      <span className={styles.listRowName}>{c.name}</span>
                      <span className={styles.listRowMeta}>
                        #{c.hashtag} · {c.startDate} – {c.endDate}
                      </span>
                    </span>
                    <span
                      className={`${dashboardStyles.statusBadge} ${dashboardStyles[`statusBadge_${displayStatus}`]}`}
                    >
                      {displayStatus}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <a href="/dashboard/challenges/new" className={dashboardStyles.primaryCta}>
            New challenge
          </a>
        </>
      ) : (
        <div className={dashboardStyles.emptyState}>
          <h3 className={dashboardStyles.emptyStateHeading}>No challenges yet</h3>
          <p className={dashboardStyles.emptyStateBody}>
            Set up your first challenge and Grafeat will start discovering and verifying
            submissions automatically.
          </p>
          <a href="/dashboard/challenges/new" className={dashboardStyles.primaryCta}>
            New challenge
          </a>
        </div>
      )}
    </DashboardShell>
  );
}
