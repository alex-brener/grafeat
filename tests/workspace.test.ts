import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import { assertWorkspaceMembership, ForbiddenError } from "@/lib/workspace";
import { user, organization, member } from "@/lib/db/schema";

describe("assertWorkspaceMembership", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    const now = new Date();

    await ctx.db.insert(user).values([
      { id: "user-a", name: "Alice", email: "alice@example.com" },
      { id: "user-b", name: "Bob", email: "bob@example.com" },
    ]);
    await ctx.db.insert(organization).values([
      { id: "org-a", name: "Alice's Workspace", slug: "alices-workspace", createdAt: now },
      { id: "org-b", name: "Bob's Workspace", slug: "bobs-workspace", createdAt: now },
    ]);
    await ctx.db.insert(member).values([
      { id: "mem-a", organizationId: "org-a", userId: "user-a", role: "owner", createdAt: now },
      { id: "mem-b", organizationId: "org-b", userId: "user-b", role: "owner", createdAt: now },
    ]);
  });

  it("allows a user to act on their own workspace", async () => {
    await expect(assertWorkspaceMembership(ctx.db, "user-a", "org-a")).resolves.toBeUndefined();
  });

  it("rejects a user acting on a workspace they don't belong to", async () => {
    await expect(assertWorkspaceMembership(ctx.db, "user-a", "org-b")).rejects.toThrow(ForbiddenError);
  });

  it("rejects a nonexistent workspace id", async () => {
    await expect(assertWorkspaceMembership(ctx.db, "user-a", "org-does-not-exist")).rejects.toThrow(
      ForbiddenError
    );
  });

  it("rejects a nonexistent user id", async () => {
    await expect(assertWorkspaceMembership(ctx.db, "user-does-not-exist", "org-a")).rejects.toThrow(
      ForbiddenError
    );
  });
});
