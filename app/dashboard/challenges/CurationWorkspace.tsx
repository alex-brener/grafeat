"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isGraceElapsed } from "@/lib/timezone";
import { CuratorPageShell } from "../CuratorPageShell";
import { CuratorGridCard } from "@/app/curator-shared/CuratorGridCard";
import { CuratorLightbox, type CuratorCheck } from "@/app/curator-shared/CuratorLightbox";
import { CuratorTrayBar } from "@/app/curator-shared/CuratorTrayBar";
import { useWideBreakpoint } from "@/app/curator-shared/useWideBreakpoint";
import { DayPicker } from "./DayPicker";
import styles from "./CurationWorkspace.module.css";

export interface WorkspaceItem {
  id: string;
  mediaId: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  creatorUsername: string | null;
  publishedAt: string;
  reviewStatus: "unreviewed" | "selected" | "rejected";
  processingStatus: "pending" | "completed" | "error_permanent";
  mentionResult: "verified" | "not_verified" | null;
  dateEligible: boolean;
}

export interface WorkspaceDay {
  day: string;
  graceElapsed: boolean;
}

type DiagnosticCategory = "pending" | "technical_failure" | "not_verified" | "outside_dates" | "rejected";

const DIAGNOSTIC_CATEGORIES: DiagnosticCategory[] = ["pending", "technical_failure", "not_verified", "outside_dates", "rejected"];

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  pending: "Pending / unprocessed",
  technical_failure: "Technical failure",
  not_verified: "Not verified",
  outside_dates: "Outside challenge dates",
  rejected: "Rejected",
};

const CATEGORY_SUB: Record<DiagnosticCategory, string> = {
  pending: "not processed yet",
  technical_failure: "couldn't be evaluated",
  not_verified: "no genuine mention found",
  outside_dates: "posted outside the challenge window",
  rejected: "set aside by you — Undo to bring back",
};

export interface DayStats {
  discovered: number;
  completed: number;
  eligible: number;
  sampled: number;
  selected: number;
}

const EMPTY_COUNTS: Record<DiagnosticCategory, number> = { pending: 0, technical_failure: 0, not_verified: 0, outside_dates: 0, rejected: 0 };
const EMPTY_STATS: DayStats = { discovered: 0, completed: 0, eligible: 0, sampled: 0, selected: 0 };

interface CategoryState {
  expanded: boolean;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  items: WorkspaceItem[];
  nextCursor: string | null;
}

function emptyCategoryState(): CategoryState {
  return { expanded: false, loaded: false, loading: false, error: null, items: [], nextCursor: null };
}

function emptyCategoryStateMap(): Record<DiagnosticCategory, CategoryState> {
  return {
    pending: emptyCategoryState(),
    technical_failure: emptyCategoryState(),
    not_verified: emptyCategoryState(),
    outside_dates: emptyCategoryState(),
    rejected: emptyCategoryState(),
  };
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function formatDayHeading(day: string): { eyebrow: string; dayNumber: number | null } {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const eyebrow = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return { eyebrow, dayNumber: null };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDayShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface LightboxRef {
  // "ready" and "tray" read from their own state; any diagnostic category
  // (including "rejected") reads from that category's own loaded list —
  // collapsing every non-ready/tray source to "rejected" would have shown
  // the wrong item when opened from a *different* read-only category,
  // since each category keeps its own separate items array.
  source: "ready" | "tray" | DiagnosticCategory;
  index: number;
}

export interface CurationWorkspaceProps {
  email: string;
  challengeId: string;
  challengeName: string;
  /** Not shown anywhere in the demo (its challenges have no draft/ended concept) — kept visible here since it's real, meaningful product state the previous implementation surfaced and removing it silently would be a real regression, not just a cosmetic one. */
  challengeStatus: "draft" | "active" | "ended";
  hashtag: string;
  requiredMention: string;
  challengeStartDate: string;
  challengeEndDate: string;
  timezone: string;
  processingGracePeriodHours: number;
  lastSyncSummary: string | null;
  initialDay: string | null;
  initialDays: WorkspaceDay[];
  initialReady: { items: WorkspaceItem[]; nextCursor: string | null };
  initialDiagnosticCounts: Record<DiagnosticCategory, number>;
  initialSelected: WorkspaceItem[];
  initialStats: DayStats;
  initialNotYetSampled: number;
  /** Server-rendered sync status/stats + the SyncButton — kept visually secondary (below the curation surface), not fabricated, and not part of the demo's own visual language (the demo has no real discovery/processing). */
  syncSection: ReactNode;
}

/**
 * The real, demo-aligned curation surface (UX-A). One client component
 * owns all shared state (day, tab, lists, pending mutations), mirroring
 * the landing demo's own "one hook, one view" architecture
 * (useChallengeCurator.ts) — deliberately not split into
 * independently-stateful children, since selecting/rejecting an item has
 * to be reflected consistently across the Ready grid, the Set-aside
 * "rejected" category, the tray, and the lightbox simultaneously (UX-A
 * locked decision #6: one shared optimistic-mutation path, not four).
 *
 * Now also owns the page shell (CuratorPageShell/CuratorChrome) and the
 * header day picker, since both need the same day state this component
 * already manages — visual-parity + day-navigation pass.
 */
export function CurationWorkspace(props: CurationWorkspaceProps) {
  const { challengeId, challengeName, hashtag, requiredMention, challengeStartDate, challengeEndDate, timezone, processingGracePeriodHours } = props;
  const router = useRouter();
  const wide = useWideBreakpoint();
  const [day, setDay] = useState(props.initialDay);
  const [days, setDays] = useState(props.initialDays);
  const [tab, setTab] = useState<"ready" | "aside">("ready");

  const [readyItems, setReadyItems] = useState(props.initialReady.items);
  const [readyNextCursor, setReadyNextCursor] = useState(props.initialReady.nextCursor);
  const [readyLoadingMore, setReadyLoadingMore] = useState(false);
  const [readyLoadMoreError, setReadyLoadMoreError] = useState<string | null>(null);

  const [diagCounts, setDiagCounts] = useState(props.initialDiagnosticCounts);
  const [categoryState, setCategoryState] = useState<Record<DiagnosticCategory, CategoryState>>(emptyCategoryStateMap());

  const [selectedItems, setSelectedItems] = useState(props.initialSelected);
  const [stats, setStats] = useState(props.initialStats);
  const [notYetSampled, setNotYetSampled] = useState(props.initialNotYetSampled);

  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const [lightbox, setLightbox] = useState<LightboxRef | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function selectDay(newDay: string) {
    if (newDay === day || dayLoading) return;
    setDayLoading(true);
    setDayError(null);
    try {
      const [readyRes, diagRes, selRes, statsRes] = await Promise.all([
        fetch(`/api/challenges/${challengeId}/submissions?day=${encodeURIComponent(newDay)}`),
        fetch(`/api/challenges/${challengeId}/submissions/diagnostics?day=${encodeURIComponent(newDay)}`),
        fetch(`/api/challenges/${challengeId}/submissions/selected?day=${encodeURIComponent(newDay)}`),
        fetch(`/api/challenges/${challengeId}/submissions/stats?day=${encodeURIComponent(newDay)}`),
      ]);
      const [readyData, diagData, selData, statsData] = await Promise.all([readyRes.json(), diagRes.json(), selRes.json(), statsRes.json()]);
      if (!readyRes.ok || !readyData.ok) throw new Error(readyData.error ?? "Could not load that day.");
      setReadyItems(readyData.items);
      setReadyNextCursor(readyData.nextCursor);
      setDiagCounts(diagData.ok ? diagData.counts : EMPTY_COUNTS);
      setSelectedItems(selData.ok ? selData.items : []);
      setStats(statsData.ok ? statsData.stats : EMPTY_STATS);
      setNotYetSampled(statsData.ok ? statsData.notYetSampled : 0);
      setCategoryState(emptyCategoryStateMap());
      setDay(newDay);
      setTab("ready");
      setLightbox(null);
      const url = new URL(window.location.href);
      url.searchParams.set("day", newDay);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
    } catch (err) {
      setDayError(err instanceof Error ? err.message : "Could not switch days — please try again.");
    } finally {
      setDayLoading(false);
    }
  }

  async function loadMoreReady() {
    if (!readyNextCursor || readyLoadingMore || !day) return;
    setReadyLoadingMore(true);
    setReadyLoadMoreError(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submissions?day=${encodeURIComponent(day)}&cursor=${encodeURIComponent(readyNextCursor)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setReadyLoadMoreError(data.error ?? "Could not load more.");
        return;
      }
      setReadyItems((prev) => [...prev, ...data.items]);
      setReadyNextCursor(data.nextCursor);
    } catch {
      setReadyLoadMoreError("Network error — please try again.");
    } finally {
      setReadyLoadingMore(false);
    }
  }

  async function fetchCategoryPage(category: DiagnosticCategory, cursor: string | null) {
    if (!day) return;
    setCategoryState((prev) => ({ ...prev, [category]: { ...prev[category], loading: true, error: null } }));
    try {
      const url = `/api/challenges/${challengeId}/submissions/diagnostics/${category}?day=${encodeURIComponent(day)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCategoryState((prev) => ({ ...prev, [category]: { ...prev[category], loading: false, error: data.error ?? "Could not load." } }));
        return;
      }
      setCategoryState((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          loading: false,
          loaded: true,
          items: cursor ? [...prev[category].items, ...data.items] : data.items,
          nextCursor: data.nextCursor,
        },
      }));
    } catch {
      setCategoryState((prev) => ({ ...prev, [category]: { ...prev[category], loading: false, error: "Network error — please try again." } }));
    }
  }

  function toggleCategory(category: DiagnosticCategory) {
    const wasExpanded = categoryState[category].expanded;
    setCategoryState((prev) => ({ ...prev, [category]: { ...prev[category], expanded: !wasExpanded } }));
    if (!wasExpanded && !categoryState[category].loaded) {
      void fetchCategoryPage(category, null);
    }
  }

  /**
   * The one shared mutation path (locked decision #6): the Ready grid's
   * tap-to-select circle, its separate Reject control, the Set-aside
   * "rejected" category's Undo button, the tray's Remove button, and the
   * lightbox's actions all call this same function, with the same
   * optimistic-update + rollback-on-failure behavior.
   */
  async function handleDecision(item: WorkspaceItem, decision: WorkspaceItem["reviewStatus"]) {
    if (pendingIds.has(item.id)) return;
    const previous = item.reviewStatus;
    if (previous === decision) return;

    setPendingIds((prev) => new Set(prev).add(item.id));
    setItemErrors((prev) => ({ ...prev, [item.id]: "" }));
    reconcile(item, decision);

    try {
      const res = await fetch(`/api/challenges/${challengeId}/submissions/${item.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        reconcile({ ...item, reviewStatus: decision }, previous);
        setItemErrors((prev) => ({ ...prev, [item.id]: data?.error ?? "Could not save — please try again." }));
      } else {
        setToast(
          decision === "selected"
            ? "Added to feature"
            : decision === "rejected"
              ? "Set aside"
              : previous === "rejected"
                ? "Restored to Ready"
                : "Removed from feature"
        );
      }
    } catch {
      reconcile({ ...item, reviewStatus: decision }, previous);
      setItemErrors((prev) => ({ ...prev, [item.id]: "Network error — please try again." }));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  /** Updates every list this item could belong in, so Ready/Set-aside/tray/lightbox all stay consistent from one call — see handleDecision. */
  function reconcile(item: WorkspaceItem, newStatus: WorkspaceItem["reviewStatus"]) {
    const updated: WorkspaceItem = { ...item, reviewStatus: newStatus };

    setReadyItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (newStatus === "rejected") return prev.filter((i) => i.id !== item.id);
      if (exists) return prev.map((i) => (i.id === item.id ? updated : i));
      return [updated, ...prev];
    });

    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (newStatus !== "selected") return exists ? prev.filter((i) => i.id !== item.id) : prev;
      return exists ? prev.map((i) => (i.id === item.id ? updated : i)) : [updated, ...prev];
    });

    setCategoryState((prev) => {
      const cat = prev.rejected;
      const exists = cat.items.some((i) => i.id === item.id);
      const items = newStatus === "rejected" ? (exists ? cat.items.map((i) => (i.id === item.id ? updated : i)) : [updated, ...cat.items]) : exists ? cat.items.filter((i) => i.id !== item.id) : cat.items;
      return { ...prev, rejected: { ...cat, items } };
    });

    setDiagCounts((prev) => {
      const wasRejected = item.reviewStatus === "rejected";
      const isRejected = newStatus === "rejected";
      return wasRejected === isRejected ? prev : { ...prev, rejected: Math.max(0, prev.rejected + (isRejected ? 1 : -1)) };
    });

    setStats((prev) => {
      const wasSelected = item.reviewStatus === "selected";
      const isSelected = newStatus === "selected";
      return wasSelected === isSelected ? prev : { ...prev, selected: Math.max(0, prev.selected + (isSelected ? 1 : -1)) };
    });
  }

  const lightboxList = lightbox ? (lightbox.source === "ready" ? readyItems : lightbox.source === "tray" ? selectedItems : categoryState[lightbox.source].items) : [];
  // Only Ready, the "rejected" category, and the tray carry a real action
  // (select/reject/undo) — the 4 automatic-exclusion categories stay
  // read-only in the lightbox exactly as they are in the grid, since
  // setSubmissionReviewStatus has no eligibility guard of its own: nothing
  // here may offer "Add to feature" on a submission that was never
  // actually verified/eligible/sampled.
  const lightboxActionable = lightbox ? lightbox.source === "ready" || lightbox.source === "tray" || lightbox.source === "rejected" : false;
  const lightboxItem = lightbox ? lightboxList[Math.min(lightbox.index, lightboxList.length - 1)] ?? null : null;

  useEffect(() => {
    if (lightbox && lightboxList.length === 0) setLightbox(null);
  }, [lightbox, lightboxList.length]);

  useEffect(() => {
    if (!lightbox) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox((prev) => (prev ? { ...prev, index: Math.max(0, prev.index - 1) } : prev));
      if (e.key === "ArrowRight") setLightbox((prev) => (prev ? { ...prev, index: Math.min(lightboxList.length - 1, prev.index + 1) } : prev));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, lightboxList.length]);

  const asideTotal = useMemo(() => DIAGNOSTIC_CATEGORIES.reduce((sum, c) => sum + diagCounts[c], 0), [diagCounts]);
  const readyTotal = Math.max(0, stats.sampled - diagCounts.rejected);

  // Adjacent-available-day lookup for the Curate prev/next shortcuts —
  // steps through real calendar days (not just days with submissions, per
  // "do not assume all challenge days have submissions"), using the same
  // pure isGraceElapsed function the DayPicker popover uses. No separate
  // "is this day in the future" check is needed: isGraceElapsed already
  // returns false for any day whose end-of-day-plus-grace hasn't happened
  // yet, which is automatically true for every future day too.
  function isDayAvailable(d: string): boolean {
    if (d < challengeStartDate || d > challengeEndDate) return false;
    const known = days.find((x) => x.day === d);
    return known ? known.graceElapsed : isGraceElapsed(d, timezone, processingGracePeriodHours);
  }
  function findAdjacentAvailableDay(from: string, direction: 1 | -1): string | null {
    let cur = from;
    for (let i = 0; i < 400; i++) {
      cur = addDays(cur, direction);
      if (cur < challengeStartDate || cur > challengeEndDate) return null;
      if (isDayAvailable(cur)) return cur;
    }
    return null;
  }
  const prevDay = day ? findAdjacentAvailableDay(day, -1) : null;
  const nextDay = day ? findAdjacentAvailableDay(day, 1) : null;

  const dayPickerSlot = day ? (
    <DayPicker
      daysWithData={days}
      selectedDay={day}
      challengeStartDate={challengeStartDate}
      challengeEndDate={challengeEndDate}
      timezone={timezone}
      processingGracePeriodHours={processingGracePeriodHours}
      onSelect={selectDay}
      disabled={dayLoading}
    />
  ) : undefined;

  if (!day) {
    return (
      <CuratorPageShell email={props.email} challengeContext={{ id: challengeId, name: challengeName }} activeStep="curate" maxWidth={1440}>
        <p className={styles.notYetSampled}>
          No challenge-local day has cleared its grace period yet — nothing to review until the first full publication day ends and the grace
          period elapses. Run a sync once that happens.
        </p>
        {props.syncSection}
      </CuratorPageShell>
    );
  }

  const { eyebrow } = formatDayHeading(day);
  const dayNumber = Math.round((new Date(day).getTime() - new Date(challengeStartDate).getTime()) / 86400000) + 1;
  const totalDays = Math.round((new Date(challengeEndDate).getTime() - new Date(challengeStartDate).getTime()) / 86400000) + 1;

  return (
    <CuratorPageShell email={props.email} challengeContext={{ id: challengeId, name: challengeName }} activeStep="curate" maxWidth={1440} dayTrigger={dayPickerSlot}>
      <div className={styles.dayHeadingRow}>
        <div className={styles.dayHeadingLeft}>
          <div className={styles.dayHeadingArrows}>
            <button type="button" className={styles.dayArrow} onClick={() => prevDay && selectDay(prevDay)} disabled={!prevDay || dayLoading} aria-label="Previous available day">
              ‹
            </button>
            <button type="button" className={styles.dayArrow} onClick={() => nextDay && selectDay(nextDay)} disabled={!nextDay || dayLoading} aria-label="Next available day">
              ›
            </button>
          </div>
          <div>
            <div className={styles.dayEyebrow}>
              {eyebrow} · Day {dayNumber} of {totalDays}
              <span className={`${styles.statusBadge} ${styles[`statusBadge_${props.challengeStatus}`]}`}>{props.challengeStatus}</span>
            </div>
            <h1 className={styles.dayHeading}>Day {dayNumber}</h1>
          </div>
        </div>
        <div className={styles.dayHeadingRight}>
          <div className={styles.tagRow}>
            <span>Counted for this day when a post mentions</span>
            <span className={styles.tag}>@{requiredMention}</span>
            <span className={styles.tag}>#{hashtag}</span>
            <span>and was posted {formatDayShort(day)}</span>
          </div>
          {props.lastSyncSummary && <div className={styles.syncStatus}>{props.lastSyncSummary}</div>}
        </div>
      </div>
      {dayError && <p className={styles.cardError}>{dayError}</p>}

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "ready"} onClick={() => setTab("ready")} className={`${styles.tab} ${tab === "ready" ? styles.tab_active : ""}`}>
          <span className={styles.tabCount}>{readyTotal}</span>
          Ready to curate
        </button>
        <button type="button" role="tab" aria-selected={tab === "aside"} onClick={() => setTab("aside")} className={`${styles.tab} ${tab === "aside" ? styles.tab_active : ""}`}>
          <span className={styles.tabCount}>{asideTotal}</span>
          Set aside
        </button>
      </div>

      {notYetSampled > 0 && (
        <p className={styles.notYetSampled}>
          {notYetSampled} more eligible submission{notYetSampled === 1 ? "" : "s"} discovered beyond today's review limit — they'll be sampled in
          on a future sync if capacity allows.
        </p>
      )}

      {tab === "ready" && (
        <div>
          {readyItems.length === 0 ? (
            <p className={styles.notYetSampled}>Nothing sampled for review yet on this day.</p>
          ) : (
            <div className={styles.grid}>
              {readyItems.map((item) => (
                <CuratorGridCard
                  key={item.id}
                  art={<CardImage item={item} />}
                  onToggle={() => handleDecision(item, item.reviewStatus === "selected" ? "unreviewed" : "selected")}
                  selected={item.reviewStatus === "selected"}
                  onView={() => setLightbox({ source: "ready", index: readyItems.indexOf(item) })}
                  handle={item.creatorUsername ?? "unknown"}
                  time={formatDateTime(item.publishedAt)}
                  disabled={pendingIds.has(item.id)}
                  footerSlot={
                    <div className={styles.cardActions}>
                      <button type="button" className={styles.rejectButton} onClick={() => handleDecision(item, "rejected")} disabled={pendingIds.has(item.id)}>
                        Reject
                      </button>
                      {itemErrors[item.id] && <span className={styles.cardError}>{itemErrors[item.id]}</span>}
                    </div>
                  }
                />
              ))}
            </div>
          )}
          {readyNextCursor && (
            <div className={styles.cardActions} style={{ marginTop: 20 }}>
              <button type="button" className={styles.undoButton} onClick={loadMoreReady} disabled={readyLoadingMore}>
                {readyLoadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
          {readyLoadMoreError && <p className={styles.cardError}>{readyLoadMoreError}</p>}
        </div>
      )}

      {tab === "aside" && (
        <div>
          <p className={styles.asideIntro}>
            These don&apos;t meet this day&apos;s rules, or were set aside manually. Nothing is deleted — Undo always works on a manual rejection.
          </p>
          {DIAGNOSTIC_CATEGORIES.map((category) => {
            const count = diagCounts[category];
            const cs = categoryState[category];
            return (
              <div key={category} className={styles.category}>
                <div className={styles.categoryHeader}>
                  <h3 className={styles.categoryTitle}>{CATEGORY_LABEL[category]}</h3>
                  <span className={styles.categoryCount}>
                    {count} · {CATEGORY_SUB[category]}
                  </span>
                  {count > 0 && (
                    <button type="button" className={styles.categoryToggle} onClick={() => toggleCategory(category)}>
                      {cs.expanded ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                {cs.expanded && (
                  <>
                    {cs.loading && cs.items.length === 0 && <p className={styles.notYetSampled}>Loading…</p>}
                    {cs.error && <p className={styles.cardError}>{cs.error}</p>}
                    {cs.items.length > 0 && (
                      <div className={styles.grid}>
                        {cs.items.map((item) => (
                          <CuratorGridCard
                            key={item.id}
                            art={<CardImage item={item} />}
                            onView={() => setLightbox({ source: category, index: cs.items.indexOf(item) })}
                            handle={item.creatorUsername ?? "unknown"}
                            time={formatDateTime(item.publishedAt)}
                            disabled={pendingIds.has(item.id)}
                            footerSlot={
                              category === "rejected" ? (
                                <div className={styles.cardActions}>
                                  <button type="button" className={styles.undoButton} onClick={() => handleDecision(item, "unreviewed")} disabled={pendingIds.has(item.id)}>
                                    Undo
                                  </button>
                                </div>
                              ) : (
                                <span className={styles.reasonTag}>{CATEGORY_LABEL[category]}</span>
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                    {cs.nextCursor && (
                      <button type="button" className={styles.undoButton} style={{ marginTop: 12 }} onClick={() => fetchCategoryPage(category, cs.nextCursor)} disabled={cs.loading}>
                        {cs.loading ? "Loading…" : "Load more"}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CuratorTrayBar
        eyebrow="Selected"
        count={selectedItems.length}
        max={null}
        wide={wide}
        position="fixed"
        contentMaxWidth={1440}
        slots={selectedItems.map((item, i) => ({ id: item.id, art: <CardImage item={item} />, num: i + 1, onClick: () => setLightbox({ source: "tray", index: i }) }))}
        ctaLabel="Compose"
        ctaDisabled
        emptyHint="Tap a Ready item's circle to add it here"
      />

      {lightboxItem && (
        <CuratorLightbox
          art={<CardImage item={lightboxItem} />}
          handle={lightboxItem.creatorUsername ?? "unknown"}
          posted={formatDateTime(lightboxItem.publishedAt)}
          media={lightboxItem.mediaType ?? "Image"}
          postUrl={lightboxItem.permalink}
          caption={lightboxItem.caption}
          checks={buildChecks(lightboxItem)}
          position="fixed"
          hasPrev={lightbox!.index > 0}
          hasNext={lightbox!.index < lightboxList.length - 1}
          onPrev={() => setLightbox((prev) => (prev ? { ...prev, index: Math.max(0, prev.index - 1) } : prev))}
          onNext={() => setLightbox((prev) => (prev ? { ...prev, index: Math.min(lightboxList.length - 1, prev.index + 1) } : prev))}
          onClose={() => setLightbox(null)}
          actionsSlot={
            lightboxActionable ? (
              lightboxItem.reviewStatus === "selected" ? (
                <button type="button" className={styles.lightboxSelectedButton} disabled={pendingIds.has(lightboxItem.id)} onClick={() => handleDecision(lightboxItem, "unreviewed")}>
                  Selected · Remove
                </button>
              ) : lightboxItem.reviewStatus === "rejected" ? (
                <button type="button" className={styles.lightboxSecondaryButton} disabled={pendingIds.has(lightboxItem.id)} onClick={() => handleDecision(lightboxItem, "unreviewed")}>
                  Undo rejection
                </button>
              ) : (
                <>
                  <button type="button" className={styles.lightboxPrimaryButton} disabled={pendingIds.has(lightboxItem.id)} onClick={() => handleDecision(lightboxItem, "selected")}>
                    Add to feature
                  </button>
                  <button type="button" className={styles.lightboxSecondaryButton} disabled={pendingIds.has(lightboxItem.id)} onClick={() => handleDecision(lightboxItem, "rejected")}>
                    Reject
                  </button>
                </>
              )
            ) : (
              <p className={styles.lightboxMeta}>Automatic exclusion — no action available here.</p>
            )
          }
        />
      )}

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}

      <div style={{ marginTop: 60 }}>{props.syncSection}</div>
    </CuratorPageShell>
  );
}

function buildChecks(item: WorkspaceItem): CuratorCheck[] {
  return [
    {
      label: "Genuine mention verified",
      state: item.mentionResult === "verified" ? "ok" : item.mentionResult === "not_verified" ? "fail" : "review",
    },
    { label: "Posted within the challenge dates", state: item.dateEligible ? "ok" : "fail" },
  ];
}

function CardImage({ item }: { item: WorkspaceItem }) {
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState<"primary" | "thumbnail">("primary");
  const src = stage === "primary" ? item.mediaUrl ?? item.thumbnailUrl : item.thumbnailUrl;
  if (failed || !src) {
    return <div className={styles.cardImageFallback}>Image unavailable</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.creatorUsername ? `Submission by @${item.creatorUsername}` : "Challenge submission artwork"}
      loading="lazy"
      className={styles.cardImage}
      onError={() => {
        if (stage === "primary" && item.thumbnailUrl && item.thumbnailUrl !== item.mediaUrl) {
          setStage("thumbnail");
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
