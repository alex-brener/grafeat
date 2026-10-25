import { logEvent } from "@/lib/logger";

/**
 * Magic-link delivery. No email-provider account exists yet in this project,
 * so there is nothing to wire a real SDK up to — this calls Resend's plain
 * HTTP API (no SDK dependency) when RESEND_API_KEY/MAGIC_LINK_FROM_EMAIL are
 * set, and otherwise logs the link so local sign-in is testable without one.
 * Never log the full link in production without RESEND_API_KEY configured —
 * this fallback is for local development only.
 */
export async function sendMagicLinkEmail(data: { email: string; url: string; token: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAGIC_LINK_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    if (process.env.NODE_ENV === "production") {
      await logEvent({
        testCaseId: "auth.magic_link.send",
        endpoint: "(no provider configured)",
        method: "N/A",
        status: "FAIL",
        result: "FAIL",
        notes: "RESEND_API_KEY/MAGIC_LINK_FROM_EMAIL not set — magic link could not be delivered in production.",
      });
      throw new Error(
        "Email provider not configured. Set RESEND_API_KEY and MAGIC_LINK_FROM_EMAIL (see .env.example)."
      );
    }
    // Local dev fallback: no provider configured, so print the link to the
    // console instead of failing sign-in outright.
    console.log(`[dev-only magic link] ${data.email} -> ${data.url}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: data.email,
      subject: "Sign in to Grafeat",
      html: `<p>Click to sign in to Grafeat:</p><p><a href="${data.url}">${data.url}</a></p><p>This link expires in 5 minutes.</p>`,
    }),
  });

  await logEvent({
    testCaseId: "auth.magic_link.send",
    endpoint: "https://api.resend.com/emails",
    method: "POST",
    status: res.status,
    result: res.ok ? "PASS" : "FAIL",
  });

  if (!res.ok) {
    throw new Error(`Magic link email failed to send (status ${res.status})`);
  }
}

/**
 * Internal "someone signed up for early access" notification — recipient is
 * us, not the submitter (no confirmation email to subscribers yet, by
 * design). Always throws on any failure (missing config, network error, or
 * a non-ok Resend response) rather than branching on NODE_ENV like
 * sendMagicLinkEmail above: the caller (lib/early-access.ts) already treats
 * any thrown error here as "notification failed" and records that on the
 * already-persisted signup row — it never needs this function to decide
 * whether that failure is fatal, because for this call site it never is.
 */
export async function sendEarlyAccessNotification(data: {
  account: string;
  email: string;
  frequency: string | null;
  painPoint: string;
  wantsBeta: boolean;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAGIC_LINK_FROM_EMAIL; // doubles as the general outbound sender identity, not just magic-link's
  const notifyEmail = process.env.EARLY_ACCESS_NOTIFY_EMAIL;

  if (!apiKey || !fromEmail || !notifyEmail) {
    throw new Error(
      "Email provider not configured. Set RESEND_API_KEY, MAGIC_LINK_FROM_EMAIL, and EARLY_ACCESS_NOTIFY_EMAIL (see .env.example)."
    );
  }

  const lines = [
    `Account: ${data.account}`,
    `Email: ${data.email}`,
    `Frequency: ${data.frequency ?? "(not answered)"}`,
    `Wants beta: ${data.wantsBeta ? "yes" : "no"}`,
    `Pain point: ${data.painPoint || "(not answered)"}`,
  ];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: notifyEmail,
      subject: `New early-access signup: ${data.account}`,
      text: lines.join("\n"),
    }),
  });

  await logEvent({
    testCaseId: "early_access.notify.send",
    endpoint: "https://api.resend.com/emails",
    method: "POST",
    status: res.status,
    result: res.ok ? "PASS" : "FAIL",
  });

  if (!res.ok) {
    throw new Error(`Early-access notification failed to send (status ${res.status})`);
  }
}
