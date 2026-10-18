import { promises as fs } from "fs";
import path from "path";

const SECRET_KEYS = new Set([
  "access_token",
  "client_secret",
  "app_secret",
  "code",
  "verify_token",
  "hub.verify_token",
]);

/** Deep-redacts known secret-bearing keys so logs/fixtures are safe to persist or commit. */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => redact(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k)) {
        out[k] = typeof v === "string" ? `${v.slice(0, 6)}…REDACTED` : "REDACTED";
      } else {
        out[k] = redact(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}

export interface SpikeLogEntry {
  testCaseId: string;
  endpoint: string;
  method: string;
  apiVersion?: string;
  params?: unknown;
  status: number | string;
  response?: unknown;
  mediaId?: string;
  accountIds?: Record<string, string | undefined>;
  latencyMs?: number;
  result: "PASS" | "FAIL" | "PARTIAL" | "INFO";
  notes?: string;
}

/**
 * Section 23 logging. Always logs to console (captured by Vercel's log pipeline
 * in production). Also best-effort appends to logs/spike.log.jsonl, which only
 * persists when running locally — Vercel's deployed filesystem is read-only, so
 * in production the console/Vercel dashboard log is the source of truth. Copy
 * relevant redacted entries out by hand for SPIKE-RESULTS.md.
 */
export async function logEvent(entry: SpikeLogEntry): Promise<void> {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...redact(entry),
  });

  console.log(`[spike] ${line}`);

  try {
    const dir = path.join(process.cwd(), "logs");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, "spike.log.jsonl"), line + "\n", "utf8");
  } catch {
    // Read-only filesystem (e.g. deployed on Vercel) — console log above is authoritative.
  }
}

/**
 * Saves a redacted raw payload (webhook delivery, API response) as a fixture.
 * Same local-only persistence caveat as logEvent — see fixtures/README.md.
 */
export async function saveFixture(name: string, data: unknown): Promise<string> {
  const safe = redact(data);
  const filename = `${Date.now()}-${name.replace(/[^a-z0-9_-]/gi, "_")}.json`;

  console.log(`[spike:fixture] ${filename} ${JSON.stringify(safe)}`);

  try {
    const dir = path.join(process.cwd(), "fixtures");
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, JSON.stringify(safe, null, 2), "utf8");
    return filePath;
  } catch {
    return "(not persisted to disk — read-only filesystem; see console/Vercel logs)";
  }
}
