import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getConnectionStatus } from "@/lib/meta-connection";
import { ensureActiveWorkspace } from "@/lib/workspace-bootstrap";

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

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: "0 24px", fontFamily: "var(--font-albert-sans, system-ui)" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>{workspace?.name ?? "Your workspace"}</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>Signed in as {session.user.email}</p>

      {connected && (
        <p role="status" style={{ color: "#166534", marginBottom: 16 }}>
          Connected {connected === "facebook_login" ? "Facebook Login" : "Instagram Login"} successfully.
        </p>
      )}
      {connectError && (
        <p role="alert" style={{ color: "#b00020", marginBottom: 16 }}>
          Connecting failed ({connectError}). {connectError === "facebook_login_no_ig_account"
            ? "No Instagram Business account was found linked to a Facebook Page you manage."
            : "Please try again."}
        </p>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18 }}>Instagram connections</h2>
        <ConnectionRow
          label="Instagram Login"
          status={instagram}
          startHref="/api/auth/instagram/start"
        />
        <ConnectionRow
          label="Facebook Login"
          status={facebook}
          startHref="/api/auth/facebook/start"
        />
      </section>
    </main>
  );
}

function ConnectionRow({
  label,
  status,
  startHref,
}: {
  label: string;
  status: { status: string; igUserId: string; updatedAt: Date } | null;
  startHref: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #eee" }}>
      <div>
        <strong>{label}</strong>
        <div style={{ fontSize: 14, color: "#666" }}>
          {status ? `${status.status} · IG account ${status.igUserId}` : "Not connected"}
        </div>
      </div>
      <a href={startHref} style={{ padding: "8px 16px", border: "1px solid #333", borderRadius: 6, textDecoration: "none", color: "#111" }}>
        {status ? "Reconnect" : "Connect"}
      </a>
    </div>
  );
}
