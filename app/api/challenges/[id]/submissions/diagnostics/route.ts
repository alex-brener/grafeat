import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getDiagnosticSummary, resolveDay, EMPTY_DIAGNOSTIC_COUNTS } from "@/lib/submission-gallery";

export const runtime = "nodejs";

/** Aggregate counts only, for one challenge-local day — cheap, safe to compute unconditionally when the challenge detail page loads, before the diagnostics section is ever opened. `?day=` as in the gallery route. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const orgId = session.session.activeOrganizationId;

  const dayResult = await resolveDay(db, orgId, id, req.nextUrl.searchParams.get("day"));
  switch (dayResult.outcome) {
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
    case "invalid_day":
      return NextResponse.json({ ok: false, error: "Invalid day." }, { status: 400 });
    case "no_day_available":
      return NextResponse.json({ ok: true, counts: EMPTY_DIAGNOSTIC_COUNTS, day: null });
  }

  const result = await getDiagnosticSummary(db, orgId, id, dayResult.day);

  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ ok: true, counts: result.counts, day: dayResult.day });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
    case "invalid_day":
      return NextResponse.json({ ok: false, error: "Invalid day." }, { status: 400 });
  }
}
