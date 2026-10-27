import { describe, expect, it } from "vitest";
import {
  startOfDayUTC,
  endOfDayUTC,
  toZonedDateString,
  isDateEligible,
  isGraceElapsed,
  deriveChallengeStatus,
  isValidTimeZone,
  listTimeZones,
} from "@/lib/timezone";

describe("startOfDayUTC / endOfDayUTC", () => {
  it("UTC zone is a no-op", () => {
    expect(startOfDayUTC("2026-10-16", "UTC").toISOString()).toBe("2026-10-16T00:00:00.000Z");
    expect(endOfDayUTC("2026-10-16", "UTC").toISOString()).toBe("2026-10-16T23:59:59.999Z");
  });

  it("America/New_York in EDT (UTC-4, before Nov 1 2026 DST end)", () => {
    // Midnight Eastern on Oct 16 2026 (EDT) is 04:00 UTC.
    expect(startOfDayUTC("2026-10-16", "America/New_York").toISOString()).toBe("2026-10-16T04:00:00.000Z");
  });

  it("America/New_York in EST (UTC-5, after Nov 1 2026 DST end)", () => {
    // Midnight Eastern on Dec 16 2026 (EST) is 05:00 UTC.
    expect(startOfDayUTC("2026-12-16", "America/New_York").toISOString()).toBe("2026-12-16T05:00:00.000Z");
  });

  it("a zone ahead of UTC (Asia/Tokyo, UTC+9, no DST)", () => {
    // Midnight Tokyo on Oct 16 2026 is 2026-10-15T15:00:00Z.
    expect(startOfDayUTC("2026-10-16", "Asia/Tokyo").toISOString()).toBe("2026-10-15T15:00:00.000Z");
  });

  it("end of day is 23:59:59.999 in the zone, not UTC", () => {
    // 23:59:59.999 Eastern (EDT) on Oct 16 2026 is Oct 17 03:59:59.999 UTC.
    expect(endOfDayUTC("2026-10-16", "America/New_York").toISOString()).toBe("2026-10-17T03:59:59.999Z");
  });
});

describe("toZonedDateString", () => {
  it("UTC zone is a no-op", () => {
    expect(toZonedDateString(new Date("2026-10-16T12:00:00Z"), "UTC")).toBe("2026-10-16");
  });

  it("a zone behind UTC can shift the calendar date back", () => {
    // 2026-10-16T02:00:00Z is still Oct 15 evening in America/New_York (EDT, UTC-4).
    expect(toZonedDateString(new Date("2026-10-16T02:00:00Z"), "America/New_York")).toBe("2026-10-15");
  });

  it("a zone ahead of UTC can shift the calendar date forward", () => {
    // 2026-10-16T20:00:00Z is already Oct 17 morning in Asia/Tokyo (UTC+9).
    expect(toZonedDateString(new Date("2026-10-16T20:00:00Z"), "Asia/Tokyo")).toBe("2026-10-17");
  });

  it("round-trips with startOfDayUTC across a DST transition", () => {
    const day = "2026-11-01"; // America/New_York falls back to EST on this date in 2026.
    expect(toZonedDateString(startOfDayUTC(day, "America/New_York"), "America/New_York")).toBe(day);
  });
});

describe("isGraceElapsed", () => {
  it("false right at end-of-day, before any grace has passed", () => {
    const atEndOfDay = endOfDayUTC("2026-10-16", "UTC");
    expect(isGraceElapsed("2026-10-16", "UTC", 3, atEndOfDay)).toBe(false);
  });

  it("false partway through the grace window", () => {
    const partway = new Date(endOfDayUTC("2026-10-16", "UTC").getTime() + 2 * 60 * 60 * 1000);
    expect(isGraceElapsed("2026-10-16", "UTC", 3, partway)).toBe(false);
  });

  it("true exactly at the grace cutoff", () => {
    const cutoff = new Date(endOfDayUTC("2026-10-16", "UTC").getTime() + 3 * 60 * 60 * 1000);
    expect(isGraceElapsed("2026-10-16", "UTC", 3, cutoff)).toBe(true);
  });

  it("true well after the grace cutoff", () => {
    const later = new Date(endOfDayUTC("2026-10-16", "UTC").getTime() + 10 * 60 * 60 * 1000);
    expect(isGraceElapsed("2026-10-16", "UTC", 3, later)).toBe(true);
  });

  it("respects the challenge's own timezone, not UTC", () => {
    // 2026-10-17T03:00:00Z is the Nov-1-style example from the Slice B spec,
    // scaled to Oct 16: end-of-day Oct 16 in America/New_York (EDT, UTC-4)
    // is 2026-10-17T03:59:59.999Z, so 3h later is 2026-10-17T06:59:59.999Z.
    const justBefore = new Date("2026-10-17T06:59:59.000Z");
    const justAfter = new Date("2026-10-17T07:00:00.000Z");
    expect(isGraceElapsed("2026-10-16", "America/New_York", 3, justBefore)).toBe(false);
    expect(isGraceElapsed("2026-10-16", "America/New_York", 3, justAfter)).toBe(true);
  });
});

describe("isDateEligible", () => {
  const start = "2026-10-01";
  const end = "2026-10-31";
  const tz = "America/New_York";

  it("accepts a timestamp inside the window", () => {
    expect(isDateEligible(new Date("2026-10-16T12:00:00Z"), start, end, tz)).toBe(true);
  });

  it("accepts the exact start boundary", () => {
    expect(isDateEligible(startOfDayUTC(start, tz), start, end, tz)).toBe(true);
  });

  it("accepts the exact end boundary", () => {
    expect(isDateEligible(endOfDayUTC(end, tz), start, end, tz)).toBe(true);
  });

  it("rejects one millisecond before the start boundary", () => {
    const justBefore = new Date(startOfDayUTC(start, tz).getTime() - 1);
    expect(isDateEligible(justBefore, start, end, tz)).toBe(false);
  });

  it("rejects one millisecond after the end boundary", () => {
    const justAfter = new Date(endOfDayUTC(end, tz).getTime() + 1);
    expect(isDateEligible(justAfter, start, end, tz)).toBe(false);
  });

  it("a timestamp near a UTC day boundary can be eligible/ineligible depending on timezone", () => {
    // 2026-10-01T02:00:00Z is Sep 30, 10pm in America/New_York (EDT) — before the window starts.
    const near = new Date("2026-10-01T02:00:00Z");
    expect(isDateEligible(near, start, end, "America/New_York")).toBe(false);
    expect(isDateEligible(near, start, end, "UTC")).toBe(true);
  });
});

describe("deriveChallengeStatus", () => {
  it("draft stays draft regardless of date", () => {
    const longPast = new Date("2000-01-01T00:00:00Z");
    expect(deriveChallengeStatus("draft", "1999-01-01", "UTC", longPast)).toBe("draft");
    const farFuture = new Date("2099-01-01T00:00:00Z");
    expect(deriveChallengeStatus("draft", "2099-12-31", "UTC", farFuture)).toBe("draft");
  });

  it("active becomes ended once the end date has passed in the challenge's timezone", () => {
    const justAfterEnd = new Date(endOfDayUTC("2026-10-31", "America/New_York").getTime() + 1000);
    expect(deriveChallengeStatus("active", "2026-10-31", "America/New_York", justAfterEnd)).toBe("ended");
  });

  it("active stays active until the end date passes", () => {
    const duringChallenge = new Date("2026-10-16T12:00:00Z");
    expect(deriveChallengeStatus("active", "2026-10-31", "America/New_York", duringChallenge)).toBe("active");
  });

  it("active stays active at the exact end-of-day boundary", () => {
    const atBoundary = endOfDayUTC("2026-10-31", "America/New_York");
    expect(deriveChallengeStatus("active", "2026-10-31", "America/New_York", atBoundary)).toBe("active");
  });
});

describe("timezone validation", () => {
  it("accepts well-known IANA zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Asia/Tokyo")).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(isValidTimeZone("Not/A_Zone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("listTimeZones returns a non-trivial list including common zones", () => {
    // "UTC" itself is deliberately not asserted here: it's a valid zone
    // (isValidTimeZone("UTC") above confirms that), but ICU's canonical
    // enumeration doesn't list it under that bare name — the challenge
    // form prepends "UTC" to this list manually rather than relying on it
    // being enumerated.
    const zones = listTimeZones();
    expect(zones.length).toBeGreaterThan(100);
    expect(zones).toContain("America/New_York");
    expect(zones).toContain("Asia/Tokyo");
  });
});
