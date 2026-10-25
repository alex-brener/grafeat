import { auth } from "@/lib/auth";

/**
 * "Basic organizer workspace creation/selection" (Slice A scope) — a brand
 * new user has zero organizations until this runs once. Deliberately an
 * explicit, app-level step rather than a database hook wired into Better
 * Auth's internal user-creation pipeline: easier to reason about, easier to
 * make idempotent, and it's the same server-side session the rest of the
 * app already trusts, not a privileged internal callback.
 */
export async function ensureActiveWorkspace(headersList: Headers) {
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return null;

  const existing = await auth.api.listOrganizations({ headers: headersList });
  if (existing.length > 0) {
    if (!session.session.activeOrganizationId) {
      await auth.api.setActiveOrganization({
        headers: headersList,
        body: { organizationId: existing[0].id },
      });
    }
    return existing[0];
  }

  const slug = `ws-${session.user.id.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase()}-${Date.now().toString(36)}`;
  const created = await auth.api.createOrganization({
    headers: headersList,
    body: {
      name: `${session.user.name || session.user.email}'s Workspace`,
      slug,
    },
  });
  if (created) {
    await auth.api.setActiveOrganization({
      headers: headersList,
      body: { organizationId: created.id },
    });
  }
  return created;
}
