import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db-test-utils";
import { createFakeMetaGraphClient } from "./fake-meta-graph";
import { setSubmissionReviewStatus } from "@/lib/submission-review";
import { runSync } from "@/lib/sync";
import { upsertMetaConnection } from "@/lib/meta-connection";
import { user, organization, challenge as challengeTable, submission } from "@/lib/db/schema";

async function insertSubmission(
  ctx: Awaited<ReturnType<typeof createTestDb>>,
  overrides: Partial<typeof submission.$inferInsert> & { id: string; mediaId: string; challengeId: string }
) {
  await ctx.db.insert(submission).values({
    publishedAt: new Date("2026-10-16T12:00:00Z"),
    challengeLocalDay: "2026-10-16",
    dateEligible: true,
    processingStatus: "pending",
    ...overrides,
  });
}

describe("setSubmissionReviewStatus", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db.insert(user).values({ id: "user-a", name: "Alice", email: "alice@example.com" });
    await ctx.db.insert(organization).values({ id: "org-a", name: "Alice's Workspace", slug: "alices-workspace", createdAt: new Date() });
    await ctx.db.insert(organization).values({ id: "org-b", name: "Bob's Workspace", slug: "bobs-workspace", createdAt: new Date() });
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
    await ctx.db.insert(challengeTable).values({
      id: "challenge-b",
      organizationId: "org-b",
      name: "Other Workspace's Challenge",
      hashtag: "other",
      requiredMention: "other-organizer",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      timezone: "UTC",
    });
  });

  it("walks the full reversible decision cycle: unreviewed -> selected -> rejected -> unreviewed", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-a" });

    const toSelected = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", "selected");
    expect(toSelected).toEqual({ outcome: "updated", reviewStatus: "selected" });
    let [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("selected");

    const toRejected = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", "rejected");
    expect(toRejected).toEqual({ outcome: "updated", reviewStatus: "rejected" });
    [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("rejected");

    const undone = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", "unreviewed");
    expect(undone).toEqual({ outcome: "updated", reviewStatus: "unreviewed" });
    [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("unreviewed");
  });

  it("fails cleanly for a nonexistent submission id", async () => {
    const result = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "no-such-submission", "selected");
    expect(result).toEqual({ outcome: "not_found" });
  });

  it("fails cleanly when the submission belongs to a different challenge than the one named", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-b" });
    const result = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", "selected");
    expect(result).toEqual({ outcome: "not_found" });
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("unreviewed"); // untouched
  });

  it("fails cleanly when the challenge belongs to a different workspace than the caller's", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-a" });
    const result = await setSubmissionReviewStatus(ctx.db, "org-b", "challenge-a", "s1", "selected");
    expect(result).toEqual({ outcome: "not_found" });
    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("unreviewed"); // untouched — org-b's failed request never reaches org-a's row
  });

  it("is safe under two concurrent requests for the same submission — both succeed, final state is one of the two decisions, never corrupted", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-a" });

    const [r1, r2] = await Promise.all([
      setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", "selected"),
      setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", "rejected"),
    ]);
    expect(r1.outcome).toBe("updated");
    expect(r2.outcome).toBe("updated");

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(["selected", "rejected"]).toContain(row.reviewStatus);
  });

  it("handles a rapid back-and-forth sequence of decisions, always ending on the last one applied", async () => {
    await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-a" });

    const sequence: Array<"selected" | "rejected" | "unreviewed"> = ["selected", "rejected", "selected", "unreviewed", "rejected"];
    for (const decision of sequence) {
      const result = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", "s1", decision);
      expect(result).toEqual({ outcome: "updated", reviewStatus: decision });
    }

    const [row] = await ctx.db.select().from(submission).where(eq(submission.id, "s1"));
    expect(row.reviewStatus).toBe("rejected"); // the last decision in the sequence
  });

  it("preserves a curator's decision across a subsequent full sync (discovery re-upsert + processing)", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-1",
      username: "organizer",
      accessToken: "real-token",
      tokenExpiresAt: null,
    });

    // First sync: discovers and processes one submission to completed/verified.
    const firstSync = await runSync(ctx.db, "challenge-a", () =>
      createFakeMetaGraphClient({
        pages: { page1: { items: [{ id: "m1", timestamp: "2026-06-01T12:00:00Z" }], nextAfter: null } },
        mentions: { m1: { outcome: "verified", data: { username: "artist1", caption: "art", mediaType: "IMAGE", mediaUrl: "https://cdn.example/m1.jpg", thumbnailUrl: null, permalink: "https://instagram.com/p/m1" } } },
      })
    );
    expect(firstSync.outcome).toBe("synced");

    const [submittedRow] = await ctx.db.select().from(submission);
    expect(submittedRow.processingStatus).toBe("completed");

    const decision = await setSubmissionReviewStatus(ctx.db, "org-a", "challenge-a", submittedRow.id, "selected");
    expect(decision).toEqual({ outcome: "updated", reviewStatus: "selected" });

    // Second sync: discovery re-scans the same media (refreshing caption/
    // eligibility); processing has nothing pending left to do. Neither
    // phase may touch reviewStatus.
    const secondSync = await runSync(ctx.db, "challenge-a", () =>
      createFakeMetaGraphClient({
        pages: { page1: { items: [{ id: "m1", caption: "art (edited)", timestamp: "2026-06-01T12:00:00Z" }], nextAfter: null } },
      })
    );
    expect(secondSync.outcome).toBe("synced");

    const [afterSecondSync] = await ctx.db.select().from(submission).where(eq(submission.id, submittedRow.id));
    expect(afterSecondSync.reviewStatus).toBe("selected"); // preserved
    expect(afterSecondSync.caption).toBe("art (edited)"); // discovery still refreshed display fields
    expect(afterSecondSync.processingStatus).toBe("completed"); // preserved
  });
});
