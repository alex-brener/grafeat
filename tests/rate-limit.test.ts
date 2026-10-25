import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";
import { checkAndIncrementRateLimit } from "@/lib/rate-limit";
import { rateLimitBucket } from "@/lib/db/schema";

describe("checkAndIncrementRateLimit", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(() => {
    process.env.RATE_LIMIT_HASH_SECRET = Buffer.alloc(32, 3).toString("base64");
  });

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts under the threshold", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkAndIncrementRateLimit(ctx.db, "203.0.113.5");
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(i + 1);
    }
  });

  it("blocks once the threshold is exceeded within the same window", async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(ctx.db, "203.0.113.9");
    }
    const sixth = await checkAndIncrementRateLimit(ctx.db, "203.0.113.9");
    expect(sixth.allowed).toBe(false);
    expect(sixth.count).toBe(6);
  });

  it("tracks different IPs independently", async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(ctx.db, "203.0.113.1");
    }
    const otherIp = await checkAndIncrementRateLimit(ctx.db, "203.0.113.2");
    expect(otherIp.allowed).toBe(true);
    expect(otherIp.count).toBe(1);
  });

  it("resets once a new time window starts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(ctx.db, "203.0.113.3");
    }
    expect((await checkAndIncrementRateLimit(ctx.db, "203.0.113.3")).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:15:00.000Z")); // 15 min later — new 10-min window
    const afterWindow = await checkAndIncrementRateLimit(ctx.db, "203.0.113.3");
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.count).toBe(1);
  });

  it("never stores the raw IP address", async () => {
    await checkAndIncrementRateLimit(ctx.db, "203.0.113.42");
    const rows = await ctx.db.select().from(rateLimitBucket);
    expect(rows).toHaveLength(1);
    expect(rows[0].ipHash).not.toContain("203.0.113.42");
    expect(rows[0].ipHash).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 hex digest, not the address itself
  });

  it("throws a clear error when RATE_LIMIT_HASH_SECRET is missing", async () => {
    const original = process.env.RATE_LIMIT_HASH_SECRET;
    delete process.env.RATE_LIMIT_HASH_SECRET;
    await expect(checkAndIncrementRateLimit(ctx.db, "203.0.113.50")).rejects.toThrow(/RATE_LIMIT_HASH_SECRET/);
    process.env.RATE_LIMIT_HASH_SECRET = original;
  });

  it("is actually keyed — the same IP hashes differently under a different secret", async () => {
    await checkAndIncrementRateLimit(ctx.db, "203.0.113.60");
    const [firstRow] = await ctx.db.select().from(rateLimitBucket);

    const otherSecret = Buffer.alloc(32, 9).toString("base64"); // different from the suite-wide secret above
    const original = process.env.RATE_LIMIT_HASH_SECRET;
    process.env.RATE_LIMIT_HASH_SECRET = otherSecret;
    const { db: db2 } = await createTestDb();
    await checkAndIncrementRateLimit(db2, "203.0.113.60"); // same IP, different (fresh) db + different secret
    const [secondRow] = await db2.select().from(rateLimitBucket);
    process.env.RATE_LIMIT_HASH_SECRET = original;

    expect(secondRow.ipHash).not.toBe(firstRow.ipHash);
  });

  it("sums correctly under concurrent increments for the same IP", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => checkAndIncrementRateLimit(ctx.db, "203.0.113.77"))
    );
    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
