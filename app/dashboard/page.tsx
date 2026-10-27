import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getConnectionStatus } from "@/lib/meta-connection";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { listChallenges } from "@/lib/challenge";
import { deriveChallengeStatus } from "@/lib/timezone";
import { DashboardShell } from "./DashboardShell";
import styles from "./Dashboard.module.css";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; connectError?: string }>;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) {
    redirect("/login");
  }

  const workspace = await ensureActiveWorkspace(headersList);
  const { connected, connectError } = await searchParams;

  const db = getDb();
  const [facebook, instagram, challenges] = workspace
    ? await Promise.all([
        getConnectionStatus(db, workspace.id, "facebook_login"),
        getConnectionStatus(db, workspace.id, "instagram_login"),
        listChallenges(db, workspace.id),
      ])
    : [null, null, []];

  const hasAnyConnection = Boolean(facebook || instagram);

  return (
    <DashboardShell email={session.user.email}>
      <div>
        <h1 className={styles.workspaceHeading}>{workspace?.name ?? "Your workspace"}</h1>
        <p className={styles.workspaceSub}>Signed in as {session.user.email}</p>
      </div>

      {connected && (
        <p role="status" className={`${styles.banner} ${styles.bannerSuccess}`}>
          Connected successfully.
        </p>
      )}
      {connectError && (
        <p role="alert" className={`${styles.banner} ${styles.bannerError}`}>
          Connecting failed.{" "}
          {connectError === "facebook_login_no_ig_account"
            ? "No Instagram Professional account was found linked to a Facebook Page you manage."
            : "Please try again."}
        </p>
      )}

      <section>
        <h2 className={styles.sectionTitle}>Connect your Instagram account</h2>
        <p className={styles.sectionIntro}>
          Grafeat discovers and verifies challenge submissions through your Instagram account.
        </p>

        <div className={styles.primaryPanel}>
          {facebook ? (
            <div className={styles.connectedRow}>
              <span className={styles.connectedMark}>✓</span>
              <div className={styles.connectedText}>
                <span className={styles.connectedUsername}>
                  {facebook.username ? `@${facebook.username}` : "Connected · username unavailable"}
                </span>
                <span className={styles.connectedMeta}>Connected via Facebook</span>
              </div>
              <a href="/api/auth/facebook/start" className={styles.reconnectLink}>
                Reconnect
              </a>
            </div>
          ) : (
            <>
              <p className={styles.primaryPanelBody}>
                Authorization happens through Facebook and requires an Instagram Professional
                account connected to a Facebook Page.
              </p>
              <a href="/api/auth/facebook/start" className={styles.primaryCta}>
                Connect with Facebook
              </a>
            </>
          )}
        </div>

        <details className={styles.advanced}>
          <summary className={styles.advancedSummary}>Advanced: Instagram Login (development)</summary>
          <div className={styles.advancedBody}>
            <p className={styles.advancedNote}>
              A separate, direct Instagram sign-in path used for development and testing. Most
              organizers should use the Facebook option above.
            </p>
            <div className={styles.connectionRow}>
              <div>
                <div className={styles.connectionRowLabel}>
                  {instagram
                    ? instagram.username
                      ? `@${instagram.username}`
                      : "Connected · username unavailable"
                    : "Not connected"}
                </div>
                {instagram && <div className={styles.connectionRowMeta}>Connected via Instagram Login</div>}
              </div>
              <a href="/api/auth/instagram/start" className={styles.secondaryLink}>
                {instagram ? "Reconnect" : "Connect"}
              </a>
            </div>
          </div>
        </details>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Challenges</h2>

        {challenges.length > 0 ? (
          <>
            <ul className={styles.challengeSummaryList}>
              {challenges.slice(0, 5).map((c) => {
                const displayStatus = deriveChallengeStatus(c.status, c.endDate, c.timezone);
                return (
                  <li key={c.id} className={styles.challengeSummaryRow}>
                    <a href={`/dashboard/challenges/${c.id}`} className={styles.challengeSummaryName}>
                      {c.name}
                    </a>
                    <span className={`${styles.statusBadge} ${styles[`statusBadge_${displayStatus}`]}`}>
                      {displayStatus}
                    </span>
                  </li>
                );
              })}
            </ul>
            <a href="/dashboard/challenges" className={styles.secondaryLink}>
              {challenges.length > 5 ? `View all ${challenges.length} challenges` : "View all challenges"}
            </a>
          </>
        ) : hasAnyConnection ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateHeading}>No challenges yet</h3>
            <p className={styles.emptyStateBody}>
              Set up your first challenge and Grafeat will start discovering and verifying
              submissions automatically.
            </p>
            <a href="/dashboard/challenges/new" className={styles.primaryCta}>
              New challenge
            </a>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateHeading}>No challenges yet</h3>
            <p className={styles.emptyStateBody}>
              Connect your Instagram account above to get started. Once connected, you&apos;ll be
              able to set up a challenge here.
            </p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
