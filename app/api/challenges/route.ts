import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { createChallenge, type CreateChallengeInput } from "@/lib/challenge";

export const runtime = "nodejs";

function toInput(body: unknown): CreateChallengeInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    name: typeof b.name === "string" ? b.name : "",
    hashtag: typeof b.hashtag === "string" ? b.hashtag : "",
    requiredMention: typeof b.requiredMention === "string" ? b.requiredMention : "",
    startDate: typeof b.startDate === "string" ? b.startDate : "",
    endDate: typeof b.endDate === "string" ? b.endDate : "",
    timezone: typeof b.timezone === "string" ? b.timezone : "",
  };
}

export async function POST(req: NextRequest) {
  // The organization comes from the session's own active workspace, never
  // from the request body — a client-supplied organizationId is exactly
  // the kind of input this route must never trust.
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = await createChallenge(getDb(), session.session.activeOrganizationId, toInput(body));

  if (result.outcome === "invalid") {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
