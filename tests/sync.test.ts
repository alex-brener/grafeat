import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db-test-utils";
import { createFakeMetaGraphClient } from "./fake-meta-graph";
import { runSync } from "@/lib/sync";
import { acquireSyncLease } from "@/lib/sync-lease";
import { upsertMetaConnection } from "@/lib/meta-connection";
import { MetaGraphError } from "@/lib/meta-graph";
import { user, organization, challenge as challengeTable, metaConnection, syncRun, submission } from "@/lib/db/schema";

describe("runSync", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

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
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      timezone: "UTC",
    });
  });

  it("returns not_found for a nonexistent challenge", async () => {
    const result = await runSync(ctx.db, "no-such-id");
    expect(result.outcome).toBe("not_found");
  });

  it("returns not_connected when there's no facebook_login connection", async () => {
    const result = await runSync(ctx.db, "challenge-a");
    expect(result.outcome).toBe("not_connected");
  });

  it("runs discovery + processing end to end and records a completed sync_run", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    const result = await runSync(ctx.db, "challenge-a", () =>
      createFakeMetaGraphClient({
        pages: { page1: { items: [{ id: "m1", timestamp: "2020-01-01T12:00:00Z" }], nextAfter: null } },
        mentions: { m1: { outcome: "verified", data: { username: "p1", caption: null, mediaType: null, mediaUrl: null, thumbnailUrl: null, permalink: null } } },
      })
    );
    expect(result.outcome).toBe("synced");
    if (result.outcome === "synced") {
      expect(result.status).toBe("completed");
      expect(result.summary.newCandidates).toBe(1);
      expect(result.summary.completed).toBe(1);
    }

    const [run] = await ctx.db.select().from(syncRun);
    expect(run.status).toBe("completed");

    const [sub] = await ctx.db.select().from(submission);
    expect(sub.processingStatus).toBe("completed");
  });

  it("refuses to run while a lease is already held", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    await acquireSyncLease(ctx.db, "challenge-a", "someone-else");
    const result = await runSync(ctx.db, "challenge-a", () => createFakeMetaGraphClient({}));
    expect(result.outcome).toBe("already_running");
  });

  it("releases the lease after a successful sync, so a second sync can run", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    await runSync(ctx.db, "challenge-a", () => createFakeMetaGraphClient({ pages: { page1: { items: [], nextAfter: null } } }));
    const second = await runSync(ctx.db, "challenge-a", () => createFakeMetaGraphClient({ pages: { page1: { items: [], nextAfter: null } } }));
    expect(second.outcome).toBe("synced");
  });

  it("a rate-limited processing phase is a clean 'synced' outcome, not an error, with an actionable retry time, and leaves the connection untouched", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    await ctx.db.insert(submission).values({
      id: "s1",
      challengeId: "challenge-a",
      mediaId: "m1",
      publishedAt: new Date("2026-01-01T12:00:00Z"),
      challengeLocalDay: "2026-01-01",
      dateEligible: true,
    });

    const result = await runSync(ctx.db, "challenge-a", () =>
      createFakeMetaGraphClient({
        pages: { page1: { items: [], nextAfter: null } },
        mentions: { m1: new MetaGraphError("rate limited", "rate_limited", 429, 90) },
      })
    );

    expect(result.outcome).toBe("synced");
    if (result.outcome === "synced") {
      expect(result.status).toBe("partial");
      expect(result.rateLimitedUntil).toBeInstanceOf(Date);
    }

    const [connection] = await ctx.db.select().from(metaConnection);
    expect(connection.status).toBe("connected"); // a rate limit is not a connection problem — never mark it expired/error

    const [sub] = await ctx.db.select().from(submission);
    expect(sub.processingStatus).toBe("pending");
    expect(sub.retryCount).toBe(0);
  });

  it("on an expired token, marks the connection expired, records a failed sync_run, and asks for reconnection", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    const result = await runSync(ctx.db, "challenge-a", () =>
      createFakeMetaGraphClient({ onFetchRecentMedia: () => { throw new MetaGraphError("expired", "token_invalid", 401); } })
    );
    expect(result.outcome).toBe("reconnect_required");

    const [connection] = await ctx.db.select().from(metaConnection);
    expect(connection.status).toBe("expired");

    const [run] = await ctx.db.select().from(syncRun);
    expect(run.status).toBe("error");
  });

  it("on a missing-permissions error, marks the connection in error state and asks for reconnection", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    const result = await runSync(ctx.db, "challenge-a", () =>
      createFakeMetaGraphClient({ onFetchRecentMedia: () => { throw new MetaGraphError("missing scope", "permissions", 403); } })
    );
    expect(result.outcome).toBe("permissions_required");

    const [connection] = await ctx.db.select().from(metaConnection);
    expect(connection.status).toBe("error");
  });

  it("does not attempt a sync against a connection that's already marked expired", async () => {
    await upsertMetaConnection(ctx.db, { organizationId: "org-a", provider: "facebook_login", igUserId: "ig-1", username: "organizer", accessToken: "real-token", tokenExpiresAt: null });
    await ctx.db.update(metaConnection).set({ status: "expired" }).where(eq(metaConnection.organizationId, "org-a"));
    const result = await runSync(ctx.db, "challenge-a", () => createFakeMetaGraphClient({}));
    expect(result.outcome).toBe("not_connected");
  });
});
