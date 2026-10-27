import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import {
  getGallerySubmissions,
  getDiagnosticSummary,
  getDiagnosticSubmissions,
  GALLERY_PAGE_SIZE,
  DIAGNOSTIC_CATEGORIES,
  type DiagnosticCategory,
} from "@/lib/submission-gallery";
import { user, organization, challenge as challengeTable, submission } from "@/lib/db/schema";

async function insertSubmission(
  ctx: Awaited<ReturnType<typeof createTestDb>>,
  overrides: Partial<typeof submission.$inferInsert> & { id: string; mediaId: string; challengeId: string }
) {
  await ctx.db.insert(submission).values({
    publishedAt: new Date("2026-10-16T12:00:00Z"),
    challengeLocalDay: "2026-10-16",
    dateEligible: true,
    processingStatus: "completed",
    mentionResult: "verified",
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
    it("includes only completed + verified + date-eligible submissions, excluding every other state", async () => {
      await insertSubmission(ctx, { id: "s-gallery", mediaId: "m-gallery", challengeId: "challenge-a" });
      await insertSubmission(ctx, { id: "s-pending", mediaId: "m-pending", challengeId: "challenge-a", processingStatus: "pending", mentionResult: null });
      await insertSubmission(ctx, { id: "s-failed", mediaId: "m-failed", challengeId: "challenge-a", processingStatus: "error_permanent", mentionResult: null });
      await insertSubmission(ctx, { id: "s-notverified", mediaId: "m-notverified", challengeId: "challenge-a", mentionResult: "not_verified" });
      await insertSubmission(ctx, { id: "s-outsidedates", mediaId: "m-outsidedates", challengeId: "challenge-a", dateEligible: false });

      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", null);
      expect(result.outcome).toBe("ok");
      if (result.outcome !== "ok") return;
      expect(result.items.map((i) => i.id)).toEqual(["s-gallery"]);
      expect(result.nextCursor).toBeNull();
    });

    it("exposes creator, publication date, permalink, and review state on each item", async () => {
      await insertSubmission(ctx, {
        id: "s1",
        mediaId: "m1",
        challengeId: "challenge-a",
        creatorUsername: "artist1",
        permalink: "https://instagram.com/p/abc",
        publishedAt: new Date("2026-05-01T00:00:00Z"),
        reviewStatus: "selected",
      });
      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", null);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items[0]).toMatchObject({
        creatorUsername: "artist1",
        permalink: "https://instagram.com/p/abc",
        reviewStatus: "selected",
      });
      expect(result.items[0].publishedAt.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    });

    it("orders by publishedAt DESC, id DESC, breaking exact timestamp ties by id", async () => {
      const tiedAt = new Date("2026-06-01T00:00:00Z");
      await insertSubmission(ctx, { id: "tied-a", mediaId: "m-tied-a", challengeId: "challenge-a", publishedAt: tiedAt });
      await insertSubmission(ctx, { id: "tied-b", mediaId: "m-tied-b", challengeId: "challenge-a", publishedAt: tiedAt });
      await insertSubmission(ctx, { id: "tied-c", mediaId: "m-tied-c", challengeId: "challenge-a", publishedAt: tiedAt });
      await insertSubmission(ctx, { id: "newer", mediaId: "m-newer", challengeId: "challenge-a", publishedAt: new Date("2026-06-02T00:00:00Z") });

      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", null);
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.items.map((i) => i.id)).toEqual(["newer", "tied-c", "tied-b", "tied-a"]);
    });

    it("paginates at the page-size boundary, including a tie split exactly across pages, with no duplicates or gaps", async () => {
      // 47 submissions with distinct, strictly descending timestamps...
      const distinctValues = Array.from({ length: 47 }, (_, i) => ({
        id: `distinct-${String(i).padStart(2, "0")}`,
        mediaId: `m-distinct-${i}`,
        challengeId: "challenge-a",
        publishedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + (47 - i) * 60_000),
        challengeLocalDay: "2026-01-01",
        dateEligible: true,
        processingStatus: "completed" as const,
        mentionResult: "verified" as const,
      }));
      // ...plus 3 tied at the oldest timestamp, straddling the page-48 boundary.
      const tiedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
      const tiedValues = ["tied-a", "tied-b", "tied-c"].map((id) => ({
        id,
        mediaId: `m-${id}`,
        challengeId: "challenge-a",
        publishedAt: tiedAt,
        challengeLocalDay: "2026-01-01",
        dateEligible: true,
        processingStatus: "completed" as const,
        mentionResult: "verified" as const,
      }));
      await ctx.db.insert(submission).values([...distinctValues, ...tiedValues]);

      const page1 = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", null);
      if (page1.outcome !== "ok") throw new Error("expected ok");
      expect(page1.items).toHaveLength(GALLERY_PAGE_SIZE);
      expect(page1.nextCursor).not.toBeNull();
      // 47 distinct + the highest-id member of the tied trio (DESC id tiebreak).
      expect(page1.items[46].id).toBe("distinct-46");
      expect(page1.items[47].id).toBe("tied-c");

      const page2 = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", page1.nextCursor);
      if (page2.outcome !== "ok") throw new Error("expected ok");
      expect(page2.items.map((i) => i.id)).toEqual(["tied-b", "tied-a"]);
      expect(page2.nextCursor).toBeNull();

      const allIds = [...page1.items, ...page2.items].map((i) => i.id);
      expect(new Set(allIds).size).toBe(50); // no duplicates
      expect(allIds).toHaveLength(50); // and no gaps
    });

    it("rejects a malformed cursor instead of silently ignoring it", async () => {
      const result = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", "not-a-real-cursor");
      expect(result.outcome).toBe("invalid_cursor");
    });

    it("is workspace-scoped: a different organization cannot read this challenge's gallery", async () => {
      await insertSubmission(ctx, { id: "s1", mediaId: "m1", challengeId: "challenge-a" });
      const result = await getGallerySubmissions(ctx.db, "org-b", "challenge-a", null);
      expect(result.outcome).toBe("not_found");
    });

    it("never mixes submissions across two challenges/workspaces in one response", async () => {
      await insertSubmission(ctx, { id: "s-a", mediaId: "m-a", challengeId: "challenge-a" });
      await insertSubmission(ctx, { id: "s-b", mediaId: "m-b", challengeId: "challenge-b" });

      const resultA = await getGallerySubmissions(ctx.db, "org-a", "challenge-a", null);
      if (resultA.outcome !== "ok") throw new Error("expected ok");
      expect(resultA.items.map((i) => i.id)).toEqual(["s-a"]);

      const resultB = await getGallerySubmissions(ctx.db, "org-b", "challenge-b", null);
      if (resultB.outcome !== "ok") throw new Error("expected ok");
      expect(resultB.items.map((i) => i.id)).toEqual(["s-b"]);
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
      });
      await insertSubmission(ctx, {
        id: "d-techfail",
        mediaId: "m-techfail",
        challengeId: "challenge-a",
        processingStatus: "error_permanent",
        mentionResult: null,
        dateEligible: false,
      });
      await insertSubmission(ctx, {
        id: "d-notverified",
        mediaId: "m-notverified",
        challengeId: "challenge-a",
        processingStatus: "completed",
        mentionResult: "not_verified",
        dateEligible: false,
      });
      await insertSubmission(ctx, {
        id: "d-outside",
        mediaId: "m-outside",
        challengeId: "challenge-a",
        processingStatus: "completed",
        mentionResult: "verified",
        dateEligible: false,
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
      const result = await getDiagnosticSummary(ctx.db, "org-a", "challenge-a");
      if (result.outcome !== "ok") throw new Error("expected ok");
      expect(result.counts).toEqual({ pending: 1, technical_failure: 1, not_verified: 1, outside_dates: 1 });
    });

    it("excludes gallery-eligible submissions from every diagnostic category", async () => {
      for (const category of DIAGNOSTIC_CATEGORIES) {
        const result = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", category, null);
        if (result.outcome !== "ok") throw new Error("expected ok");
        expect(result.items.some((i) => i.id === "d-gallery")).toBe(false);
      }
    });

    it.each(DIAGNOSTIC_CATEGORIES.map((c) => [c, `d-${c === "technical_failure" ? "techfail" : c === "not_verified" ? "notverified" : c === "outside_dates" ? "outside" : "pending"}`]))(
      "category %s returns exactly its one matching submission",
      async (category, expectedId) => {
        const result = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", category as DiagnosticCategory, null);
        if (result.outcome !== "ok") throw new Error("expected ok");
        expect(result.items.map((i) => i.id)).toEqual([expectedId]);
      }
    );

    it("is workspace-scoped for both the summary and the per-category listing", async () => {
      const summary = await getDiagnosticSummary(ctx.db, "org-b", "challenge-a");
      expect(summary.outcome).toBe("not_found");
      const listing = await getDiagnosticSubmissions(ctx.db, "org-b", "challenge-a", "pending", null);
      expect(listing.outcome).toBe("not_found");
    });

    it("paginates a single category's backlog without loading it all into memory at once", async () => {
      const values = Array.from({ length: 52 }, (_, i) => ({
        id: `bulk-pending-${i}`,
        mediaId: `m-bulk-pending-${i}`,
        challengeId: "challenge-a",
        publishedAt: new Date(Date.UTC(2026, 1, 1, 0, 0, 0) + i * 60_000),
        challengeLocalDay: "2026-02-01",
        dateEligible: true,
        processingStatus: "pending" as const,
        mentionResult: null,
      }));
      await ctx.db.insert(submission).values(values);

      const page1 = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", "pending", null);
      if (page1.outcome !== "ok") throw new Error("expected ok");
      expect(page1.items.length).toBeLessThanOrEqual(50);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await getDiagnosticSubmissions(ctx.db, "org-a", "challenge-a", "pending", page1.nextCursor);
      if (page2.outcome !== "ok") throw new Error("expected ok");

      const allIds = new Set([...page1.items, ...page2.items].map((i) => i.id));
      expect(allIds.size).toBe(53); // 52 bulk + the one pre-seeded "d-pending"
    });
  });
});
