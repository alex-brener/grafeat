/**
 * Pure, dependency-free IANA timezone helpers — built on Intl only (no new
 * package). Needed because a challenge's date eligibility window is defined
 * in the organizer's timezone (date-only start/end dates), while Instagram's
 * publication timestamps are real UTC instants that must be compared against
 * that window without ever being mutated themselves.
 */

/** Full list of valid IANA zone names, for populating a <select>. */
export function listTimeZones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The UTC instant for a given wall-clock date+time in `timeZone`.
 *
 * Technique: format one real instant (`asUTC`) twice — once as it reads in
 * `timeZone`, once as it reads in UTC — then re-parse both wall-clock
 * strings with the platform's *local* Date parser. Because both strings go
 * through the identical (server-local) reinterpretation step, that step's
 * own offset cancels out of the difference, leaving exactly `timeZone`'s
 * UTC offset at that instant (DST-aware). This is correct regardless of
 * what timezone the Node process itself runs in. Only known edge case: a
 * date/time that falls inside the one-hour span of the *server's own* DST
 * transition could be off by up to an hour — irrelevant here since this
 * runs on Vercel/Node with TZ=UTC, which has no DST at all.
 */
function zonedWallClockToUTC(dateStr: string, timeStr: string, timeZone: string): Date {
  const asUTC = new Date(`${dateStr}T${timeStr}Z`);
  const tzString = asUTC.toLocaleString("en-US", { timeZone });
  const utcString = asUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const offsetMs = new Date(utcString).getTime() - new Date(tzString).getTime();
  return new Date(asUTC.getTime() + offsetMs);
}

/** The UTC instant corresponding to 00:00:00.000 on `dateStr` ("YYYY-MM-DD") in `timeZone`. */
export function startOfDayUTC(dateStr: string, timeZone: string): Date {
  return zonedWallClockToUTC(dateStr, "00:00:00.000", timeZone);
}

/** The UTC instant corresponding to 23:59:59.999 on `dateStr` in `timeZone`. */
export function endOfDayUTC(dateStr: string, timeZone: string): Date {
  return zonedWallClockToUTC(dateStr, "23:59:59.999", timeZone);
}

/**
 * The IANA-zone calendar date ("YYYY-MM-DD") that `instant` falls on when
 * read in `timeZone` — the forward direction of zonedWallClockToUTC, needed
 * to bucket a submission's real publishedAt instant into the challenge-
 * local day used for per-day processing budgets.
 */
export function toZonedDateString(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const lookup = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

/**
 * Whether a real publication instant falls within [startDate, endDate]
 * (inclusive, date-only) as experienced in `timeZone`. `publishedAt` itself
 * is never altered — only compared.
 */
export function isDateEligible(publishedAt: Date, startDate: string, endDate: string, timeZone: string): boolean {
  const start = startOfDayUTC(startDate, timeZone);
  const end = endOfDayUTC(endDate, timeZone);
  return publishedAt.getTime() >= start.getTime() && publishedAt.getTime() <= end.getTime();
}

/**
 * Whether a challenge-local publication day's grace period has elapsed —
 * the allocation engine's cutoff gate (Slice B revised decision): a day's
 * backlog only becomes allocatable once `now` is at least `graceHours`
 * past that day's end-of-day instant in `timeZone`.
 */
export function isGraceElapsed(localDay: string, timeZone: string, graceHours: number, now: Date = new Date()): boolean {
  const cutoff = endOfDayUTC(localDay, timeZone).getTime() + graceHours * 60 * 60 * 1000;
  return now.getTime() >= cutoff;
}

/**
 * Derived display status — "ended" is never stored (per Slice B decision):
 * draft stays draft regardless of date; active becomes "ended" for display
 * once `endDate` has passed in the challenge's timezone, but remains fully
 * accessible/syncable either way.
 */
export function deriveChallengeStatus(
  storedStatus: "draft" | "active",
  endDate: string,
  timeZone: string,
  now: Date = new Date()
): "draft" | "active" | "ended" {
  if (storedStatus === "draft") return "draft";
  return now.getTime() > endOfDayUTC(endDate, timeZone).getTime() ? "ended" : "active";
}
