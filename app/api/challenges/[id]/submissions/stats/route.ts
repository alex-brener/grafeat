import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getDayStats, getNotYetSampledCount, resolveDay } from "@/lib/submission-gallery";

export const runtime = "nodejs";

const EMPTY_STATS = { discovered: 0, completed: 0, eligible: 0, sampled: 0, selected: 0 };

/** Per-day transparency counts plus the "eligible but not yet sampled" inline count (never a browsable list — see getNotYetSampledCount). `?day=` as in the gallery route. */
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
      return NextResponse.json({ ok: true, stats: EMPTY_STATS, notYetSampled: 0, day: null });
  }

  const [statsResult, notYetSampledResult] = await Promise.all([
    getDayStats(db, orgId, id, dayResult.day),
    getNotYetSampledCount(db, orgId, id, dayResult.day),
  ]);

  if (statsResult.outcome !== "ok" || notYetSampledResult.outcome !== "ok") {
    return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, stats: statsResult.stats, notYetSampled: notYetSampledResult.count, day: dayResult.day });
}
