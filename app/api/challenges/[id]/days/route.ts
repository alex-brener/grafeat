import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { listChallengeDays } from "@/lib/submission-gallery";

export const runtime = "nodejs";

/** Powers the day switcher — every challenge-local day with at least one submission, most recent first, each flagged with whether its grace period has elapsed. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const result = await listChallengeDays(getDb(), session.session.activeOrganizationId, id);

  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ ok: true, days: result.days });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
  }
}
