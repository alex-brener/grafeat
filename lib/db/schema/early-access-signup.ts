import { pgTable, text, boolean, timestamp, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";

export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

/**
 * Public landing-page lead capture (app/landing/EarlyAccessSection.tsx) —
 * deliberately independent of the auth/organization tables (lib/db/schema/auth.ts):
 * a signup here isn't a Grafeat account, isn't tied to a workspace, and
 * exists before any of that machinery is relevant to the submitter.
 *
 * `email` stores the normalized (trimmed, lowercased) address — the unique
 * index enforces dedup at the database level, not just in application code,
 * so a race between two concurrent identical submissions can't create two
 * rows (see lib/early-access.ts's onConflictDoNothing upsert).
 */
export const earlyAccessSignup = pgTable(
  "early_access_signup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    account: text("account").notNull(),
    email: text("email").notNull(),
    frequency: text("frequency"),
    painPoint: text("pain_point"),
    wantsBeta: boolean("wants_beta").notNull().default(false),
    notificationStatus: notificationStatusEnum("notification_status").notNull().default("pending"),
    notificationAttemptedAt: timestamp("notification_attempted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("early_access_signup_email_uidx").on(table.email)]
);
