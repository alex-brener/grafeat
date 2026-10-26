import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getConnectionStatus } from "@/lib/meta-connection";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";
import { SignOutButton } from "./SignOutButton";
import logoMark from "../icon.png";
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
  const [facebook, instagram] = workspace
    ? await Promise.all([
        getConnectionStatus(db, workspace.id, "facebook_login"),
        getConnectionStatus(db, workspace.id, "instagram_login"),
      ])
    : [null, null];

  const hasAnyConnection = Boolean(facebook || instagram);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image src={logoMark} alt="" width={26} height={26} className={styles.logoMark} priority />
          Grafeat
        </div>
        <div className={styles.spacer} />
        <div className={styles.accountControls}>
          <span>{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className={styles.main}>
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
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateHeading}>No challenges yet</h3>
            <p className={styles.emptyStateBody}>
              {hasAnyConnection
                ? "You're connected. Challenge creation is coming in the next milestone — once a challenge exists, Grafeat will start discovering and verifying submissions automatically."
                : "Connect your Instagram account above to get started. Once connected, you'll be able to set up a challenge here."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
