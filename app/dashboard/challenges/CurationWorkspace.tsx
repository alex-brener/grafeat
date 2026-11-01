"use client";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
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

function formatDay(day: string): string {
  // Challenge-local calendar date — deliberately parsed as a plain date,
  // not re-interpreted through the viewer's own browser timezone.
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  challengeId: string;
  initialDay: string | null;
  initialDays: WorkspaceDay[];
  initialReady: { items: WorkspaceItem[]; nextCursor: string | null };
  initialDiagnosticCounts: Record<DiagnosticCategory, number>;
  initialSelected: WorkspaceItem[];
  initialStats: DayStats;
  initialNotYetSampled: number;
}

/**
 * The real, demo-aligned curation surface (UX-A) — replaces the previous
 * SubmissionGallery/DiagnosticsPanel pair. One client component owns all
 * shared state (day, tab, lists, pending mutations), mirroring the landing
 * demo's own "one hook, one view" architecture (useChallengeCurator.ts) —
 * deliberately not split into independently-stateful children, since
 * selecting/rejecting an item has to be reflected consistently across the
 * Ready grid, the Set-aside "rejected" category, the tray, and the
 * lightbox simultaneously (UX-A locked decision #6: one shared
 * optimistic-mutation path, not four).
 */
export function CurationWorkspace(props: CurationWorkspaceProps) {
  const { challengeId } = props;
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

  if (!day) {
    return (
      <div>
        <p className={styles.notYetSampled}>
          No challenge-local day has cleared its grace period yet — nothing to review until the first full publication day ends and the grace
          period elapses. Run a sync once that happens.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.daySwitcher} role="tablist" aria-label="Challenge day">
        {days.map((d) => (
          <button
            key={d.day}
            type="button"
            role="tab"
            aria-selected={d.day === day}
            disabled={dayLoading}
            onClick={() => (d.graceElapsed ? selectDay(d.day) : undefined)}
            className={`${styles.dayButton} ${d.day === day ? styles.dayButton_active : ""} ${!d.graceElapsed ? styles.dayButtonFuture : ""}`}
            title={d.graceElapsed ? undefined : "This day hasn't cleared its grace period yet — no review pool until it does."}
          >
            {formatDay(d.day)}
            {!d.graceElapsed ? " (pending)" : ""}
          </button>
        ))}
      </div>
      {dayError && <p className={styles.cardError}>{dayError}</p>}

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "ready"} onClick={() => setTab("ready")} className={`${styles.tab} ${tab === "ready" ? styles.tab_active : ""}`}>
          <span className={styles.tabCount}>{readyTotal}</span>
          Ready
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
              {readyItems.map((item, index) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  pending={pendingIds.has(item.id)}
                  error={itemErrors[item.id]}
                  onTapSelect={() => handleDecision(item, item.reviewStatus === "selected" ? "unreviewed" : "selected")}
                  onReject={() => handleDecision(item, "rejected")}
                  onView={() => setLightbox({ source: "ready", index })}
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
            These don't meet this day's rules, or were set aside manually. Nothing is deleted — Undo always works on a manual rejection.
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
                        {cs.items.map((item, index) => (
                          <ImageCard
                            key={item.id}
                            item={item}
                            pending={pendingIds.has(item.id)}
                            error={itemErrors[item.id]}
                            reason={category !== "rejected" ? CATEGORY_LABEL[category] : undefined}
                            onUndo={category === "rejected" ? () => handleDecision(item, "unreviewed") : undefined}
                            onView={() => setLightbox({ source: category, index })}
                            readOnly={category !== "rejected"}
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

      <section style={{ marginTop: 36 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 22, marginBottom: 12 }}>Selected for {formatDay(day)}</h2>
        {selectedItems.length === 0 ? (
          <p className={styles.trayEmpty}>Nothing selected yet — tap a Ready item's circle to add it here.</p>
        ) : (
          <div className={styles.trayGrid}>
            {selectedItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={styles.trayArt}
                onClick={() => setLightbox({ source: "tray", index })}
                aria-label={item.creatorUsername ? `View @${item.creatorUsername}'s submission` : "View submission"}
              >
                <CardImage item={item} />
                <span className={styles.trayBadge}>{index + 1}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          actionable={lightboxActionable}
          pending={pendingIds.has(lightboxItem.id)}
          error={itemErrors[lightboxItem.id]}
          hasPrev={lightbox!.index > 0}
          hasNext={lightbox!.index < lightboxList.length - 1}
          onPrev={() => setLightbox((prev) => (prev ? { ...prev, index: Math.max(0, prev.index - 1) } : prev))}
          onNext={() => setLightbox((prev) => (prev ? { ...prev, index: Math.min(lightboxList.length - 1, prev.index + 1) } : prev))}
          onClose={() => setLightbox(null)}
          onDecision={(decision) => handleDecision(lightboxItem, decision)}
        />
      )}

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
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

interface ImageCardProps {
  item: WorkspaceItem;
  pending: boolean;
  error?: string;
  reason?: string;
  readOnly?: boolean;
  onTapSelect?: () => void;
  onReject?: () => void;
  onUndo?: () => void;
  onView: () => void;
}

/**
 * Shared card for the Ready grid and the Set-aside "rejected" category.
 * Tap-to-select (the circular badge) and the separate Reject control are
 * deliberately distinct affordances, not a single tap-cycle (UX-A locked
 * decision #7) — tapping the badge toggles selection, Reject is its own
 * smaller control, and View opens the shared lightbox without touching
 * selection at all.
 */
function ImageCard({ item, pending, error, reason, readOnly, onTapSelect, onReject, onUndo, onView }: ImageCardProps) {
  function onArtKeyDown(e: ReactKeyboardEvent) {
    if (!onTapSelect) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTapSelect();
    }
  }
  return (
    <div className={styles.card}>
      <div
        className={styles.cardArt}
        role={onTapSelect ? "button" : undefined}
        tabIndex={onTapSelect ? 0 : undefined}
        onClick={onTapSelect}
        onKeyDown={onArtKeyDown}
        aria-label={onTapSelect ? (item.reviewStatus === "selected" ? "Remove from feature" : "Add to feature") : undefined}
      >
        <CardImage item={item} />
        {onTapSelect && (
          <button
            type="button"
            className={`${styles.selectBadge} ${item.reviewStatus === "selected" ? styles.selectBadge_selected : styles.selectBadge_unselected}`}
            onClick={(e) => {
              e.stopPropagation();
              onTapSelect();
            }}
            disabled={pending}
            aria-label={item.reviewStatus === "selected" ? "Remove from feature" : "Add to feature"}
          >
            {item.reviewStatus === "selected" ? "✓" : ""}
          </button>
        )}
        <button
          type="button"
          className={styles.viewButton}
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          View
        </button>
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardCreator}>{item.creatorUsername ? `@${item.creatorUsername}` : "Unknown creator"}</span>
        <span className={styles.cardDate}>{formatDateTime(item.publishedAt)}</span>
      </div>
      {reason && <span className={styles.reasonTag}>{reason}</span>}
      {!readOnly && (onReject || onUndo) && (
        <div className={styles.cardActions}>
          {onReject && (
            <button type="button" className={styles.rejectButton} onClick={onReject} disabled={pending || item.reviewStatus === "rejected"}>
              Reject
            </button>
          )}
          {onUndo && (
            <button type="button" className={styles.undoButton} onClick={onUndo} disabled={pending}>
              Undo
            </button>
          )}
        </div>
      )}
      {error && <span className={styles.cardError}>{error}</span>}
    </div>
  );
}

interface LightboxProps {
  item: WorkspaceItem;
  /** False for the 4 automatic-exclusion categories — read-only, same as their grid cards. */
  actionable: boolean;
  pending: boolean;
  error?: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onDecision: (decision: WorkspaceItem["reviewStatus"]) => void;
}

/**
 * The one shared lightbox (locked decision #7) — opened from the Ready
 * grid, the Set-aside "rejected" category, or the tray, always with the
 * same real (not fabricated) eligibility checklist built from
 * mentionResult/dateEligible. Closing it (×, Escape, or the backdrop)
 * never itself changes selection — only the explicit action buttons do.
 */
function Lightbox({ item, actionable, pending, error, hasPrev, hasNext, onPrev, onNext, onClose, onDecision }: LightboxProps) {
  return (
    <div className={styles.lightboxOverlay} role="dialog" aria-modal="true">
      <div className={styles.lightboxImageArea}>
        <button type="button" className={styles.lightboxCloseButton} onClick={onClose}>
          Close
        </button>
        <button type="button" className={`${styles.lightboxNavButton} ${styles.lightboxNavButton_prev}`} onClick={onPrev} disabled={!hasPrev} aria-label="Previous">
          ‹
        </button>
        <button type="button" className={`${styles.lightboxNavButton} ${styles.lightboxNavButton_next}`} onClick={onNext} disabled={!hasNext} aria-label="Next">
          ›
        </button>
        <div className={styles.lightboxImage}>
          <CardImage key={item.id} item={item} />
        </div>
      </div>
      <aside className={styles.lightboxAside}>
        <div>
          <h3 className={styles.lightboxHandle}>{item.creatorUsername ? `@${item.creatorUsername}` : "Unknown creator"}</h3>
          <div className={styles.lightboxMeta}>{formatDateTime(item.publishedAt)}</div>
          {item.permalink && (
            <a href={item.permalink} target="_blank" rel="noopener noreferrer" className={styles.lightboxMeta}>
              Open post on Instagram ↗
            </a>
          )}
        </div>
        {item.caption && <div className={styles.lightboxCaption}>{item.caption}</div>}
        <div className={styles.checklist}>
          <div className={styles.checkRow}>
            {item.mentionResult === "verified" ? (
              <span className={`${styles.checkIcon} ${styles.checkIcon_ok}`}>✓</span>
            ) : item.mentionResult === "not_verified" ? (
              <span className={`${styles.checkIcon} ${styles.checkIcon_fail}`}>✕</span>
            ) : (
              <span className={`${styles.checkIcon} ${styles.checkIcon_pending}`}>?</span>
            )}
            <span>Genuine mention verified</span>
          </div>
          <div className={styles.checkRow}>
            {item.dateEligible ? (
              <span className={`${styles.checkIcon} ${styles.checkIcon_ok}`}>✓</span>
            ) : (
              <span className={`${styles.checkIcon} ${styles.checkIcon_fail}`}>✕</span>
            )}
            <span>Posted within the challenge dates</span>
          </div>
        </div>
        {error && <span className={styles.cardError}>{error}</span>}
        {actionable ? (
          <div className={styles.lightboxActions}>
            {item.reviewStatus === "selected" ? (
              <button type="button" className={styles.lightboxSelectedButton} disabled={pending} onClick={() => onDecision("unreviewed")}>
                Selected · Remove
              </button>
            ) : item.reviewStatus === "rejected" ? (
              <button type="button" className={styles.lightboxSecondaryButton} disabled={pending} onClick={() => onDecision("unreviewed")}>
                Undo rejection
              </button>
            ) : (
              <>
                <button type="button" className={styles.lightboxPrimaryButton} disabled={pending} onClick={() => onDecision("selected")}>
                  Add to feature
                </button>
                <button type="button" className={styles.lightboxSecondaryButton} disabled={pending} onClick={() => onDecision("rejected")}>
                  Reject
                </button>
              </>
            )}
          </div>
        ) : (
          <p className={styles.lightboxMeta}>Automatic exclusion — no action available here.</p>
        )}
      </aside>
    </div>
  );
}
