import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { member } from "@/lib/db/schema";

export class ForbiddenError extends Error {
  constructor(message = "Not a member of this workspace") {
    super(message);
  }
}

/**
 * The one place that answers "is this user allowed to touch this workspace's
 * data?" — a direct membership-table lookup, not a client-supplied claim.
 * Every workspace-scoped route/query must call this with the organizationId
 * it's about to act on, even if that id came from the session's "active
 * organization" rather than a request body — a stale/forged session field
 * is exactly as untrustworthy as a raw client-supplied id.
 */
export async function assertWorkspaceMembership(
  db: AppDb,
  userId: string,
  organizationId: string
): Promise<void> {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (rows.length === 0) {
    throw new ForbiddenError();
  }
}
