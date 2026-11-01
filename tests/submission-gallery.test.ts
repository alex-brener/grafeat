import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import {
  getGallerySubmissions,
  getDiagnosticSummary,
  getDiagnosticSubmissions,
  getSelectedSubmissions,
  getDayStats,
  getNotYetSampledCount,
  listChallengeDays,
  resolveDay,
  pickDefaultDay,
  GALLERY_PAGE_SIZE,
  DIAGNOSTIC_CATEGORIES,
  type DiagnosticCategory,
} from "@/lib/submission-gallery";
import { user, organization, challenge as challengeTable, submission } from "@/lib/db/schema";

// Well past any grace period, for every fixture below unless overridden.
const DAY = "2026-10-16";

async function insertSubmission(
  ctx: Awaited<ReturnType<typeof createTestDb>>,
  overrides: Partial<typeof submission.$inferInsert> & { id: string; mediaId: string; challengeId: string }
) {
  await ctx.db.insert(submission).values({
    publishedAt: new Date("2026-10-16T12:00:00Z"),
    challengeLocalDay: DAY,
    dateEligible: true,
    processingStatus: "completed",
    mentionResult: "verified",
    sampledForReview: true,
    ...overrides,
  });
}

describe("submission-gallery", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

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

  describe("getGallerySubmissions", () => {
    it("includes only sampled, completed + verified + date-eligible, non-rejected submissions for the given day", async () => {
      await insertSubmission(ctx, { id: "s-gallery", mediaId: "m-gallery", challengeId: "challenge-a" });
      await insertSubmission(ctx, { id: "s-pending", mediaId: "m-pending", challengeId: "challenge-a", processingStatus: "pending", mentionResult: null, sampledForReview: false });
      await insertSubmission(ctx, { id: "s-failed", mediaId: "m-failed", challengeId: "challenge-a", processingStatus: "error_permanent", mentionResult: null, sampledForReview: false });
      await insertSubmission(ctx, { id: "s-notverified", mediaId: "m-notverified", challengeId: "challenge-a", mentionResult: "not_verified", sampledForReview: false });
      await insertSubmission(ctx, { id: "s-outsidedates", mediaId: "m-outsidedates", challengeId: "challenge-a", dateEligible: false, sampledForReview: false });
      await insertSubmission(ctx, { id: "s-not-sampled", mediaId: "m-not-sampled", challengeId: "challenge-a", sampledForReview: false });
      await insertSubmission(ctx, { id: "s-rejected", mediaId: "m-rejected", challengeId: "challenge-a", reviewStatus: "rejected" });

      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", DAY, null);
      expect(result.outcome).toBe("ok");
      if (result.outcome !== "ok") return;
      expect(result.items.map((i) => i.id)).toEqual(["s-gallery"]);
      expect(result.nextCursor).toBeNull();
    });

    it("exposes creator, publication date, permalink, mention result, and review state on each item", async () => {
      await insertSubmission(ctx, {
        id: "s1",
        mediaId: "m1",
        challengeId: "challenge-a",
        creatorUsername: "artist1",
        permalink: "https://instagram.com/p/abc",
        publishedAt: new Date("2026-10-16T00:00:00Z"),
        reviewStatus: "selected",
      });
      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", DAY, null);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items[0]).toMatchObject({
        creatorUsername: "artist1",
        permalink: "https://instagram.com/p/abc",
        reviewStatus: "selected",
        mentionResult: "verified",
        dateEligible: true,
      });
      expect(result.items[0].publishedAt.toISOString()).toBe("2026-10-16T00:00:00.000Z");
    });

    it("orders by publishedAt DESC, id DESC, breaking exact timestamp ties by id", async () => {
      const tiedAt = new Date("2026-10-16T06:00:00Z");
      await insertSubmission(ctx, { id: "tied-a", mediaId: "m-tied-a", challengeId: "challenge-a", publishedAt: tiedAt });
      await insertSubmission(ctx, { id: "tied-b", mediaId: "m-tied-b", challengeId: "challenge-a", publishedAt: tiedAt });
      await insertSubmission(ctx, { id: "tied-c", mediaId: "m-tied-c", challengeId: "challenge-a", publishedAt: tiedAt });
      await insertSubmission(ctx, { id: "newer", mediaId: "m-newer", challengeId: "challenge-a", publishedAt: new Date("2026-10-16T18:00:00Z") });

      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", DAY, null);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items.map((i) => i.id)).toEqual(["newer", "tied-c", "tied-b", "tied-a"]);
    });

    it("paginates at the page-size boundary, including a tie split exactly across pages, with no duplicates or gaps", async () => {
      const pageDay = "2026-01-01";
      // 47 submissions with distinct, strictly descending timestamps...
      const distinctValues = Array.from({ length: 47 }, (_, i) => ({
        id: `distinct-${String(i).padStart(2, "0")}`,
        mediaId: `m-distinct-${i}`,
        challengeId: "challenge-a",
        publishedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + (47 - i) * 60_000),
        challengeLocalDay: pageDay,
        dateEligible: true,
        processingStatus: "completed" as const,
        mentionResult: "verified" as const,
        sampledForReview: true,
      }));
      // ...plus 3 tied at the oldest timestamp, straddling the page-48 boundary.
      const tiedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
      const tiedValues = ["tied-a", "tied-b", "tied-c"].map((id) => ({
        id,
        mediaId: `m-${id}`,
        challengeId: "challenge-a",
        publishedAt: tiedAt,
        challengeLocalDay: pageDay,
        dateEligible: true,
        processingStatus: "completed" as const,
        mentionResult: "verified" as const,
        sampledForReview: true,
      }));
      await ctx.db.insert(submission).values([...distinctValues, ...tiedValues]);

      const page1 = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", pageDay, null);
      if (page1.outcome !== "ok") throw new Error("expected ok");
      expect(page1.items).toHaveLength(GALLERY_PAGE_SIZE);
      expect(page1.nextCursor).not.toBeNull();
      // 47 distinct + the highest-id member of the tied trio (DESC id tiebreak).
      expect(page1.items[46].id).toBe("distinct-46");
      expect(page1.items[47].id).toBe("tied-c");

      const page2 = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", pageDay, page1.nextCursor);
      if (page2.outcome !== "ok") throw new Error("expected ok");
      expect(page2.items.map((i) => i.id)).toEqual(["tied-b", "tied-a"]);
      expect(page2.nextCursor).toBeNull();

      const allIds = [...page1.items, ...page2.items].map((i) => i.id);
      expect(new Set(allIds).size).toBe(50); // no duplicates
      expect(allIds).toHaveLength(50); // and no gaps
    });

    it("rejects a malformed cursor instead of silently ignoring it", async () => {
      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", DAY, "not-a-real-cursor");
      expect(result.outcome).toBe("invalid_cursor");
    });

    it("rejects a malformed day", async () => {
      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", "not-a-day", null);
      expect(result.outcome).toBe("invalid_day");
    });

    it("is workspace-scoped: a different organization cannot read this challenge's gallery", async () => {
      await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-a" });
      const result = await getGallerySubmissions(ctx.db, "org-b", "challenge-a", DAY, null);
      expect(result.outcome).toBe("not_found");
    });

    it("never mixes submissions across two challenges/workspaces in one response", async () => {
      await insertSubmission(ctx, { id: "s-a", mediaId: "m-a", challengeId: "challenge-a" });
      await insertSubmission(ctx, { id: "s-b", mediaId: "m-b", challengeId: "challenge-b" });

      const resultA = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", DAY, null);
      if (resultA.outcome !== "ok") throw new Error("expected ok");
      expect(resultA.items.map((i) => i.id)).toEqual(["s-a"]);

      const resultB = await getGallerySubmissions(ctx.db, "org-b", "challenge-b", DAY, null);
      if (resultB.outcome !== "ok") throw new Error("expected ok");
      expect(resultB.items.map((i) => i.id)).toEqual(["s-b"]);
    });

    it("keeps two challenge-local days fully isolated from each other", async () => {
      await insertSubmission(ctx, { id: "s-day1", mediaId: "m-day1", challengeId: "challenge-a", challengeLocalDay: "2026-01-01", publishedAt: new Date("2026-01-01T12:00:00Z") });
      await insertSubmission(ctx, { id: "s-day2", mediaId: "m-day2", challengeId: "challenge-a", challengeLocalDay: "2026-01-02", publishedAt: new Date("2026-01-02T12:00:00Z") });

      const day1Result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", "2026-01-01", null);
      if (day1Result.outcome !== "ok") throw new Error("expected ok");
      expect(day1Result.items.map((i) => i.id)).toEqual(["s-day1"]);

      const day2Result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", "2026-01-02", null);
      if (day2Result.outcome !== "ok") throw new Error("expected ok");
      expect(day2Result.items.map((i) => i.id)).toEqual(["s-day2"]);
    });
  });

  describe("diagnostics category precedence and counts", () => {
    beforeEach(async () => {
      // Each row is deliberately also dateEligible: false where possible, to
      // prove processing-status categories take precedence over "outside
      // dates" rather than both being true producing an ambiguous bucket.
      await insertSubmission(ctx, {
        id: "d-pending",
        mediaId: "m-pending",
        challengeId: "challenge-a",
        processingStatus: "pending",
        mentionResult: null,
        dateEligible: false,
        sampledForReview: false,
      });
      await insertSubmission(ctx, {
        id: "d-techfail",
        mediaId: "m-techfail",
        challengeId: "challenge-a",
        processingStatus: "error_permanent",
        mentionResult: null,
        dateEligible: false,
        sampledForReview: false,
      });
      await insertSubmission(ctx, {
        id: "d-notverified",
        mediaId: "m-notverified",
        challengeId: "challenge-a",
        processingStatus: "completed",
        mentionResult: "not_verified",
        dateEligible: false,
        sampledForReview: false,
      });
      await insertSubmission(ctx, {
        id: "d-outside",
        mediaId: "m-outside",
        challengeId: "challenge-a",
        processingStatus: "completed",
        mentionResult: "verified",
        dateEligible: false,
        sampledForReview: false,
      });
      await insertSubmission(ctx, {
        id: "d-rejected",
        mediaId: "m-rejected-diag",
        challengeId: "challenge-a",
        processingStatus: "completed",
        mentionResult: "verified",
        dateEligible: true,
        reviewStatus: "rejected",
      });
      await insertSubmission(ctx, {
        id: "d-gallery",
        mediaId: "m-gallery-exclusion-check",
        challengeId: "challenge-a",
        processingStatus: "completed",
        mentionResult: "verified",
        dateEligible: true,
      });
    });

    it("assigns exactly one category per submission, with processing status taking precedence over date eligibility", async () => {
      const result = await getDiagnosticSummary(ctx.db, "org-a", "challenge-a", DAY);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.counts).toEqual({ pending: 1, technical_failure: 1, not_verified: 1, outside_dates: 1, rejected: 1 });
    });

    it("excludes gallery-eligible (sampled, non-rejected) submissions from every diagnostic category", async () => {
      for (const category of DIAGNOSTIC_CATEGORIES) {
        const result = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", DAY, category, null);
        if (result.outcome !== "ok") throw new Error("expected ok");
        expect(result.items.some((i) => i.id === "d-gallery")).toBe(false);
      }
    });

    it.each(
      DIAGNOSTIC_CATEGORIES.map((c) => [
        c,
        c === "technical_failure" ? "d-techfail" : c === "not_verified" ? "d-notverified" : c === "outside_dates" ? "d-outside" : c === "rejected" ? "d-rejected" : "d-pending",
      ])
    )("category %s returns exactly its one matching submission", async (category, expectedId) => {
      const result = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", DAY, category as DiagnosticCategory, null);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items.map((i) => i.id)).toEqual([expectedId]);
    });

    it("is workspace-scoped for both the summary and the per-category listing", async () => {
      const summary = await getDiagnosticSummary(ctx.db, "org-b", "challenge-a", DAY);
      expect(summary.outcome).toBe("not_found");
      const listing = await getDiagnosticSubmissions(ctx.db, "org-b", "challenge-a", DAY, "pending", null);
      expect(listing.outcome).toBe("not_found");
    });

    it("paginates a single category's backlog without loading it all into memory at once", async () => {
      const values = Array.from({ length: 52 }, (_, i) => ({
        id: `bulk-pending-${i}`,
        mediaId: `m-bulk-pending-${i}`,
        challengeId: "challenge-a",
        publishedAt: new Date(Date.UTC(2026, 9, 16, 0, 0, 0) + i * 60_000),
        challengeLocalDay: DAY,
        dateEligible: true,
        processingStatus: "pending" as const,
        mentionResult: null,
        sampledForReview: false,
      }));
      await ctx.db.insert(submission).values(values);

      const page1 = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", DAY, "pending", null);
      if (page1.outcome !== "ok") throw new Error("expected ok");
      expect(page1.items.length).toBeLessThanOrEqual(50);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", DAY, "pending", page1.nextCursor);
      if (page2.outcome !== "ok") throw new Error("expected ok");

      const allIds = new Set([...page1.items, ...page2.items].map((i) => i.id));
      expect(allIds.size).toBe(53); // 52 bulk + the one pre-seeded "d-pending"
    });
  });

  describe("getSelectedSubmissions (tray)", () => {
    it("returns every selected item for the day, unpaginated, with no truncation", async () => {
      const values = Array.from({ length: 60 }, (_, i) => ({
        id: `selected-${i}`,
        mediaId: `m-selected-${i}`,
        challengeId: "challenge-a",
        publishedAt: new Date(Date.UTC(2026, 9, 16, 0, 0, 0) + i * 60_000),
        challengeLocalDay: DAY,
        dateEligible: true,
        processingStatus: "completed" as const,
        mentionResult: "verified" as const,
        sampledForReview: true,
        reviewStatus: "selected" as const,
      }));
      await ctx.db.insert(submission).values(values);
      await insertSubmission(ctx, { id: "not-selected", mediaId: "m-not-selected", challengeId: "challenge-a", reviewStatus: "unreviewed" });

      const result = await getSelectedSubmissions(ctx.db, "org-a", "challenge-a", DAY);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items).toHaveLength(60);
      expect(result.items.every((i) => i.reviewStatus === "selected")).toBe(true);
    });

    it("is day-isolated and workspace-scoped", async () => {
      await insertSubmission(ctx, { id: "s-day1", mediaId: "m-day1", challengeId: "challenge-a", reviewStatus: "selected" });
      await insertSubmission(ctx, { id: "s-day2", mediaId: "m-day2", challengeId: "challenge-a", challengeLocalDay: "2026-10-17", publishedAt: new Date("2026-10-17T12:00:00Z"), reviewStatus: "selected" });

      const result = await getSelectedSubmissions(ctx.db, "org-a", "challenge-a", DAY);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items.map((i) => i.id)).toEqual(["s-day1"]);

      const wrongOrg = await getSelectedSubmissions(ctx.db, "org-b", "challenge-a", DAY);
      expect(wrongOrg.outcome).toBe("not_found");
    });
  });

  describe("getDayStats", () => {
    it("reports honest, day-scoped counts across the discovery-to-selection pipeline", async () => {
      await insertSubmission(ctx, { id: "pending1", mediaId: "m-pending1", challengeId: "challenge-a", processingStatus: "pending", mentionResult: null, sampledForReview: false });
      await insertSubmission(ctx, { id: "notverified1", mediaId: "m-notverified1", challengeId: "challenge-a", mentionResult: "not_verified", sampledForReview: false });
      await insertSubmission(ctx, { id: "eligible1", mediaId: "m-eligible1", challengeId: "challenge-a" });
      await insertSubmission(ctx, { id: "eligible2", mediaId: "m-eligible2", challengeId: "challenge-a", reviewStatus: "selected" });

      const result = await getDayStats(ctx.db, "org-a", "challenge-a", DAY);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.stats).toEqual({ discovered: 4, completed: 3, eligible: 2, sampled: 2, selected: 1 });
    });

    it("is day-isolated and workspace-scoped", async () => {
      await insertSubmission(ctx, { id: "s-day1", mediaId: "m-day1", challengeId: "challenge-a" });
      await insertSubmission(ctx, { id: "s-day2", mediaId: "m-day2", challengeId: "challenge-a", challengeLocalDay: "2026-10-17", publishedAt: new Date("2026-10-17T12:00:00Z") });

      const result = await getDayStats(ctx.db, "org-a", "challenge-a", DAY);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.stats.discovered).toBe(1);

      const wrongOrg = await getDayStats(ctx.db, "org-b", "challenge-a", DAY);
      expect(wrongOrg.outcome).toBe("not_found");
    });
  });

  describe("getNotYetSampledCount", () => {
    it("counts only completed + verified + date-eligible + not-yet-sampled rows", async () => {
      await insertSubmission(ctx, { id: "not-sampled-1", mediaId: "m-ns1", challengeId: "challenge-a", sampledForReview: false });
      await insertSubmission(ctx, { id: "not-sampled-2", mediaId: "m-ns2", challengeId: "challenge-a", sampledForReview: false });
      await insertSubmission(ctx, { id: "sampled", mediaId: "m-sampled", challengeId: "challenge-a", sampledForReview: true });
      await insertSubmission(ctx, { id: "pending", mediaId: "m-pending-ns", challengeId: "challenge-a", processingStatus: "pending", mentionResult: null, sampledForReview: false });

      const result = await getNotYetSampledCount(ctx.db, "org-a", "challenge-a", DAY);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.count).toBe(2);

      const wrongOrg = await getNotYetSampledCount(ctx.db, "org-b", "challenge-a", DAY);
      expect(wrongOrg.outcome).toBe("not_found");
    });
  });

  describe("listChallengeDays / pickDefaultDay / resolveDay", () => {
    it("lists distinct days most-recent-first, each flagged with whether its grace period has elapsed", async () => {
      const today = new Date().toISOString().slice(0, 10);
      await insertSubmission(ctx, { id: "s-elapsed", mediaId: "m-elapsed", challengeId: "challenge-a", challengeLocalDay: "2026-01-01", publishedAt: new Date("2026-01-01T12:00:00Z") });
      await insertSubmission(ctx, { id: "s-today", mediaId: "m-today", challengeId: "challenge-a", challengeLocalDay: today, publishedAt: new Date() });

      const result = await listChallengeDays(ctx.db, "org-a", "challenge-a");
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.days.map((d) => d.day)).toEqual([today, "2026-01-01"]);
      expect(result.days.find((d) => d.day === "2026-01-01")?.graceElapsed).toBe(true);
      expect(result.days.find((d) => d.day === today)?.graceElapsed).toBe(false);

      expect(pickDefaultDay(result.days)).toBe("2026-01-01");
    });

    it("is workspace-scoped", async () => {
      const result = await listChallengeDays(ctx.db, "org-b", "challenge-a");
      expect(result.outcome).toBe("not_found");
    });

    it("resolveDay: an explicit day is used as-is (format-validated, not existence-validated)", async () => {
      const result = await resolveDay(ctx.db, "org-a", "challenge-a", "2026-03-15");
      expect(result).toEqual({ outcome: "ok", day: "2026-03-15" });
    });

    it("resolveDay: rejects a malformed explicit day", async () => {
      const result = await resolveDay(ctx.db, "org-a", "challenge-a", "not-a-day");
      expect(result.outcome).toBe("invalid_day");
    });

    it("resolveDay: reports no_day_available when the challenge has no grace-elapsed day yet", async () => {
      const result = await resolveDay(ctx.db, "org-a", "challenge-a", null);
      expect(result.outcome).toBe("no_day_available");
    });

    it("resolveDay: defaults to the latest grace-elapsed day when none is specified", async () => {
      await insertSubmission(ctx, { id: "s-elapsed", mediaId: "m-elapsed", challengeId: "challenge-a", challengeLocalDay: "2026-01-01", publishedAt: new Date("2026-01-01T12:00:00Z") });
      const result = await resolveDay(ctx.db, "org-a", "challenge-a", null);
      expect(result).toEqual({ outcome: "ok", day: "2026-01-01" });
    });

    it("resolveDay: not_found for a different workspace", async () => {
      const result = await resolveDay(ctx.db, "org-b", "challenge-a", null);
      expect(result.outcome).toBe("not_found");
    });
  });
});
