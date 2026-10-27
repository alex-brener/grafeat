import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { updateChallenge, type UpdateChallengeInput } from "@/lib/challenge";

export const runtime = "nodejs";

function toInput(body: unknown): UpdateChallengeInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    name: typeof b.name === "string" ? b.name : "",
    startDate: typeof b.startDate === "string" ? b.startDate : "",
    endDate: typeof b.endDate === "string" ? b.endDate : "",
    timezone: typeof b.timezone === "string" ? b.timezone : "",
    status: b.status === "active" ? "active" : "draft",
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = await updateChallenge(getDb(), session.session.activeOrganizationId, id, toInput(body));

  switch (result.outcome) {
    case "updated":
      return NextResponse.json({ ok: true });
    case "invalid":
      return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    case "not_found":
      // Deliberately the same response whether the challenge doesn't exist
      // or belongs to a different workspace — never confirm existence of
      // another organization's data.
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
  }
}
