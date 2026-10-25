import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user, organization } from "./auth";
import { metaProviderEnum } from "./meta-connection";

/**
 * Correlates a Meta OAuth round-trip back to the authenticated user and
 * workspace that initiated it, without trusting anything decoded from the
 * `state` query param Meta echoes back (which an attacker can see/replay).
 * The nonce itself doubles as the primary key and as the existing CSRF
 * state-cookie value (lib/oauth.ts) — the callback looks up this row by
 * nonce, verifies it against the cookie as before, and additionally deletes
 * the row on first use so a captured callback URL can't be replayed to
 * attach a connection to a different session later.
 */
export const oauthConnectIntent = pgTable("oauth_connect_intent", {
  nonce: text("nonce").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  provider: metaProviderEnum("provider").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
