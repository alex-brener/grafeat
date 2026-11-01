import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db-test-utils";
import { admitToReviewPool, type ReviewPoolChallengeInput } from "@/lib/review-pool";
import { user, organization, challenge as challengeTable, submission } from "@/lib/db/schema";

function baseChallenge(overrides: Partial<ReviewPoolChallengeInput> = {}): ReviewPoolChallengeInput {
  return { id: "challenge-a", timezone: "UTC", processingGracePeriodHours: 3, dailyReviewLimit: 200, ...overrides };
}

async function insertSubmission(
  ctx: Awaited<ReturnType<typeof createTestDb>>,
  overrides: Partial<typeof submission.$inferInsert> & { id: string; mediaId: string }
) {
  await ctx.db.insert(submission).values({
    challengeId: "challenge-a",
    publishedAt: new Date("2026-01-01T12:00:00Z"),
    challengeLocalDay: ELAPSED_DAY,
    dateEligible: true,
    processingStatus: "completed",
    mentionResult: "verified",
    ...overrides,
  });
}

// Well past any grace period, for the default fixtures below.
const ELAPSED_DAY = "2026-01-01";

describe("admitToReviewPool", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db.insert(user).values({ id: "user-a", name: "Alice", email: "alice@example.com" });
    await ctx.db.insert(organization).values({ id: "org-a", name: "Alice's Workspace", slug: "alices-workspace", createdAt: new Date() });
    await ctx.db.insert(challengeTable).values({
      id: "challenge-a",
      organizationId: "org-a",
      name: "Test Challenge",
      hashtag: "test",
      requiredMention: "organizer",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      timezone: "UTC",
    });
  });

  it("does not admit from a day whose grace period hasn't elapsed yet", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: today, publishedAt: new Date() });

    const result = await admitToReviewPool(ctx.db, baseChallenge());
    expect(result.admitted).toBe(0);

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.sampledForReview).toBe(false);
  });

  it("admits a verified, eligible, completed submission once grace has elapsed", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1" });

    const result = await admitToReviewPool(ctx.db, baseChallenge());
    expect(result.admitted).toBe(1);

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.sampledForReview).toBe(true);
  });

  it("does not admit submissions that are pending, not verified, outside dates, or permanently failed", async () => {
    await insertSubmission(ctx, { id: "s-pending", mediaId: "m-pending", processingStatus: "pending", mentionResult: null });
    await insertSubmission(ctx, { id: "s-not-verified", mediaId: "m-not-verified", mentionResult: "not_verified" });
    await insertSubmission(ctx, { id: "s-outside-dates", mediaId: "m-outside-dates", dateEligible: false });
    await insertSubmission(ctx, { id: "s-error", mediaId: "m-error", processingStatus: "error_permanent", mentionResult: null });

    const result = await admitToReviewPool(ctx.db, baseChallenge());
    expect(result.admitted).toBe(0);

    const rows = await ctx.db.select().from(submission).where(eq(submission.challengeId, "challenge-a"));
    expect(rows.every((r) => r.sampledForReview === false)).toBe(true);
  });

  it("admits by allocationRank ascending, never by publish time, and stops at dailyReviewLimit", async () => {
    await insertSubmission(ctx, { id: "s-early", mediaId: "m-early", publishedAt: new Date("2026-01-01T06:00:00Z"), allocationRank: 0.9 });
    await insertSubmission(ctx, { id: "s-late", mediaId: "m-late", publishedAt: new Date("2026-01-01T18:00:00Z"), allocationRank: 0.1 });
    await insertSubmission(ctx, { id: "s-mid", mediaId: "m-mid", publishedAt: new Date("2026-01-01T12:00:00Z"), allocationRank: 0.5 });

    const result = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 2 }));
    expect(result.admitted).toBe(2);

    const rows = await ctx.db.select().from(submission).where(eq(submission.challengeId, "challenge-a"));
    const sampled = rows.filter((r) => r.sampledForReview).map((r) => r.id);
    expect(sampled.sort()).toEqual(["s-late", "s-mid"].sort()); // lowest two allocationRank, despite publish order
    const notSampled = rows.find((r) => r.id === "s-early");
    expect(notSampled?.sampledForReview).toBe(false);
  });

  it("is idempotent: re-running against an already-full day admits nothing new", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1" });
    await insertSubmission(ctx, { id: "s2", mediaId: "m2" });

    const first = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 50 }));
    expect(first.admitted).toBe(2);

    const second = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 50 }));
    expect(second.admitted).toBe(0);
  });

  it("tops up admission on a later run once more candidates become eligible, without disturbing what's already admitted", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", allocationRank: 0.1 });
    const first = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 50 }));
    expect(first.admitted).toBe(1);

    // A later-arriving, lower-ranked candidate must never bump s1 out.
    await insertSubmission(ctx, { id: "s2", mediaId: "m2", allocationRank: 0.01 });
    const second = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 50 }));
    expect(second.admitted).toBe(1);

    const rows = await ctx.db.select().from(submission).where(eq(submission.challengeId, "challenge-a"));
    expect(rows.every((r) => r.sampledForReview)).toBe(true);
  });

  it("a decreased dailyReviewLimit never evicts already-admitted submissions", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1" });
    await insertSubmission(ctx, { id: "s2", mediaId: "m2" });
    await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 50 }));

    const result = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 1 }));
    expect(result.admitted).toBe(0);

    const rows = await ctx.db.select().from(submission).where(eq(submission.challengeId, "challenge-a"));
    expect(rows.every((r) => r.sampledForReview)).toBe(true); // both still sampled, despite limit now below count
  });

  it("keeps different challenge-local days fully isolated", async () => {
    await insertSubmission(ctx, { id: "s-day1", mediaId: "m-day1", challengeLocalDay: "2026-01-01", publishedAt: new Date("2026-01-01T12:00:00Z") });
    await insertSubmission(ctx, { id: "s-day2", mediaId: "m-day2", challengeLocalDay: "2026-01-02", publishedAt: new Date("2026-01-02T12:00:00Z") });

    const result = await admitToReviewPool(ctx.db, baseChallenge({ dailyReviewLimit: 1 }));
    expect(result.admitted).toBe(2); // each day gets its own independent limit

    const rows = await ctx.db.select().from(submission).where(eq(submission.challengeId, "challenge-a"));
    expect(rows.every((r) => r.sampledForReview)).toBe(true);
  });
});
