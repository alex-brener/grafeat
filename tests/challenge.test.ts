import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import {
  normalizeHashtag,
  createChallenge,
  listChallenges,
  getChallenge,
  updateChallenge,
  type CreateChallengeInput,
} from "@/lib/challenge";
import { user, organization, challenge } from "@/lib/db/schema";

function baseInput(overrides: Partial<CreateChallengeInput> = {}): CreateChallengeInput {
  return {
    name: "Creative October 2026",
    hashtag: "#CreativeOctober2026",
    requiredMention: "the_calligrail",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    timezone: "America/New_York",
    ...overrides,
  };
}

describe("normalizeHashtag", () => {
  it("strips a leading #, trims, and lowercases", () => {
    expect(normalizeHashtag("  #CreativeOctober2026  ")).toBe("creativeoctober2026");
    expect(normalizeHashtag("creativeoctober2026")).toBe("creativeoctober2026");
  });
});

describe("createChallenge / listChallenges / getChallenge", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db.insert(user).values({ id: "user-a", name: "Alice", email: "alice@example.com" });
    await ctx.db.insert(organization).values([
      { id: "org-a", name: "Alice's Workspace", slug: "alices-workspace", createdAt: new Date() },
      { id: "org-b", name: "Bob's Workspace", slug: "bobs-workspace", createdAt: new Date() },
    ]);
  });

  it("creates a challenge with the normalized hashtag", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput());
    expect(result.outcome).toBe("created");

    const rows = await ctx.db.select().from(challenge);
    expect(rows).toHaveLength(1);
    expect(rows[0].hashtag).toBe("creativeoctober2026");
    expect(rows[0].status).toBe("draft");
    expect(rows[0].hashtagId).toBeNull();
  });

  it("rejects a missing name", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput({ name: "   " }));
    expect(result.outcome).toBe("invalid");
  });

  it("rejects an empty hashtag", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput({ hashtag: "   #   " }));
    expect(result.outcome).toBe("invalid");
  });

  it("rejects a hashtag with invalid characters", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput({ hashtag: "not a hashtag!" }));
    expect(result.outcome).toBe("invalid");
  });

  it("rejects an end date before the start date", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput({ startDate: "2026-10-31", endDate: "2026-10-01" }));
    expect(result.outcome).toBe("invalid");
  });

  it("rejects an invalid timezone", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput({ timezone: "Not/A_Zone" }));
    expect(result.outcome).toBe("invalid");
  });

  it("rejects a missing required mention (not connected)", async () => {
    const result = await createChallenge(ctx.db, "org-a", baseInput({ requiredMention: "" }));
    expect(result.outcome).toBe("invalid");
  });

  it("listChallenges only returns the requesting workspace's challenges", async () => {
    await createChallenge(ctx.db, "org-a", baseInput({ name: "Org A Challenge" }));
    await createChallenge(ctx.db, "org-b", baseInput({ name: "Org B Challenge" }));

    const aList = await listChallenges(ctx.db, "org-a");
    expect(aList).toHaveLength(1);
    expect(aList[0].name).toBe("Org A Challenge");

    const bList = await listChallenges(ctx.db, "org-b");
    expect(bList).toHaveLength(1);
    expect(bList[0].name).toBe("Org B Challenge");
  });

  it("getChallenge returns null for a challenge belonging to a different workspace", async () => {
    const created = await createChallenge(ctx.db, "org-a", baseInput());
    if (created.outcome !== "created") throw new Error("setup failed");

    const asOwner = await getChallenge(ctx.db, "org-a", created.id);
    expect(asOwner).not.toBeNull();

    const asOther = await getChallenge(ctx.db, "org-b", created.id);
    expect(asOther).toBeNull();
  });

  it("getChallenge returns null for a nonexistent id", async () => {
    const result = await getChallenge(ctx.db, "org-a", "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });
});

describe("updateChallenge", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let challengeId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db.insert(user).values({ id: "user-a", name: "Alice", email: "alice@example.com" });
    await ctx.db.insert(organization).values([
      { id: "org-a", name: "Alice's Workspace", slug: "alices-workspace", createdAt: new Date() },
      { id: "org-b", name: "Bob's Workspace", slug: "bobs-workspace", createdAt: new Date() },
    ]);
    const created = await createChallenge(ctx.db, "org-a", baseInput());
    if (created.outcome !== "created") throw new Error("setup failed");
    challengeId = created.id;
  });

  it("updates editable fields and leaves hashtag untouched", async () => {
    const result = await updateChallenge(ctx.db, "org-a", challengeId, {
      name: "Renamed Challenge",
      startDate: "2026-10-05",
      endDate: "2026-11-05",
      timezone: "UTC",
      status: "active",
    });
    expect(result.outcome).toBe("updated");

    const row = await getChallenge(ctx.db, "org-a", challengeId);
    expect(row?.name).toBe("Renamed Challenge");
    expect(row?.startDate).toBe("2026-10-05");
    expect(row?.timezone).toBe("UTC");
    expect(row?.status).toBe("active");
    expect(row?.hashtag).toBe("creativeoctober2026"); // unchanged — not an editable field
  });

  it("refuses to update a challenge belonging to a different workspace", async () => {
    const result = await updateChallenge(ctx.db, "org-b", challengeId, {
      name: "Hijacked",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      timezone: "UTC",
      status: "active",
    });
    expect(result.outcome).toBe("not_found");

    const row = await getChallenge(ctx.db, "org-a", challengeId);
    expect(row?.name).toBe("Creative October 2026"); // untouched
  });

  it("rejects an invalid update", async () => {
    const result = await updateChallenge(ctx.db, "org-a", challengeId, {
      name: "",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      timezone: "UTC",
      status: "active",
    });
    expect(result.outcome).toBe("invalid");
  });
});
