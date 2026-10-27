import { beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { createTestDb } from "./db-test-utils";
import { createFakeMetaGraphClient } from "./fake-meta-graph";
import { runProcessing, type ProcessingChallengeInput } from "@/lib/processing";
import { MetaGraphError } from "@/lib/meta-graph";
import { user, organization, challenge as challengeTable, submission, processingBudget } from "@/lib/db/schema";

const FAR_FUTURE = Date.now() + 10 * 60 * 1000;

function baseChallenge(overrides: Partial<ProcessingChallengeInput> = {}): ProcessingChallengeInput {
  return { id: "challenge-a", timezone: "UTC", processingGracePeriodHours: 3, dailyProcessingCapacity: null, ...overrides };
}

async function insertSubmission(
  ctx: Awaited<ReturnType<typeof createTestDb>>,
  overrides: Partial<typeof submission.$inferInsert> & { id: string; mediaId: string }
) {
  await ctx.db.insert(submission).values({
    challengeId: "challenge-a",
    publishedAt: new Date("2026-10-16T12:00:00Z"),
    challengeLocalDay: "2026-10-16",
    dateEligible: true,
    ...overrides,
  });
}

// "Yesterday", well past any grace period, for the default fixtures below.
const ELAPSED_DAY = "2026-01-01";

describe("runProcessing", () => {
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

  it("does not process a day whose grace period hasn't elapsed yet", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: today, publishedAt: new Date() });
    const client = createFakeMetaGraphClient({ mentions: { m1: { outcome: "verified", data: { username: "p1", caption: null, mediaType: null, mediaUrl: null, thumbnailUrl: null, permalink: null } } } });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(result.attempted).toBe(0);

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.processingStatus).toBe("pending");
  });

  it("processes a day once its grace period has elapsed", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const client = createFakeMetaGraphClient({ mentions: { m1: { outcome: "verified", data: { username: "p1", caption: null, mediaType: null, mediaUrl: null, thumbnailUrl: null, permalink: null } } } });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(result.completed).toBe(1);

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.processingStatus).toBe("completed");
    expect(row.mentionResult).toBe("verified");
    expect(row.creatorUsername).toBe("p1");
  });

  it("selects candidates by allocationRank ascending, never by publish time", async () => {
    // Deliberately reversed: the earliest-published post gets the highest (last-picked) rank.
    await insertSubmission(ctx, { id: "s-early", mediaId: "m-early", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T06:00:00Z"), allocationRank: 0.9 });
    await insertSubmission(ctx, { id: "s-late", mediaId: "m-late", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T18:00:00Z"), allocationRank: 0.1 });

    const order: string[] = [];
    const client = createFakeMetaGraphClient({
      mentions: { "m-early": { outcome: "not_mentioned" }, "m-late": { outcome: "not_mentioned" } },
      onFetchMentionedMedia: (mediaId) => order.push(mediaId),
    });
    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(order).toEqual(["m-late", "m-early"]); // lower allocationRank first, despite publishing later
  });

  it("prioritizes the most recent eligible day over older backlog", async () => {
    await insertSubmission(ctx, { id: "s-old", mediaId: "m-old", challengeLocalDay: "2026-01-01", publishedAt: new Date("2026-01-01T12:00:00Z") });
    await insertSubmission(ctx, { id: "s-newer", mediaId: "m-newer", challengeLocalDay: "2026-01-02", publishedAt: new Date("2026-01-02T12:00:00Z") });

    const order: string[] = [];
    const client = createFakeMetaGraphClient({
      mentions: { "m-old": { outcome: "not_mentioned" }, "m-newer": { outcome: "not_mentioned" } },
      onFetchMentionedMedia: (mediaId) => order.push(mediaId),
    });
    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(order).toEqual(["m-newer", "m-old"]);
  });

  it("charges exactly one processing unit per completed evaluation, and respects a finite daily capacity", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z"), allocationRank: 0.1 });
    await insertSubmission(ctx, { id: "s2", mediaId: "m2", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z"), allocationRank: 0.2 });
    const client = createFakeMetaGraphClient({ mentions: { m1: { outcome: "not_mentioned" }, m2: { outcome: "not_mentioned" } } });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: 1 }), FAR_FUTURE);
    expect(result.completed).toBe(1);

    const [budget] = await ctx.db.select().from(processingBudget);
    expect(budget.consumed).toBe(1);

    const rows = await ctx.db.select().from(submission).orderBy(asc(submission.mediaId));
    const statuses = rows.map((r) => r.processingStatus);
    expect(statuses.filter((s) => s === "completed")).toHaveLength(1);
    expect(statuses.filter((s) => s === "pending")).toHaveLength(1); // left in backlog, not lost
  });

  it("NULL capacity processes every pending candidate — no implicit limit", async () => {
    for (let i = 0; i < 5; i++) {
      await insertSubmission(ctx, { id: `s${i}`, mediaId: `m${i}`, challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z"), allocationRank: i / 10 });
    }
    const client = createFakeMetaGraphClient({ mentions: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`m${i}`, { outcome: "not_mentioned" as const }])) });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: null }), FAR_FUTURE);
    expect(result.completed).toBe(5);

    const [budget] = await ctx.db.select().from(processingBudget);
    expect(budget.capacity).toBeNull();
    expect(budget.consumed).toBe(5);
  });

  it("is idempotent — running processing again against an already-fully-processed backlog charges nothing further", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const client = createFakeMetaGraphClient({ mentions: { m1: { outcome: "not_mentioned" } } });

    const first = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);
    expect(first.completed).toBe(1);

    const second = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);
    expect(second.attempted).toBe(0);
    expect(second.completed).toBe(0);

    const [budget] = await ctx.db.select().from(processingBudget);
    expect(budget.consumed).toBe(1); // not double-charged
  });

  it("a rate-limit response stops the run before attempting any other candidate, and never touches the candidate's own retry state", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z"), allocationRank: 0.1 });
    await insertSubmission(ctx, { id: "s2", mediaId: "m2", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z"), allocationRank: 0.2 });
    const attemptedIds: string[] = [];
    const client = createFakeMetaGraphClient({
      mentions: { m1: new MetaGraphError("rate limited", "rate_limited", 429, 60) },
      onFetchMentionedMedia: (mediaId) => attemptedIds.push(mediaId),
    });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);
    expect(attemptedIds).toEqual(["m1"]); // m2 never attempted — the run stopped entirely, not just skipped m1
    expect(result.status).toBe("partial");
    expect(result.rateLimitedUntil).toBeInstanceOf(Date);
    expect(result.rateLimitedUntil!.getTime()).toBeGreaterThan(Date.now() + 50 * 1000); // ~60s out, from Retry-After

    const rows = await ctx.db.select().from(submission).orderBy(asc(submission.mediaId));
    const rateLimitedCandidate = rows.find((r) => r.mediaId === "m1")!;
    // Connection-wide, not this candidate's fault — nothing about it changed.
    expect(rateLimitedCandidate.processingStatus).toBe("pending");
    expect(rateLimitedCandidate.retryCount).toBe(0);
    expect(rateLimitedCandidate.lastAttemptedAt).toBeNull();
    expect(rateLimitedCandidate.retryNotBeforeAt).toBeNull();
    expect(rows.find((r) => r.mediaId === "m2")!.processingStatus).toBe("pending"); // still available for later sync
  });

  it("defaults rateLimitedUntil to a conservative guess when Meta sends no Retry-After", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("rate limited", "rate_limited", 429, null) } });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);
    expect(result.rateLimitedUntil).toBeInstanceOf(Date);
    expect(result.rateLimitedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("a rate limit immediately followed by a retry on the next sync is unaffected — the candidate was never touched", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const rateLimitedClient = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("rate limited", "rate_limited", 429, 60) } });
    await runProcessing(ctx.db, rateLimitedClient, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);

    // A later sync (whenever the organizer runs it) finds the candidate exactly as eligible as before — no backoff was ever recorded against it.
    const laterClient = createFakeMetaGraphClient({ mentions: { m1: { outcome: "not_mentioned" } } });
    const later = await runProcessing(ctx.db, laterClient, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);
    expect(later.attempted).toBe(1);
    expect(later.completed).toBe(1);
  });

  it("honors Retry-After on a submission-specific transient failure as the later of the two deadlines — longer than the generic schedule", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    // retryCount 0 -> 1: generic schedule alone would allow a retry after 1 minute. Retry-After asks for 120s instead.
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("server busy", "transient", 503, 120) } });

    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.retryCount).toBe(1);
    expect(row.retryNotBeforeAt).not.toBeNull();
    expect(row.retryNotBeforeAt!.getTime()).toBeGreaterThan(Date.now() + 100 * 1000); // ~120s out, past the generic 1-minute schedule

    // Not yet eligible for retry even though the generic 1-minute schedule would have allowed it by now.
    const soonClient = createFakeMetaGraphClient({ onFetchMentionedMedia: () => { throw new Error("should not be called"); } });
    const soon = await runProcessing(ctx.db, soonClient, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(soon.attempted).toBe(0);

    // Once the Retry-After window has actually elapsed, it becomes eligible again.
    await ctx.db.update(submission).set({ retryNotBeforeAt: new Date(Date.now() - 1000) }).where(eq(submission.id, "s1"));
    const laterClient = createFakeMetaGraphClient({ mentions: { m1: { outcome: "not_mentioned" } } });
    const later = await runProcessing(ctx.db, laterClient, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(later.attempted).toBe(1);
  });

  it("a Retry-After shorter than the generic schedule never shortens the wait below the generic minimum", async () => {
    await insertSubmission(ctx, {
      id: "s1",
      mediaId: "m1",
      challengeLocalDay: ELAPSED_DAY,
      publishedAt: new Date("2026-01-01T12:00:00Z"),
      retryCount: 2, // generic schedule for retryCount 2->3 is 4 minutes
    });
    // Retry-After of 5 seconds is far shorter than the generic 4-minute floor for this retryCount.
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("server busy", "transient", 503, 5) } });

    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.retryNotBeforeAt).not.toBeNull();
    // The later of the two deadlines wins — the generic 4-minute floor, not the 5-second Retry-After.
    expect(row.retryNotBeforeAt!.getTime()).toBeGreaterThan(Date.now() + 3.5 * 60 * 1000);
  });

  it("clears a stale retryNotBeforeAt once a later attempt happens without a new Retry-After hint", async () => {
    await insertSubmission(ctx, {
      id: "s1",
      mediaId: "m1",
      challengeLocalDay: ELAPSED_DAY,
      publishedAt: new Date("2026-01-01T12:00:00Z"),
      retryNotBeforeAt: new Date(Date.now() - 1000), // elapsed, so this attempt is allowed to run
    });
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("boom", "transient", 500) } });
    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.retryNotBeforeAt).toBeNull(); // this failure carried no Retry-After hint, so any old one is cleared, not left stale
  });

  it("a technical failure (inaccessible media) is a permanent failure that charges no budget", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const client = createFakeMetaGraphClient({ mentions: { m1: { outcome: "inaccessible" } } });

    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge({ dailyProcessingCapacity: 10 }), FAR_FUTURE);
    expect(result.permanentFailures).toBe(1);
    expect(result.completed).toBe(0);

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.processingStatus).toBe("error_permanent");

    const budgetRows = await ctx.db.select().from(processingBudget);
    expect(budgetRows[0]?.consumed ?? 0).toBe(0);
  });

  it("a transient failure leaves the row pending (retryable), not a dead-end state", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("boom", "transient", 500) } });

    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.processingStatus).toBe("pending"); // still selectable by the exact same WHERE processing_status = 'pending' backlog query
    expect(row.retryCount).toBe(1);
  });

  it("a row still inside its backoff window is skipped, not re-attempted", async () => {
    await insertSubmission(ctx, {
      id: "s1",
      mediaId: "m1",
      challengeLocalDay: ELAPSED_DAY,
      publishedAt: new Date("2026-01-01T12:00:00Z"),
      retryCount: 1,
      lastAttemptedAt: new Date(), // just failed — 1-minute backoff hasn't elapsed
    });
    let called = false;
    const client = createFakeMetaGraphClient({ onFetchMentionedMedia: () => { called = true; } });
    const result = await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    expect(called).toBe(false);
    expect(result.attempted).toBe(0);
  });

  it("gives up after the retry cap, promoting to error_permanent with no budget charge", async () => {
    await insertSubmission(ctx, {
      id: "s1",
      mediaId: "m1",
      challengeLocalDay: ELAPSED_DAY,
      publishedAt: new Date("2026-01-01T12:00:00Z"),
      retryCount: 4,
      lastAttemptedAt: new Date(Date.now() - 60 * 60 * 1000), // long past any backoff window
    });
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("still failing", "transient", 500) } });

    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.retryCount).toBe(5);
    expect(row.processingStatus).toBe("error_permanent");

    const budgetRows = await ctx.db.select().from(processingBudget);
    expect(budgetRows[0]?.consumed ?? 0).toBe(0);
  });

  it("never touches reviewStatus", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z"), reviewStatus: "selected" });
    const client = createFakeMetaGraphClient({ mentions: { m1: { outcome: "verified", data: { username: "p1", caption: null, mediaType: null, mediaUrl: null, thumbnailUrl: null, permalink: null } } } });

    await runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("selected");
  });

  it("propagates token_invalid/permissions as fatal without incrementing the submission's retryCount", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeLocalDay: ELAPSED_DAY, publishedAt: new Date("2026-01-01T12:00:00Z") });
    const client = createFakeMetaGraphClient({ mentions: { m1: new MetaGraphError("expired", "token_invalid", 401) } });

    await expect(runProcessing(ctx.db, client, "ig-1", baseChallenge(), FAR_FUTURE)).rejects.toThrow(MetaGraphError);
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.retryCount).toBe(0); // connection-wide failure — never charged to this candidate
    expect(row.processingStatus).toBe("pending");
  });
});
