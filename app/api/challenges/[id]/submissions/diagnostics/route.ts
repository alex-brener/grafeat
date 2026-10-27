import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getDiagnosticSummary } from "@/lib/submission-gallery";

export const runtime = "nodejs";

/** Aggregate counts only — cheap, safe to compute unconditionally when the challenge detail page loads, before the diagnostics section is ever opened. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const result = await getDiagnosticSummary(getDb(), session.session.activeOrganizationId, id);

  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ ok: true, counts: result.counts });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
  }
}
