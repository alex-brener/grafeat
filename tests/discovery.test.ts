import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db-test-utils";
import { createFakeMetaGraphClient } from "./fake-meta-graph";
import { runDiscovery, type DiscoveryChallengeInput } from "@/lib/discovery";
import { MetaGraphError } from "@/lib/meta-graph";
import { user, organization, challenge as challengeTable, submission } from "@/lib/db/schema";

function baseChallengeInput(overrides: Partial<DiscoveryChallengeInput> = {}): DiscoveryChallengeInput {
  return {
    id: "challenge-a",
    hashtag: "test",
    hashtagId: "hashtag-1",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    timezone: "UTC",
    discoveryCursor: null,
    discoverySweepCompletedAt: null,
    ...overrides,
  };
}

const FAR_FUTURE = Date.now() + 10 * 60 * 1000;

describe("runDiscovery", () => {
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
      hashtagId: "hashtag-1",
      requiredMention: "organizer",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      timezone: "UTC",
    });
  });

  it("refresh phase always fetches page 1 and upserts its items", async () => {
    const client = createFakeMetaGraphClient({
      pages: { page1: { items: [{ id: "m1", timestamp: "2026-10-16T12:00:00Z" }], nextAfter: null } },
    });
    const result = await runDiscovery(ctx.db, client, "ig-1", baseChallengeInput(), FAR_FUTURE);
    expect(result.newCandidates).toBe(1);
    expect(result.status).toBe("completed");

    const rows = await ctx.db.select().from(submission);
    expect(rows).toHaveLength(1);
    expect(rows[0].mediaId).toBe("m1");
    expect(rows[0].challengeLocalDay).toBe("2026-10-16");
    expect(rows[0].dateEligible).toBe(true);
    expect(rows[0].processingStatus).toBe("pending");
  });

  it("first-ever sync continues deep from page 1's own after cursor, not a no-op", async () => {
    const client = createFakeMetaGraphClient({
      pages: {
        page1: { items: [{ id: "m1", timestamp: "2026-10-16T12:00:00Z" }], nextAfter: "cursor-2" },
        "cursor-2": { items: [{ id: "m2", timestamp: "2026-10-17T12:00:00Z" }], nextAfter: "cursor-3" },
        "cursor-3": { items: [{ id: "m3", timestamp: "2026-10-18T12:00:00Z" }], nextAfter: null },
      },
    });
    const result = await runDiscovery(ctx.db, client, "ig-1", baseChallengeInput(), FAR_FUTURE);
    expect(result.pagesScanned).toBe(3);
    expect(result.newCandidates).toBe(3);
    expect(result.status).toBe("completed");

    const [row] = await ctx.db.select().from(challengeTable).where(eq(challengeTable.id, "challenge-a"));
    expect(row.discoveryCursor).toBeNull();
    expect(row.discoverySweepCompletedAt).not.toBeNull();
  });

  it("an in-progress sweep resumes from the saved discoveryCursor, skipping page 1's own deeper walk", async () => {
    let fetchedAfters: (string | null | undefined)[] = [];
    const client = createFakeMetaGraphClient({
      pages: {
        page1: { items: [{ id: "m1", timestamp: "2026-10-16T12:00:00Z" }], nextAfter: "cursor-2" }, // refresh phase always re-fetches this
        "cursor-5": { items: [{ id: "m5", timestamp: "2026-10-20T12:00:00Z" }], nextAfter: null },
      },
      onFetchRecentMedia: (after) => fetchedAfters.push(after),
    });
    const result = await runDiscovery(
      ctx.db,
      client,
      "ig-1",
      baseChallengeInput({ discoveryCursor: "cursor-5", discoverySweepCompletedAt: null }),
      FAR_FUTURE
    );
    expect(fetchedAfters).toEqual([undefined, "cursor-5"]); // refresh phase (page 1), then resumes from the saved cursor — never "cursor-2"
    expect(result.newCandidates).toBe(2); // m1 (refresh) + m5 (continue)
  });

  it("budget exhaustion mid-sweep saves the cursor for the next sync to resume", async () => {
    const client = createFakeMetaGraphClient({
      pages: {
        page1: { items: [], nextAfter: "cursor-2" },
      },
    });
    const pastDeadline = Date.now() - 1; // continue phase gets zero iterations
    const result = await runDiscovery(ctx.db, client, "ig-1", baseChallengeInput(), pastDeadline);
    expect(result.status).toBe("partial");
    expect(result.finalCursor).toBe("cursor-2");

    const [row] = await ctx.db.select().from(challengeTable).where(eq(challengeTable.id, "challenge-a"));
    expect(row.discoveryCursor).toBe("cursor-2");
    expect(row.discoverySweepCompletedAt).toBeNull();
  });

  it("a cursor-invalid error clears both fields, letting the next sync restart from page 1", async () => {
    const client = createFakeMetaGraphClient({
      pages: { page1: { items: [], nextAfter: "stale-cursor" } },
    });
    // Resuming an already-in-progress sweep whose saved cursor has expired.
    const errorClient = createFakeMetaGraphClient({
      pages: {},
      onFetchRecentMedia: (after) => {
        if (after === "stale-cursor") throw new MetaGraphError("cursor expired", "cursor_invalid", 400);
      },
    });
    const result = await runDiscovery(
      ctx.db,
      errorClient,
      "ig-1",
      baseChallengeInput({ discoveryCursor: "stale-cursor", discoverySweepCompletedAt: null }),
      FAR_FUTURE
    );
    expect(result.status).toBe("partial");

    const [row] = await ctx.db.select().from(challengeTable).where(eq(challengeTable.id, "challenge-a"));
    expect(row.discoveryCursor).toBeNull();
    expect(row.discoverySweepCompletedAt).toBeNull();
    void client; // unused placeholder kept for symmetry with the page map above
  });

  it("a recently completed sweep is left alone (continue phase is a no-op) until the interval elapses", async () => {
    const fetchedAfters: (string | null | undefined)[] = [];
    const client = createFakeMetaGraphClient({
      pages: { page1: { items: [], nextAfter: "cursor-x" } },
      onFetchRecentMedia: (after) => fetchedAfters.push(after),
    });
    const recentCompletion = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago, well under the 24h interval
    await runDiscovery(ctx.db, client, "ig-1", baseChallengeInput({ discoveryCursor: null, discoverySweepCompletedAt: recentCompletion }), FAR_FUTURE);
    expect(fetchedAfters).toEqual([undefined]); // only the refresh-phase page 1 call — no continue-phase call at all

    const [row] = await ctx.db.select().from(challengeTable).where(eq(challengeTable.id, "challenge-a"));
    expect(row.discoverySweepCompletedAt?.getTime()).toBe(recentCompletion.getTime()); // untouched
  });

  it("a sweep completed more than the interval ago starts a new deep sweep", async () => {
    const fetchedAfters: (string | null | undefined)[] = [];
    const client = createFakeMetaGraphClient({
      pages: {
        page1: { items: [], nextAfter: "cursor-y" },
        "cursor-y": { items: [{ id: "m9", timestamp: "2026-10-16T12:00:00Z" }], nextAfter: null },
      },
      onFetchRecentMedia: (after) => fetchedAfters.push(after),
    });
    const staleCompletion = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago, past the 24h interval
    const result = await runDiscovery(
      ctx.db,
      client,
      "ig-1",
      baseChallengeInput({ discoveryCursor: null, discoverySweepCompletedAt: staleCompletion }),
      FAR_FUTURE
    );
    expect(fetchedAfters).toEqual([undefined, "cursor-y"]);
    expect(result.newCandidates).toBe(1);

    const [row] = await ctx.db.select().from(challengeTable).where(eq(challengeTable.id, "challenge-a"));
    expect(row.discoverySweepCompletedAt).not.toBeNull();
    expect(row.discoverySweepCompletedAt!.getTime()).toBeGreaterThan(staleCompletion.getTime());
  });

  it("re-scanning the same media across syncs refreshes eligibility but never touches processingStatus/reviewStatus", async () => {
    const client = createFakeMetaGraphClient({
      pages: { page1: { items: [{ id: "m1", caption: "first", timestamp: "2026-10-16T12:00:00Z" }], nextAfter: null } },
    });
    await runDiscovery(ctx.db, client, "ig-1", baseChallengeInput(), FAR_FUTURE);
    await ctx.db.update(submission).set({ processingStatus: "completed", mentionResult: "verified", reviewStatus: "selected" }).where(eq(submission.mediaId, "m1"));

    const client2 = createFakeMetaGraphClient({
      pages: { page1: { items: [{ id: "m1", caption: "updated caption", timestamp: "2026-10-16T12:00:00Z" }], nextAfter: null } },
    });
    const result = await runDiscovery(ctx.db, client2, "ig-1", baseChallengeInput({ hashtagId: "hashtag-1" }), FAR_FUTURE);
    expect(result.existingCandidates).toBe(1);
    expect(result.newCandidates).toBe(0);

    const rows = await ctx.db.select().from(submission);
    expect(rows).toHaveLength(1); // deduped, not a second row
    expect(rows[0].caption).toBe("updated caption"); // refreshed
    expect(rows[0].processingStatus).toBe("completed"); // untouched
    expect(rows[0].reviewStatus).toBe("selected"); // untouched
  });

  it("resolves and caches the hashtagId when the challenge doesn't have one yet", async () => {
    const client = createFakeMetaGraphClient({
      hashtagId: "resolved-id",
      pages: { page1: { items: [], nextAfter: null } },
    });
    await runDiscovery(ctx.db, client, "ig-1", baseChallengeInput({ hashtagId: null }), FAR_FUTURE);
    const [row] = await ctx.db.select().from(challengeTable).where(eq(challengeTable.id, "challenge-a"));
    expect(row.hashtagId).toBe("resolved-id");
  });

  it("propagates a token_invalid error as fatal, for the caller to stop the whole sync", async () => {
    const client = createFakeMetaGraphClient({
      pages: {},
      onFetchRecentMedia: () => {
        throw new MetaGraphError("expired", "token_invalid", 401);
      },
    });
    await expect(runDiscovery(ctx.db, client, "ig-1", baseChallengeInput(), FAR_FUTURE)).rejects.toThrow(MetaGraphError);
  });
});
