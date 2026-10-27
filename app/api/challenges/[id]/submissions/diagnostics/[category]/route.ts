import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getDiagnosticSubmissions, DIAGNOSTIC_CATEGORIES, type DiagnosticCategory, type SubmissionCardData } from "@/lib/submission-gallery";

export const runtime = "nodejs";

function serialize(item: SubmissionCardData) {
  return { ...item, publishedAt: item.publishedAt.toISOString() };
}

function isCategory(value: string): value is DiagnosticCategory {
  return (DIAGNOSTIC_CATEGORIES as readonly string[]).includes(value);
}

/** Read-only, fetched lazily — only called by the client once a category is actually expanded, never prefetched alongside the summary. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; category: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id, category } = await params;
  if (!isCategory(category)) {
    return NextResponse.json({ ok: false, error: "Unknown diagnostic category." }, { status: 400 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");
  const result = await getDiagnosticSubmissions(getDb(), session.session.activeOrganizationId, id, category, cursor);

  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ ok: true, items: result.items.map(serialize), nextCursor: result.nextCursor });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
    case "invalid_cursor":
      return NextResponse.json({ ok: false, error: "Invalid pagination cursor." }, { status: 400 });
  }
}
