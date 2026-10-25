/** Same leniency as the pre-existing client-side check in EarlyAccessSection.tsx — kept in one place so client and server can't drift apart. */
export const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Case-insensitive dedup without altering what's actually a valid address — trim + lowercase only, no Gmail-style dot/plus stripping. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
