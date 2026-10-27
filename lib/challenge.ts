import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { challenge } from "@/lib/db/schema";
import { isValidTimeZone } from "@/lib/timezone";

/** "#CreativeOctober2026" / " creativeoctober2026 " / "creativeoctober2026" all normalize to the same value. */
export function normalizeHashtag(input: string): string {
  return input.trim().replace(/^#/, "").toLowerCase();
}

const NAME_MAX_LENGTH = 200;
const HASHTAG_MAX_LENGTH = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface CreateChallengeInput {
  name: string;
  hashtag: string;
  requiredMention: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

export type CreateChallengeResult =
  | { outcome: "created"; id: string }
  | { outcome: "invalid"; reason: string };

function validate(input: CreateChallengeInput): string | null {
  if (!input.name.trim()) return "Give the challenge a name.";
  if (input.name.trim().length > NAME_MAX_LENGTH) return "That name is too long.";

  const hashtag = normalizeHashtag(input.hashtag);
  if (!hashtag) return "Add a hashtag so Grafeat knows what to look for.";
  if (hashtag.length > HASHTAG_MAX_LENGTH) return "That hashtag is too long.";
  if (!/^[a-z0-9_]+$/.test(hashtag)) return "Hashtags can only contain letters, numbers, and underscores.";

  if (!input.requiredMention.trim()) return "A required mention is needed — connect Instagram first.";

  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) return "Use valid dates.";
  if (input.startDate > input.endDate) return "The end date must be on or after the start date.";

  if (!isValidTimeZone(input.timezone)) return "Choose a valid timezone.";

  return null;
}

/**
 * Workspace ownership is the caller's responsibility (assertWorkspaceMembership
 * against organizationId before calling this) — this function trusts the
 * organizationId it's given, same division of labor as upsertMetaConnection.
 */
export async function createChallenge(
  db: AppDb,
  organizationId: string,
  input: CreateChallengeInput
): Promise<CreateChallengeResult> {
  const reason = validate(input);
  if (reason) return { outcome: "invalid", reason };

  const [row] = await db
    .insert(challenge)
    .values({
      organizationId,
      name: input.name.trim(),
      hashtag: normalizeHashtag(input.hashtag),
      requiredMention: input.requiredMention.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone,
    })
    .returning({ id: challenge.id });

  return { outcome: "created", id: row.id };
}

/** Workspace-scoped — never returns a challenge belonging to a different organization. */
export async function listChallenges(db: AppDb, organizationId: string) {
  return db.select().from(challenge).where(eq(challenge.organizationId, organizationId)).orderBy(desc(challenge.createdAt));
}

/** Returns null both when the challenge doesn't exist AND when it belongs to a different workspace — same response either way, deliberately indistinguishable to the caller. */
export async function getChallenge(db: AppDb, organizationId: string, challengeId: string) {
  const [row] = await db
    .select()
    .from(challenge)
    .where(and(eq(challenge.id, challengeId), eq(challenge.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export interface UpdateChallengeInput {
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: "draft" | "active";
}

export type UpdateChallengeResult = { outcome: "updated" } | { outcome: "invalid"; reason: string } | { outcome: "not_found" };

/**
 * Hashtag is deliberately not editable after creation — once a sync has run
 * against it, changing it would orphan the cached hashtagId and any
 * already-discovered submissions. Keeping it immutable avoids that whole
 * class of ambiguity for the MVP rather than half-solving it.
 */
export async function updateChallenge(
  db: AppDb,
  organizationId: string,
  challengeId: string,
  input: UpdateChallengeInput
): Promise<UpdateChallengeResult> {
  if (!input.name.trim()) return { outcome: "invalid", reason: "Give the challenge a name." };
  if (input.name.trim().length > NAME_MAX_LENGTH) return { outcome: "invalid", reason: "That name is too long." };
  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) return { outcome: "invalid", reason: "Use valid dates." };
  if (input.startDate > input.endDate) return { outcome: "invalid", reason: "The end date must be on or after the start date." };
  if (!isValidTimeZone(input.timezone)) return { outcome: "invalid", reason: "Choose a valid timezone." };
  if (input.status !== "draft" && input.status !== "active") return { outcome: "invalid", reason: "Invalid status." };

  const result = await db
    .update(challenge)
    .set({
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      timezone: input.timezone,
      status: input.status,
    })
    .where(and(eq(challenge.id, challengeId), eq(challenge.organizationId, organizationId)))
    .returning({ id: challenge.id });

  return result.length > 0 ? { outcome: "updated" } : { outcome: "not_found" };
}
