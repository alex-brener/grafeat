"use client";

import { useState } from "react";
import styles from "./Challenges.module.css";
import type { GalleryItem } from "./SubmissionGallery";

type DiagnosticCategory = "pending" | "technical_failure" | "not_verified" | "outside_dates";

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  pending: "Pending / unprocessed",
  technical_failure: "Technical failure",
  not_verified: "Not verified",
  outside_dates: "Outside challenge dates",
};

const CATEGORIES: DiagnosticCategory[] = ["pending", "technical_failure", "not_verified", "outside_dates"];

interface CategoryState {
  expanded: boolean;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  items: GalleryItem[];
  nextCursor: string | null;
}

function emptyState(): CategoryState {
  return { expanded: false, loaded: false, loading: false, error: null, items: [], nextCursor: null };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Read-only by design — diagnostics never exposes select/reject controls.
 * Counts are shown immediately (passed in from the server-rendered page);
 * a category's actual records are only fetched the first time it's
 * expanded, and paginated from then on — never bundled into the initial
 * page load.
 */
export function DiagnosticsPanel({ challengeId, initialCounts }: { challengeId: string; initialCounts: Record<DiagnosticCategory, number> }) {
  const [state, setState] = useState<Record<DiagnosticCategory, CategoryState>>({
    pending: emptyState(),
    technical_failure: emptyState(),
    not_verified: emptyState(),
    outside_dates: emptyState(),
  });

  async function fetchPage(category: DiagnosticCategory, cursor: string | null) {
    setState((prev) => ({ ...prev, [category]: { ...prev[category], loading: true, error: null } }));
    try {
      const url = `/api/challenges/${challengeId}/submissions/diagnostics/${category}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState((prev) => ({ ...prev, [category]: { ...prev[category], loading: false, error: data.error ?? "Could not load." } }));
        return;
      }
      setState((prev) => ({
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
      setState((prev) => ({ ...prev, [category]: { ...prev[category], loading: false, error: "Network error — please try again." } }));
    }
  }

  function toggle(category: DiagnosticCategory) {
    const wasExpanded = state[category].expanded;
    setState((prev) => ({ ...prev, [category]: { ...prev[category], expanded: !wasExpanded } }));
    if (!wasExpanded && !state[category].loaded) {
      void fetchPage(category, null);
    }
  }

  return (
    <div className={styles.diagnosticsPanel}>
      {CATEGORIES.map((category) => {
        const s = state[category];
        const count = initialCounts[category] ?? 0;
        return (
          <div key={category} className={styles.diagnosticsCategory}>
            <button type="button" className={styles.diagnosticsToggle} onClick={() => toggle(category)} aria-expanded={s.expanded}>
              <span>{CATEGORY_LABEL[category]}</span>
              <span className={styles.diagnosticsCount}>{count}</span>
            </button>
            {s.expanded && (
              <div className={styles.diagnosticsBody}>
                {s.loading && s.items.length === 0 && <p className={styles.hint}>Loading…</p>}
                {s.error && <p className={styles.errorText}>{s.error}</p>}
                {s.items.length === 0 && s.loaded && !s.loading && <p className={styles.hint}>Nothing in this category.</p>}
                {s.items.length > 0 && (
                  <ul className={styles.diagnosticsList}>
                    {s.items.map((item) => (
                      <li key={item.id} className={styles.diagnosticsRow}>
                        <span className={styles.galleryCreator}>{item.creatorUsername ? `@${item.creatorUsername}` : "Unknown creator"}</span>
                        <span className={styles.galleryDate}>{formatDate(item.publishedAt)}</span>
                        <span className={styles.diagnosticsStatus}>{item.processingStatus}</span>
                        {item.permalink && (
                          <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                            View on Instagram ↗
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {s.nextCursor && (
                  <button type="button" className={styles.submitButton} onClick={() => fetchPage(category, s.nextCursor)} disabled={s.loading}>
                    {s.loading ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
