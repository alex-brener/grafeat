import { pgTable, text, timestamp, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization } from "./auth";

export const metaProviderEnum = pgEnum("meta_provider", ["facebook_login", "instagram_login"]);
export const metaConnectionStatusEnum = pgEnum("meta_connection_status", [
  "connected",
  "expired",
  "error",
  "disconnected",
]);

/**
 * One row per (organization, provider) — Facebook Login and Instagram Login
 * are kept as separate rows per workspace because they use two different
 * Instagram account-ID namespaces for the same underlying account
 * (SPIKE-RESULTS.md §3.1). Reconnecting the same provider updates this row
 * in place rather than creating a new one (see the unique index below).
 */
export const metaConnection = pgTable(
  "meta_connection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: metaProviderEnum("provider").notNull(),
    igUserId: text("ig_user_id").notNull(),
    // Nullable: a username lookup can fail independently of the connection
    // itself (Slice A.1) — the connection must still succeed, and existing
    // rows from before this column existed have no value to backfill.
    username: text("username"),
    // AES-256-GCM components — see lib/token-crypto.ts. Never store a raw token.
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    tokenIv: text("token_iv").notNull(),
    tokenAuthTag: text("token_auth_tag").notNull(),
    tokenExpiresAt: timestamp("token_expires_at"),
    status: metaConnectionStatusEnum("status").notNull().default("connected"),
    lastVerifiedAt: timestamp("last_verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("meta_connection_org_provider_uidx").on(table.organizationId, table.provider)]
);

export const metaConnectionRelations = relations(metaConnection, ({ one }) => ({
  organization: one(organization, {
    fields: [metaConnection.organizationId],
    references: [organization.id],
  }),
}));
