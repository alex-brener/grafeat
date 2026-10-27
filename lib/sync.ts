import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { challenge as challengeTable, metaConnection, syncRun } from "@/lib/db/schema";
import { decryptToken } from "@/lib/token-crypto";
import { createMetaGraphClient, MetaGraphError, type MetaGraphClient } from "@/lib/meta-graph";
import { acquireSyncLease, releaseSyncLease } from "@/lib/sync-lease";
import { runDiscovery } from "@/lib/discovery";
import { runProcessing } from "@/lib/processing";

// Leaves margin inside Vercel Hobby's ~300s function-execution ceiling for
// the lease update, sync_run finalization, and request/response overhead.
const SYNC_TIME_BUDGET_MS = 4 * 60 * 1000;

export interface SyncSummary {
  pagesScanned: number;
  itemsScanned: number;
  newCandidates: number;
  existingCandidates: number;
  attempted: number;
  completed: number;
  permanentFailures: number;
}

export type SyncOutcome =
  | { outcome: "synced"; status: "completed" | "partial" | "error"; summary: SyncSummary; errorMessage?: string; rateLimitedUntil?: Date }
  | { outcome: "already_running" }
  | { outcome: "not_found" }
  | { outcome: "not_connected" }
  | { outcome: "reconnect_required"; message: string }
  | { outcome: "permissions_required"; message: string };

/**
 * The one organizer-facing "Sync now" action — internally runs discovery
 * then processing/verification against the same lease and time budget.
 * Workspace ownership is the caller's responsibility (same division of
 * labor as lib/challenge.ts) — call this only after confirming the
 * challenge belongs to the caller's workspace.
 *
 * `createClient` defaults to the real Graph API implementation — tests
 * override it with a fake, the same injection point lib/discovery.ts and
 * lib/processing.ts take directly, so a full sync can be exercised without
 * any network call or global fetch mocking.
 */
export async function runSync(
  db: AppDb,
  challengeId: string,
  createClient: (accessToken: string) => MetaGraphClient = createMetaGraphClient
): Promise<SyncOutcome> {
  const [challenge] = await db.select().from(challengeTable).where(eq(challengeTable.id, challengeId)).limit(1);
  if (!challenge) return { outcome: "not_found" };

  const [connection] = await db
    .select()
    .from(metaConnection)
    .where(and(eq(metaConnection.organizationId, challenge.organizationId), eq(metaConnection.provider, "facebook_login")))
    .limit(1);
  if (!connection || connection.status !== "connected") return { outcome: "not_connected" };

  const lockedBy = crypto.randomUUID();
  const acquired = await acquireSyncLease(db, challengeId, lockedBy);
  if (!acquired) return { outcome: "already_running" };

  const deadline = Date.now() + SYNC_TIME_BUDGET_MS;
  const [run] = await db.insert(syncRun).values({ challengeId, status: "running" }).returning();

  try {
    const accessToken = decryptToken({
      ciphertext: connection.encryptedAccessToken,
      iv: connection.tokenIv,
      authTag: connection.tokenAuthTag,
    });
    const client = createClient(accessToken);

    const discoveryResult = await runDiscovery(
      db,
      client,
      connection.igUserId,
      {
        id: challenge.id,
        hashtag: challenge.hashtag,
        hashtagId: challenge.hashtagId,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        timezone: challenge.timezone,
        discoveryCursor: challenge.discoveryCursor,
        discoverySweepCompletedAt: challenge.discoverySweepCompletedAt,
      },
      deadline
    );

    const processingResult = await runProcessing(
      db,
      client,
      connection.igUserId,
      {
        id: challenge.id,
        timezone: challenge.timezone,
        processingGracePeriodHours: challenge.processingGracePeriodHours,
        dailyProcessingCapacity: challenge.dailyProcessingCapacity,
      },
      deadline
    );

    const status: "completed" | "partial" | "error" =
      discoveryResult.status === "error" || processingResult.status === "error"
        ? "error"
        : discoveryResult.status === "partial" || processingResult.status === "partial"
          ? "partial"
          : "completed";
    const errorMessage = discoveryResult.errorMessage ?? processingResult.errorMessage;
    const rateLimitedUntil = discoveryResult.rateLimitedUntil ?? processingResult.rateLimitedUntil;

    await db
      .update(syncRun)
      .set({
        status,
        cursor: discoveryResult.finalCursor,
        pagesScanned: discoveryResult.pagesScanned,
        itemsScanned: discoveryResult.itemsScanned,
        newCandidates: discoveryResult.newCandidates,
        existingCandidates: discoveryResult.existingCandidates,
        processedCount: processingResult.attempted,
        completedAt: new Date(),
        lastError: errorMessage ?? null,
      })
      .where(eq(syncRun.id, run.id));

    return {
      outcome: "synced",
      status,
      errorMessage,
      rateLimitedUntil,
      summary: {
        pagesScanned: discoveryResult.pagesScanned,
        itemsScanned: discoveryResult.itemsScanned,
        newCandidates: discoveryResult.newCandidates,
        existingCandidates: discoveryResult.existingCandidates,
        attempted: processingResult.attempted,
        completed: processingResult.completed,
        permanentFailures: processingResult.permanentFailures,
      },
    };
  } catch (err) {
    if (err instanceof MetaGraphError && err.kind === "token_invalid") {
      await db.update(metaConnection).set({ status: "expired" }).where(eq(metaConnection.id, connection.id));
      await db.update(syncRun).set({ status: "error", completedAt: new Date(), lastError: err.message }).where(eq(syncRun.id, run.id));
      return { outcome: "reconnect_required", message: err.message };
    }
    if (err instanceof MetaGraphError && err.kind === "permissions") {
      await db.update(metaConnection).set({ status: "error" }).where(eq(metaConnection.id, connection.id));
      await db.update(syncRun).set({ status: "error", completedAt: new Date(), lastError: err.message }).where(eq(syncRun.id, run.id));
      return { outcome: "permissions_required", message: err.message };
    }
    const message = err instanceof Error ? err.message : "Unknown sync error.";
    await db.update(syncRun).set({ status: "error", completedAt: new Date(), lastError: message }).where(eq(syncRun.id, run.id));
    throw err;
  } finally {
    await releaseSyncLease(db, challengeId, lockedBy);
  }
}
