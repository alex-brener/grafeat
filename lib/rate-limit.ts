import { createHmac } from "crypto";
import { sql } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { rateLimitBucket } from "@/lib/db/schema";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS_PER_WINDOW = 5;
const RETENTION_MS = 24 * 60 * 60 * 1000; // stale buckets older than this are opportunistically dropped

/**
 * HMAC-SHA256, keyed by a dedicated secret (RATE_LIMIT_HASH_SECRET) — unlike
 * a plain unkeyed hash, this isn't practically reversible by brute-forcing
 * the IPv4 address space, since the attacker would also need the key.
 * Deliberately a separate env var from TOKEN_ENCRYPTION_KEY/BETTER_AUTH_SECRET:
 * this key only ever protects pseudonymized abuse counters, never real user
 * data, so it can be rotated or exposed without affecting anything else.
 */
function loadRateLimitSecret(): Buffer {
  const b64 = process.env.RATE_LIMIT_HASH_SECRET;
  if (!b64) {
    throw new Error(
      "RATE_LIMIT_HASH_SECRET is not set. Generate one with: openssl rand -base64 32 — see .env.example."
    );
  }
  return Buffer.from(b64, "base64");
}

function hashIp(ip: string, secret: Buffer = loadRateLimitSecret()): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

function currentWindowStart(now: Date = new Date()): Date {
  return new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
}

/**
 * Atomically increments this IP's counter for the current fixed window and
 * reports whether it's still within the allowed rate — a single
 * INSERT ... ON CONFLICT DO UPDATE statement, so concurrent requests from
 * the same IP can't race past each other between a read and a write.
 *
 * Call this before any validation/dedup logic runs, and unconditionally on
 * every request this guards — an invalid or duplicate submission is still
 * an attempt, and still counts.
 */
export async function checkAndIncrementRateLimit(
  db: AppDb,
  ip: string
): Promise<{ allowed: boolean; count: number }> {
  const ipHash = hashIp(ip);
  const windowStart = currentWindowStart();


  // Best-effort cleanup of old buckets. Cheap (tiny rows, rare large deletes),
  // and removes the need for a separate cron job just to bound this table's size.
  await db.delete(rateLimitBucket).where(sql`${rateLimitBucket.windowStart} < ${new Date(Date.now() - RETENTION_MS)}`);

  const [row] = await db
    .insert(rateLimitBucket)
    .values({ ipHash, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBucket.ipHash, rateLimitBucket.windowStart],
      set: { count: sql`${rateLimitBucket.count} + 1` },
    })
    .returning({ count: rateLimitBucket.count });

  return { allowed: row.count <= MAX_ATTEMPTS_PER_WINDOW, count: row.count };
}
