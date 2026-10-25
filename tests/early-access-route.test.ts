import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "./db-test-utils";
import { createEarlyAccessHandler, type SendNotification } from "@/lib/early-access-handler";
import { rateLimitBucket, earlyAccessSignup } from "@/lib/db/schema";

function makeRequest(body: string, ip = "198.51.100.5"): NextRequest {
  return new NextRequest("http://localhost/api/early-access", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body,
  });
}

describe("POST /api/early-access — rate-limit-first composition", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let notify: ReturnType<typeof vi.fn<SendNotification>>;

  beforeAll(() => {
    process.env.RATE_LIMIT_HASH_SECRET = Buffer.alloc(32, 5).toString("base64");
  });

  beforeEach(async () => {
    ctx = await createTestDb();
    notify = vi.fn<SendNotification>().mockResolvedValue(undefined);
  });

  it("counts a malformed-JSON request toward the rate limit exactly once", async () => {
    const handler = createEarlyAccessHandler(ctx.db, notify);
    const res = await handler(makeRequest("{this is not valid json"));

    expect(res.status).toBe(400); // malformed body → empty fields → fails validation
    const buckets = await ctx.db.select().from(rateLimitBucket);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(1);
  });

  it("does not double-count a single valid submission", async () => {
    const handler = createEarlyAccessHandler(ctx.db, notify);
    const res = await handler(makeRequest(JSON.stringify({ account: "@test", email: "person@example.com" })));

    expect(res.status).toBe(200);
    const buckets = await ctx.db.select().from(rateLimitBucket);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(1); // exactly one increment for one request
    expect(await ctx.db.select().from(earlyAccessSignup)).toHaveLength(1);
  });

  it("mixes valid, invalid, and malformed requests into a single count per IP", async () => {
    const handler = createEarlyAccessHandler(ctx.db, notify);
    const ip = "198.51.100.8";

    await handler(makeRequest(JSON.stringify({ account: "@test", email: "a@example.com" }), ip)); // valid
    await handler(makeRequest(JSON.stringify({ account: "", email: "" }), ip)); // invalid
    await handler(makeRequest("not json at all", ip)); // malformed

    const buckets = await ctx.db.select().from(rateLimitBucket);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(3);
  });

  it("rejects with 429 once the limit is exceeded, and a malformed body never reaches validation at that point", async () => {
    const handler = createEarlyAccessHandler(ctx.db, notify);
    const ip = "198.51.100.9";

    for (let i = 0; i < 5; i++) {
      await handler(makeRequest(JSON.stringify({ account: "@t", email: `p${i}@example.com` }), ip));
    }
    const sixth = await handler(makeRequest("{still not valid json", ip));

    expect(sixth.status).toBe(429);
    const body = await sixth.json();
    expect(body.ok).toBe(false);
    // Confirms the 6th request was rejected at the rate-limit gate, not
    // because of its malformed body reaching validation.
    expect(await ctx.db.select().from(earlyAccessSignup)).toHaveLength(5);
  });

  it("tracks separate IPs independently through the full route", async () => {
    const handler = createEarlyAccessHandler(ctx.db, notify);
    for (let i = 0; i < 5; i++) {
      await handler(makeRequest(JSON.stringify({ account: "@t", email: `p${i}@example.com` }), "198.51.100.20"));
    }
    const otherIp = await handler(
      makeRequest(JSON.stringify({ account: "@t", email: "other@example.com" }), "198.51.100.21")
    );
    expect(otherIp.status).toBe(200);
  });
});
