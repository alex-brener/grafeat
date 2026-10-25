import { and, eq, gt } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { oauthConnectIntent, type metaProviderEnum } from "@/lib/db/schema";

const INTENT_TTL_SECONDS = 600; // matches lib/oauth.ts's existing state-cookie lifetime

type MetaProvider = (typeof metaProviderEnum.enumValues)[number];

/**
 * Records "this authenticated user, acting on this workspace, started a
 * Meta connect flow with this nonce" — looked up at the callback so the
 * workspace a token gets attached to is never derived from anything an
 * attacker could put in the `state` query param itself.
 */
export async function createConnectIntent(
  db: AppDb,
  params: { nonce: string; userId: string; organizationId: string; provider: MetaProvider }
): Promise<void> {
  const expiresAt = new Date(Date.now() + INTENT_TTL_SECONDS * 1000);
  await db.insert(oauthConnectIntent).values({ ...params, expiresAt });
}

/**
 * Single-use, atomic: the row is deleted in the same statement that reads
 * it, so a replayed callback URL (same nonce reused) finds nothing the
 * second time, and an expired-but-not-yet-cleaned-up row is never returned.
 */
export async function consumeConnectIntent(
  db: AppDb,
  nonce: string
): Promise<{ userId: string; organizationId: string; provider: MetaProvider } | null> {
  const [row] = await db
    .delete(oauthConnectIntent)
    .where(and(eq(oauthConnectIntent.nonce, nonce), gt(oauthConnectIntent.expiresAt, new Date())))
    .returning();

  if (!row) return null;
  return { userId: row.userId, organizationId: row.organizationId, provider: row.provider };
}
