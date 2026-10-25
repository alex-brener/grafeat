import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Dialect-level type (not tied to the node-postgres driver specifically) so
 * that functions taking a `db` can also accept the PGlite-backed instance
 * tests use (tests/db-test-utils.ts) — both satisfy the same Postgres query
 * builder surface, only the underlying driver/QueryResultHKT differs.
 */
export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Lazily constructed so that `next build` (which imports route modules for
 * static analysis but never executes them) never needs a real DATABASE_URL.
 * The Pool itself doesn't connect until a query runs, but we still delay
 * reading the env var until first use so a missing/placeholder value during
 * build can't surface as a confusing error at import time.
 */
let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local and fill in a real Postgres connection string (see README/HANDOVER for the Neon setup steps)."
      );
    }
    _pool = new Pool({ connectionString });
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}
