import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getChallenge } from "@/lib/challenge";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  // getChallenge is already workspace-scoped — the same "not found" response
  // whether the challenge doesn't exist or belongs to another workspace.
  const challenge = await getChallenge(db, session.session.activeOrganizationId, id);
  if (!challenge) {
    return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
  }

  const result = await runSync(db, id);

  switch (result.outcome) {
    case "synced":
      return NextResponse.json({
        ok: true,
        status: result.status,
        summary: result.summary,
        errorMessage: result.errorMessage,
        rateLimitedUntil: result.rateLimitedUntil?.toISOString(),
      });
    case "already_running":
      return NextResponse.json({ ok: false, error: "A sync is already running for this challenge." }, { status: 409 });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
    case "not_connected":
      return NextResponse.json({ ok: false, error: "Connect Instagram via Facebook before syncing." }, { status: 409 });
    case "reconnect_required":
      return NextResponse.json({ ok: false, error: "Your Facebook connection has expired — please reconnect.", reconnect: true }, { status: 409 });
    case "permissions_required":
      return NextResponse.json({ ok: false, error: "Missing a required Instagram/Facebook permission. Please reconnect and grant access." }, { status: 409 });
  }
}
