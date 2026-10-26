import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";
import { upsertMetaConnection, getConnectionStatus } from "@/lib/meta-connection";
import { decryptToken } from "@/lib/token-crypto";
import { user, organization, metaConnection } from "@/lib/db/schema";

describe("meta connection persistence", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

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

  it("stores a connection with the token encrypted, not in plaintext", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-12345",
      username: null,
      accessToken: "EAABsbCS-real-looking-token-value",
      tokenExpiresAt: null,
    });

    const [row] = await ctx.db.select().from(metaConnection);
    expect(row.encryptedAccessToken).not.toContain("EAABsbCS");
    expect(decryptToken({ ciphertext: row.encryptedAccessToken, iv: row.tokenIv, authTag: row.tokenAuthTag })).toBe(
      "EAABsbCS-real-looking-token-value"
    );
  });

  it("reconnect updates the existing row instead of creating a second one", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-old",
      username: null,
      accessToken: "token-old",
      tokenExpiresAt: null,
    });
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-new",
      username: null,
      accessToken: "token-new",
      tokenExpiresAt: null,
    });

    const rows = await ctx.db.select().from(metaConnection);
    expect(rows).toHaveLength(1);
    expect(rows[0].igUserId).toBe("ig-new");
  });

  it("keeps facebook_login and instagram_login as separate rows for the same workspace", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-fb-namespace",
      username: null,
      accessToken: "fb-token",
      tokenExpiresAt: null,
    });
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "instagram_login",
      igUserId: "ig-instagram-namespace",
      username: null,
      accessToken: "ig-token",
      tokenExpiresAt: null,
    });

    const rows = await ctx.db.select().from(metaConnection);
    expect(rows).toHaveLength(2);
  });

  it("getConnectionStatus never includes token fields", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-12345",
      username: null,
      accessToken: "super-secret-token",
      tokenExpiresAt: null,
    });

    const status = await getConnectionStatus(ctx.db, "org-a", "facebook_login");
    expect(status).not.toBeNull();
    expect(JSON.stringify(status)).not.toContain("super-secret-token");
    expect(Object.keys(status!)).not.toContain("encryptedAccessToken");
  });

  it("returns null for a provider that was never connected", async () => {
    const status = await getConnectionStatus(ctx.db, "org-a", "instagram_login");
    expect(status).toBeNull();
  });

  it("persists and returns the username when the lookup succeeded", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-12345",
      username: "the_calligrail",
      accessToken: "token",
      tokenExpiresAt: null,
    });

    const status = await getConnectionStatus(ctx.db, "org-a", "facebook_login");
    expect(status?.username).toBe("the_calligrail");
  });

  it("allows a null username (graceful fallback when the lookup failed) without failing the connection", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "instagram_login",
      igUserId: "ig-67890",
      username: null,
      accessToken: "token",
      tokenExpiresAt: null,
    });

    const status = await getConnectionStatus(ctx.db, "org-a", "instagram_login");
    expect(status).not.toBeNull();
    expect(status?.username).toBeNull();
  });

  it("updates the username on reconnect", async () => {
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-12345",
      username: "old_handle",
      accessToken: "token-1",
      tokenExpiresAt: null,
    });
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-12345",
      username: "new_handle",
      accessToken: "token-2",
      tokenExpiresAt: null,
    });

    const status = await getConnectionStatus(ctx.db, "org-a", "facebook_login");
    expect(status?.username).toBe("new_handle");
  });
});
