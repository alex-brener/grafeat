import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";
import { submitEarlyAccess, type EarlyAccessInput } from "@/lib/early-access";
import { earlyAccessSignup } from "@/lib/db/schema";

function baseInput(overrides: Partial<EarlyAccessInput> = {}): EarlyAccessInput {
  return {
    account: "@creativeoctober",
    email: "organizer@example.com",
    frequency: "Once a year",
    painPoint: "Scrolling the hashtag every night",
    wantsBeta: false,
    honeypot: "",
    ...overrides,
  };
}

type SendNotification = (data: Omit<EarlyAccessInput, "honeypot">) => Promise<void>;

describe("submitEarlyAccess", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let sendNotification: ReturnType<typeof vi.fn<SendNotification>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    sendNotification = vi.fn<SendNotification>().mockResolvedValue(undefined);
  });

  it("persists a valid submission and marks the notification sent", async () => {
    const result = await submitEarlyAccess(ctx.db, baseInput(), { sendNotification });
    expect(result.outcome).toBe("created");

    const rows = await ctx.db.select().from(earlyAccessSignup);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("organizer@example.com");
    expect(rows[0].notificationStatus).toBe("sent");
    expect(rows[0].notificationAttemptedAt).not.toBeNull();
    expect(sendNotification).toHaveBeenCalledOnce();
  });

  it("normalizes email case/whitespace before storing and deduping", async () => {
    await submitEarlyAccess(ctx.db, baseInput({ email: "  Organizer@Example.COM  " }), { sendNotification });
    const rows = await ctx.db.select().from(earlyAccessSignup);
    expect(rows[0].email).toBe("organizer@example.com");
  });

  it("rejects a missing account", async () => {
    const result = await submitEarlyAccess(ctx.db, baseInput({ account: "   " }), { sendNotification });
    expect(result.outcome).toBe("invalid");
    expect(await ctx.db.select().from(earlyAccessSignup)).toHaveLength(0);
  });

  it("rejects a malformed email", async () => {
    const result = await submitEarlyAccess(ctx.db, baseInput({ email: "not-an-email" }), { sendNotification });
    expect(result.outcome).toBe("invalid");
  });

  it("rejects a frequency value outside the known options (tampered request)", async () => {
    const result = await submitEarlyAccess(ctx.db, baseInput({ frequency: "Every hour, nonstop" }), {
      sendNotification,
    });
    expect(result.outcome).toBe("invalid");
  });

  it("treats a second submission with the same normalized email as a duplicate, with a database-level unique constraint behind it", async () => {
    const first = await submitEarlyAccess(ctx.db, baseInput(), { sendNotification });
    expect(first.outcome).toBe("created");

    sendNotification.mockClear();
    const second = await submitEarlyAccess(ctx.db, baseInput({ email: "ORGANIZER@EXAMPLE.COM" }), {
      sendNotification,
    });
    expect(second.outcome).toBe("duplicate");
    expect(sendNotification).not.toHaveBeenCalled();

    const rows = await ctx.db.select().from(earlyAccessSignup);
    expect(rows).toHaveLength(1); // no second row, no row mutated
  });

  it("silently drops a honeypot-filled submission without persisting or notifying", async () => {
    const result = await submitEarlyAccess(ctx.db, baseInput({ honeypot: "http://spam.example" }), {
      sendNotification,
    });
    expect(result.outcome).toBe("dropped");
    expect(await ctx.db.select().from(earlyAccessSignup)).toHaveLength(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("marks notificationStatus as failed, without losing the signup, when sending throws an Error", async () => {
    const failingNotifier = vi.fn<SendNotification>().mockRejectedValue(new Error("Resend is down"));
    const result = await submitEarlyAccess(ctx.db, baseInput(), { sendNotification: failingNotifier });

    expect(result.outcome).toBe("created"); // the signup itself is NOT a failure
    const rows = await ctx.db.select().from(earlyAccessSignup);
    expect(rows).toHaveLength(1);
    expect(rows[0].notificationStatus).toBe("failed");
    expect(rows[0].notificationAttemptedAt).not.toBeNull();
  });

  it("marks notificationStatus as failed even when the rejection isn't an Error instance", async () => {
    // Regression guard: the catch block's `err instanceof Error` branch is
    // only for the log message — the DB status update itself must run
    // unconditionally for ANY thrown/rejected value, not just well-formed
    // Error objects (e.g. a provider SDK rejecting with a plain string/object).
    const failingNotifier = vi.fn<SendNotification>().mockRejectedValue("rate limited by provider");
    const result = await submitEarlyAccess(ctx.db, baseInput({ email: "other@example.com" }), {
      sendNotification: failingNotifier,
    });

    expect(result.outcome).toBe("created");
    const rows = await ctx.db.select().from(earlyAccessSignup);
    expect(rows).toHaveLength(1);
    expect(rows[0].notificationStatus).toBe("failed");
    expect(rows[0].notificationAttemptedAt).not.toBeNull();
  });
});
