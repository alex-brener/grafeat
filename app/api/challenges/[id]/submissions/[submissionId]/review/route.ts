import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { setSubmissionReviewStatus, REVIEW_DECISIONS, type ReviewDecision } from "@/lib/submission-review";

export const runtime = "nodejs";

function toDecision(body: unknown): ReviewDecision | null {
  const b = (body ?? {}) as Record<string, unknown>;
  return typeof b.decision === "string" && (REVIEW_DECISIONS as readonly string[]).includes(b.decision) ? (b.decision as ReviewDecision) : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id, submissionId } = await params;
  const decision = toDecision(await req.json().catch(() => null));
  if (!decision) {
    return NextResponse.json({ ok: false, error: "Invalid decision." }, { status: 400 });
  }

  const result = await setSubmissionReviewStatus(getDb(), session.session.activeOrganizationId, id, submissionId, decision);

  switch (result.outcome) {
    case "updated":
      return NextResponse.json({ ok: true, reviewStatus: result.reviewStatus });
    case "not_found":
      // Same response whether the challenge doesn't exist, belongs to
      // another workspace, or the submission doesn't belong to this
      // challenge — never confirms existence either way.
      return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }
}
