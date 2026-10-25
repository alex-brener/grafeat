import { readFileSync, readdirSync } from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";

/**
 * Spins up a real (WASM, in-memory) Postgres instance and applies every
 * generated migration file, in filename order — so tests run against the
 * same schema/dialect production Neon Postgres will use, not a
 * hand-maintained test-only shape. Reads the directory rather than a single
 * hardcoded filename so this keeps working as more migrations are added.
 */
export async function createTestDb() {
  const client = new PGlite();
  const drizzleDir = path.resolve(import.meta.dirname, "../drizzle");
  const migrationFiles = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const migrationSql = readFileSync(path.join(drizzleDir, file), "utf8");
    // drizzle-kit separates statements with this marker; PGlite's exec() runs one statement at a time reliably.
    const statements = migrationSql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await client.exec(statement);
    }
  }

  const db = drizzle(client, { schema });
  return { db, client };
}
