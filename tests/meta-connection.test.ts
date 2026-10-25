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
      accessToken: "token-old",
      tokenExpiresAt: null,
    });
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "facebook_login",
      igUserId: "ig-new",
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
      accessToken: "fb-token",
      tokenExpiresAt: null,
    });
    await upsertMetaConnection(ctx.db, {
      organizationId: "org-a",
      provider: "instagram_login",
      igUserId: "ig-instagram-namespace",
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
});
