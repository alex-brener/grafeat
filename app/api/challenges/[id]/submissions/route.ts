import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getGallerySubmissions, type SubmissionCardData } from "@/lib/submission-gallery";

export const runtime = "nodejs";

function serialize(item: SubmissionCardData) {
  return { ...item, publishedAt: item.publishedAt.toISOString() };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const result = await getGallerySubmissions(getDb(), session.session.activeOrganizationId, id, cursor);

  switch (result.outcome) {
    case "ok":
      return NextResponse.json({ ok: true, items: result.items.map(serialize), nextCursor: result.nextCursor });
    case "not_found":
      return NextResponse.json({ ok: false, error: "Challenge not found." }, { status: 404 });
    case "invalid_cursor":
      return NextResponse.json({ ok: false, error: "Invalid pagination cursor." }, { status: 400 });
  }
}
