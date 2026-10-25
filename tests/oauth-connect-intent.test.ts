import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import { createConnectIntent, consumeConnectIntent } from "@/lib/oauth-connect-intent";
import { user, organization, oauthConnectIntent } from "@/lib/db/schema";

describe("oauth connect intent", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db.insert(user).values({ id: "user-a", name: "Alice", email: "alice@example.com" });
    await ctx.db.insert(organization).values({
      id: "org-a",
      name: "Alice's Workspace",
      slug: "alices-workspace",
      createdAt: new Date(),
    });
  });

  it("round-trips a valid intent", async () => {
    await createConnectIntent(ctx.db, {
      nonce: "nonce-1",
      userId: "user-a",
      organizationId: "org-a",
      provider: "facebook_login",
    });
    const result = await consumeConnectIntent(ctx.db, "nonce-1");
    expect(result).toEqual({ userId: "user-a", organizationId: "org-a", provider: "facebook_login" });
  });

  it("rejects a nonce that was never created (tampered state param)", async () => {
    const result = await consumeConnectIntent(ctx.db, "never-created");
    expect(result).toBeNull();
  });

  it("rejects replay — a nonce can only be consumed once", async () => {
    await createConnectIntent(ctx.db, {
      nonce: "nonce-2",
      userId: "user-a",
      organizationId: "org-a",
      provider: "instagram_login",
    });
    const first = await consumeConnectIntent(ctx.db, "nonce-2");
    const second = await consumeConnectIntent(ctx.db, "nonce-2");
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("rejects an expired intent", async () => {
    await ctx.db.insert(oauthConnectIntent).values({
      nonce: "nonce-expired",
      userId: "user-a",
      organizationId: "org-a",
      provider: "facebook_login",
      expiresAt: new Date(Date.now() - 1000), // already expired
    });
    const result = await consumeConnectIntent(ctx.db, "nonce-expired");
    expect(result).toBeNull();
  });
});
