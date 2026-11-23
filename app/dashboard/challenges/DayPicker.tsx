"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isGraceElapsed, toZonedDateString } from "@/lib/timezone";
import styles from "./DayPicker.module.css";

export interface DayPickerDay {
  day: string;
  graceElapsed: boolean;
}

export interface DayPickerProps {
  /** Days with at least one submission (from listChallengeDays) — authoritative for these days' graceElapsed status and for whether "empty" styling is needed. */
  daysWithData: DayPickerDay[];
  selectedDay: string;
  challengeStartDate: string;
  challengeEndDate: string;
  timezone: string;
  processingGracePeriodHours: number;
  onSelect: (day: string) => void;
  disabled?: boolean;
}

type CellStatus = "future" | "pending" | "available" | "available-empty";

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function daysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 2000) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

/**
 * Challenge-day-based picker (not a free-form date input) — new
 * functionality per the UX-A visual-parity + day-navigation prompt. The
 * demo's own "Day N of M ▾" affordance has no working picker behind it
 * (confirmed by reading CuratorHeader.tsx) and no real day-to-day fixture
 * variation to navigate between, so this is net-new, real-app-only logic,
 * not an extraction.
 *
 * Grace-period/eligibility math reuses lib/timezone.ts's isGraceElapsed
 * directly (it's pure Intl/Date, no server-only dependency) rather than
 * reimplementing it — the one exception to "never recalculate day logic
 * in the browser" is calendar-day enumeration and grace-period status for
 * days with zero submissions, which listChallengeDays never returns
 * anything for; everything else (a submission's own challengeLocalDay)
 * still comes only from the backend.
 */
export function DayPicker({ daysWithData, selectedDay, challengeStartDate, challengeEndDate, timezone, processingGracePeriodHours, onSelect, disabled }: DayPickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthOf(selectedDay));
  const ref = useRef<HTMLDivElement>(null);
  const firstCellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setVisibleMonth(monthOf(selectedDay));
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) firstCellRef.current?.focus();
  }, [open, visibleMonth]);

  const dataByDay = useMemo(() => new Map(daysWithData.map((d) => [d.day, d])), [daysWithData]);
  const todayLocal = useMemo(() => toZonedDateString(new Date(), timezone), [timezone]);

  const allDays = useMemo(() => daysInRange(challengeStartDate, challengeEndDate), [challengeStartDate, challengeEndDate]);
  const dayNumberOf = useMemo(() => new Map(allDays.map((d, i) => [d, i + 1])), [allDays]);
  const totalDays = allDays.length;
  const selectedDayNumber = dayNumberOf.get(selectedDay) ?? null;

  function statusOf(day: string): CellStatus {
    if (day > todayLocal) return "future";
    const known = dataByDay.get(day);
    const elapsed = known ? known.graceElapsed : isGraceElapsed(day, timezone, processingGracePeriodHours);
    if (!elapsed) return "pending";
    return known ? "available" : "available-empty";
  }

  const monthStart = `${visibleMonth}-01`;
  const [vy, vm] = visibleMonth.split("-").map(Number);
  const daysInMonth = new Date(vy, vm, 0).getDate();
  const firstWeekday = new Date(Date.UTC(vy, vm - 1, 1)).getUTCDay(); // 0=Sun
  const monthLabel = new Date(vy, vm - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Compare "YYYY-MM" to "YYYY-MM" (not the 10-char monthStart to the
  // 7-char monthOf(...)) — a longer string that merely starts with a
  // shorter one still compares greater in JS, which would have let this
  // always evaluate true and allow navigating before the challenge start.
  const canGoPrevMonth = visibleMonth > monthOf(challengeStartDate);
  const canGoNextMonth = monthOf(challengeEndDate) > visibleMonth;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          padding: "6px 8px",
          borderRadius: 6,
          cursor: disabled ? "default" : "pointer",
          color: "#1D1C18",
          fontSize: 13.5,
          fontWeight: 600,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ fontWeight: 400, color: "#6F6A5E", whiteSpace: "nowrap" }}>
          {selectedDayNumber ? `Day ${selectedDayNumber} of ${totalDays}` : "Select a day"}
        </span>
        <span style={{ color: "#6F6A5E", fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Choose challenge day" className={styles.popover}>
          <div className={styles.popoverHeader}>
            <button type="button" className={styles.navButton} onClick={() => canGoPrevMonth && setVisibleMonth(monthOf(addDays(monthStart, -1)))} disabled={!canGoPrevMonth} aria-label="Previous month">
              ‹
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => canGoNextMonth && setVisibleMonth(monthOf(addDays(`${visibleMonth}-${String(daysInMonth).padStart(2, "0")}`, 1)))}
              disabled={!canGoNextMonth}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className={styles.weekdayRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className={styles.grid}>
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dateStr = `${visibleMonth}-${String(i + 1).padStart(2, "0")}`;
              if (dateStr < challengeStartDate || dateStr > challengeEndDate) return <span key={dateStr} />;
              const status = statusOf(dateStr);
              const isSelected = dateStr === selectedDay;
              const clickable = status === "available" || status === "available-empty";
              return (
                <button
                  key={dateStr}
                  ref={dateStr === selectedDay ? firstCellRef : undefined}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (!clickable) return;
                    onSelect(dateStr);
                    setOpen(false);
                  }}
                  className={`${styles.cell} ${isSelected ? styles.cellSelected : ""} ${styles[`cell_${status}`]}`}
                  title={
                    status === "future"
                      ? "This day hasn't happened yet"
                      : status === "pending"
                        ? "Grace period still open — no review pool yet"
                        : status === "available-empty"
                          ? "No submissions collected for this day"
                          : "Available"
                  }
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className={styles.legend}>
            <span>
              <span className={`${styles.legendDot} ${styles.cell_available}`} /> Available
            </span>
            <span>
              <span className={`${styles.legendDot} ${styles["cell_available-empty"]}`} /> No submissions
            </span>
            <span>
              <span className={`${styles.legendDot} ${styles.cell_pending}`} /> Grace period open
            </span>
            <span>
              <span className={`${styles.legendDot} ${styles.cell_future}`} /> Not yet
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
