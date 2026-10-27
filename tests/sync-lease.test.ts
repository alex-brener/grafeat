import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import { acquireSyncLease, releaseSyncLease } from "@/lib/sync-lease";
import { user, organization, challenge, syncLease } from "@/lib/db/schema";

describe("sync lease", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let challengeId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db.insert(user).values({ id: "user-a", name: "Alice", email: "alice@example.com" });
    await ctx.db.insert(organization).values({ id: "org-a", name: "Alice's Workspace", slug: "alices-workspace", createdAt: new Date() });
    const [row] = await ctx.db
      .insert(challenge)
      .values({
        organizationId: "org-a",
        name: "Test Challenge",
        hashtag: "test",
        requiredMention: "organizer",
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        timezone: "UTC",
      })
      .returning({ id: challenge.id });
    challengeId = row.id;
  });

  it("acquires a fresh lease", async () => {
    const acquired = await acquireSyncLease(ctx.db, challengeId, "run-1");
    expect(acquired).toBe(true);
    const rows = await ctx.db.select().from(syncLease);
    expect(rows).toHaveLength(1);
    expect(rows[0].lockedBy).toBe("run-1");
  });

  it("refuses a second acquire while the first is still held", async () => {
    await acquireSyncLease(ctx.db, challengeId, "run-1");
    const second = await acquireSyncLease(ctx.db, challengeId, "run-2");
    expect(second).toBe(false);
  });

  it("release lets a new acquire succeed immediately", async () => {
    await acquireSyncLease(ctx.db, challengeId, "run-1");
    await releaseSyncLease(ctx.db, challengeId, "run-1");
    const second = await acquireSyncLease(ctx.db, challengeId, "run-2");
    expect(second).toBe(true);
  });

  it("an expired lease can be reacquired without an explicit release", async () => {
    await ctx.db.insert(syncLease).values({ challengeId, lockedUntil: new Date(Date.now() - 1000), lockedBy: "stale-run" });
    const acquired = await acquireSyncLease(ctx.db, challengeId, "run-2");
    expect(acquired).toBe(true);
    const rows = await ctx.db.select().from(syncLease);
    expect(rows[0].lockedBy).toBe("run-2");
  });

  it("release only removes the lease if the caller still holds it (no releasing someone else's lease)", async () => {
    await acquireSyncLease(ctx.db, challengeId, "run-1");
    await releaseSyncLease(ctx.db, challengeId, "run-2"); // not the holder
    const rows = await ctx.db.select().from(syncLease);
    expect(rows).toHaveLength(1);
    expect(rows[0].lockedBy).toBe("run-1");
  });
});
