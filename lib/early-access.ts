import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { earlyAccessSignup } from "@/lib/db/schema";
import { EMAIL_RE, normalizeEmail } from "@/lib/validation";
import { frequencyOptions } from "@/app/landing/content";
import { logEvent } from "@/lib/logger";

const ACCOUNT_MAX_LENGTH = 100;
const PAIN_POINT_MAX_LENGTH = 2000;

export interface EarlyAccessInput {
  account: string;
  email: string;
  frequency: string | null;
  painPoint: string;
  wantsBeta: boolean;
  /** Hidden form field — a human never fills this in. Any value here means a bot. */
  honeypot: string;
}

export type EarlyAccessResult =
  | { outcome: "created"; id: string }
  | { outcome: "duplicate" }
  | { outcome: "dropped" } // honeypot tripped — looks identical to "created" to the caller
  | { outcome: "invalid"; reason: string };

function validate(input: EarlyAccessInput): string | null {
  if (!input.account.trim()) return "Add your challenge account so we can look at it.";
  if (input.account.trim().length > ACCOUNT_MAX_LENGTH) return "That account name is too long.";
  if (!EMAIL_RE.test(input.email.trim())) return "That email doesn't look right.";
  if (input.frequency !== null && !frequencyOptions.includes(input.frequency)) return "Invalid frequency.";
  if (input.painPoint.length > PAIN_POINT_MAX_LENGTH) return "That answer is too long.";
  return null;
}

/**
 * The full submission pipeline, independent of Next.js — app/api/early-access/route.ts
 * is a thin wrapper around this so it's directly testable against the real
 * (PGlite-backed) schema without mocking Next internals, matching how the
 * rest of this codebase's lib/ functions are tested.
 *
 * Deliberately does NOT touch rate limiting — the caller (the route) must
 * call lib/rate-limit.ts's checkAndIncrementRateLimit itself, before this
 * function is ever invoked, so that the increment happens exactly once per
 * HTTP request (including one that fails to parse as JSON) and this
 * function can never be reached while over the limit without that gate
 * already having rejected the request.
 */
export async function submitEarlyAccess(
  db: AppDb,
  input: EarlyAccessInput,
  deps: { sendNotification: (data: Omit<EarlyAccessInput, "honeypot">) => Promise<void> }
): Promise<EarlyAccessResult> {
  if (input.honeypot.trim()) return { outcome: "dropped" };

  const reason = validate(input);
  if (reason) return { outcome: "invalid", reason };

  const email = normalizeEmail(input.email);

  const [inserted] = await db
    .insert(earlyAccessSignup)
    .values({
      account: input.account.trim(),
      email,
      frequency: input.frequency,
      painPoint: input.painPoint.trim() || null,
      wantsBeta: input.wantsBeta,
    })
    .onConflictDoNothing({ target: earlyAccessSignup.email })
    .returning({ id: earlyAccessSignup.id });

  if (!inserted) return { outcome: "duplicate" };

  try {
    await deps.sendNotification({
      account: input.account.trim(),
      email,
      frequency: input.frequency,
      painPoint: input.painPoint.trim(),
      wantsBeta: input.wantsBeta,
    });
    await db
      .update(earlyAccessSignup)
      .set({ notificationStatus: "sent", notificationAttemptedAt: new Date() })
      .where(eq(earlyAccessSignup.id, inserted.id));
  } catch (err) {
    await db
      .update(earlyAccessSignup)
      .set({ notificationStatus: "failed", notificationAttemptedAt: new Date() })
      .where(eq(earlyAccessSignup.id, inserted.id));
    await logEvent({
      testCaseId: "early_access.notify",
      endpoint: "(internal)",
      method: "N/A",
      status: "FAIL",
      result: "FAIL",
      notes: err instanceof Error ? err.message : "Unknown error sending early-access notification",
    });
    // Deliberately not rethrown — the signup is already durably persisted;
    // a failed internal notification must never surface as a failed submission.
  }

  return { outcome: "created", id: inserted.id };
}
