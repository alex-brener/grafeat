import { NextRequest, NextResponse } from "next/server";
import type { AppDb } from "@/lib/db/client";
import { submitEarlyAccess, type EarlyAccessInput } from "@/lib/early-access";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";
import { sendEarlyAccessNotification } from "@/lib/email";

/** Vercel sets this; first entry is the original client. Falls back to a shared bucket locally, which is harmless. */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function toInput(body: unknown): EarlyAccessInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    account: typeof b.account === "string" ? b.account : "",
    email: typeof b.email === "string" ? b.email : "",
    frequency: typeof b.frequency === "string" ? b.frequency : null,
    painPoint: typeof b.painPoint === "string" ? b.painPoint : "",
    wantsBeta: b.wantsBeta === true,
    // Field name deliberately generic, not "honeypot" — see EarlyAccessSection.tsx.
    honeypot: typeof b.website === "string" ? b.website : "",
  };
}

export type SendNotification = (data: Omit<EarlyAccessInput, "honeypot">) => Promise<void>;

/**
 * Kept out of app/api/early-access/route.ts itself because Next's App
 * Router route-file typing only permits recognized exports (GET/POST/config
 * values) from a route module — anything else fails the generated
 * route-export type check. Living here also lets tests
 * (tests/early-access-route.test.ts) call this directly against the PGlite
 * harness instead of the production getDb() singleton, with no Next
 * internals to mock.
 *
 * Rate limiting is the very first thing this does, before the body is even
 * read — a request that's over the limit is rejected before any JSON
 * parsing is attempted, and a request that fails to parse as JSON still
 * reaches this point and is still counted exactly once (never skipped,
 * never double-counted, since lib/early-access.ts never touches the rate
 * limiter itself).
 */
export function createEarlyAccessHandler(
  db: AppDb,
  sendNotification: SendNotification = sendEarlyAccessNotification
) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    const { allowed } = await checkAndIncrementRateLimit(db, getClientIp(req));
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const result = await submitEarlyAccess(db, toInput(body), { sendNotification });

    switch (result.outcome) {
      case "created":
      case "duplicate":
      case "dropped":
        // Identical response for all three — a duplicate or a honeypot hit
        // must not be distinguishable from a genuine new signup.
        return NextResponse.json({ ok: true });
      case "invalid":
        return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    }
  };
}
