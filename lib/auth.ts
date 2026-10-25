import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { magicLink } from "better-auth/plugins/magic-link";
import { getDb } from "@/lib/db/client";
import { sendMagicLinkEmail } from "@/lib/email";
import * as schema from "@/lib/db/schema";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/**
 * One member per workspace for Slice A (membershipLimit: 1) — multi-member
 * teams are explicitly out of scope for this slice. allowUserToCreateOrganization
 * stays at its default (true): the app layer creates exactly one workspace
 * per new user right after their first sign-in (see app/api/workspace/bootstrap),
 * so in practice users never see an explicit "create organization" step yet.
 */
export const auth = betterAuth({
  baseURL: process.env.BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    organization({
      membershipLimit: 1,
    }),
    magicLink({
      sendMagicLink: sendMagicLinkEmail,
    }),
  ],
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
});
