import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Generic fixed-window rate-limit counter — currently used only by the
 * early-access form (lib/rate-limit.ts), but deliberately not named after
 * it, since the mechanism itself is reusable for any other public
 * unauthenticated endpoint that needs the same protection later.
 *
 * `ipHash` is a plain SHA-256 digest of the client IP (lib/rate-limit.ts),
 * never the raw address — this table exists specifically to count abusive
 * attempts without retaining who made them in a directly readable form.
 * The composite primary key (ipHash, windowStart) is what makes the
 * increment in lib/rate-limit.ts a single atomic INSERT ... ON CONFLICT
 * DO UPDATE statement rather than a read-then-write race.
 */
export const rateLimitBucket = pgTable(
  "rate_limit_bucket",
  {
    ipHash: text("ip_hash").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.ipHash, table.windowStart] })]
);
