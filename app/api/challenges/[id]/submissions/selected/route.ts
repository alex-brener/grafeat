import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getSelectedSubmissions, resolveDay, type SubmissionCardData } from "@/lib/submission-gallery";

export const runtime = "nodejs";

function serialize(item: SubmissionCardData) {
  return { ...item, publishedAt: item.publishedAt.toISOString() };
}

/** The tray: every selected item for one challenge-local day, unpaginated by design (see getSelectedSubmissions). `?day=` as in the gallery route. */
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
      return NextResponse.json({ ok: true, items: [], day: null });
  }

  const result = await getSelectedSubmissions(db, orgId, id, dayResult.day);

  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ ok: true, items: result.items.map(serialize), day: dayResult.day });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
    case "invalid_day":
      return NextResponse.json({ ok: false, error: "Invalid day." }, { status: 400 });
  }
}
