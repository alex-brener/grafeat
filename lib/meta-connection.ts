import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { metaConnection, type metaProviderEnum } from "@/lib/db/schema";
import { encryptToken } from "@/lib/token-crypto";

type MetaProvider = (typeof metaProviderEnum.enumValues)[number];

/**
 * Upserts the one row per (organizationId, provider) — a reconnect replaces
 * the stored token/igUserId/expiry in place rather than creating a second
 * row, per the unique index in lib/db/schema/meta-connection.ts. The access
 * token is encrypted here, right before the only write path that persists
 * it — callers must never pass an already-encrypted value or store the
 * plaintext themselves.
 */
export async function upsertMetaConnection(
  db: AppDb,
  params: {
    organizationId: string;
    provider: MetaProvider;
    igUserId: string;
    /** Best-effort — a failed username lookup must never block the connection itself. */
    username: string | null;
    accessToken: string;
    tokenExpiresAt: Date | null;
  }
): Promise<void> {
  const encrypted = encryptToken(params.accessToken);

  await db
    .insert(metaConnection)
    .values({
      organizationId: params.organizationId,
      provider: params.provider,
      igUserId: params.igUserId,
      username: params.username,
      encryptedAccessToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenAuthTag: encrypted.authTag,
      tokenExpiresAt: params.tokenExpiresAt,
      status: "connected",
      lastVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [metaConnection.organizationId, metaConnection.provider],
      set: {
        igUserId: params.igUserId,
        username: params.username,
        encryptedAccessToken: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenAuthTag: encrypted.authTag,
        tokenExpiresAt: params.tokenExpiresAt,
        status: "connected",
        lastVerifiedAt: new Date(),
      },
    });
}

/** Workspace-scoped read of connection status — never returns the token. */
export async function getConnectionStatus(db: AppDb, organizationId: string, provider: MetaProvider) {
  const [row] = await db
    .select({
      provider: metaConnection.provider,
      igUserId: metaConnection.igUserId,
      username: metaConnection.username,
      status: metaConnection.status,
      tokenExpiresAt: metaConnection.tokenExpiresAt,
      lastVerifiedAt: metaConnection.lastVerifiedAt,
      updatedAt: metaConnection.updatedAt,
    })
    .from(metaConnection)
    .where(and(eq(metaConnection.organizationId, organizationId), eq(metaConnection.provider, provider)))
    .limit(1);
  return row ?? null;
}
