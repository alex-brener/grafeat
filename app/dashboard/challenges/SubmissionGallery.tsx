"use client";

import { useState } from "react";
import styles from "./Challenges.module.css";

export interface GalleryItem {
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
}

type Decision = "selected" | "rejected" | "unreviewed";

const REVIEW_LABEL: Record<GalleryItem["reviewStatus"], string> = {
  unreviewed: "Unreviewed",
  selected: "Selected",
  rejected: "Rejected",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function SubmissionGallery({ challengeId, initialItems, initialNextCursor }: { challengeId: string; initialItems: GalleryItem[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Which cards currently have a review request in flight — the buttons on
  // that card are disabled while the id is in this set, which is what
  // actually prevents a rapid double-click from firing two overlapping
  // requests for the same submission.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submissions?cursor=${encodeURIComponent(nextCursor)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoadMoreError(data.error ?? "Could not load more.");
        return;
      }
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      setLoadMoreError("Network error — please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDecision(item: GalleryItem, decision: Decision) {
    if (pendingIds.has(item.id)) return; // belt-and-suspenders: buttons are already disabled while pending
    const previous = item.reviewStatus;
    setPendingIds((prev) => new Set(prev).add(item.id));
    setCardErrors((prev) => ({ ...prev, [item.id]: "" }));
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, reviewStatus: decision } : i)));

    try {
      const res = await fetch(`/api/challenges/${challengeId}/submissions/${item.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, reviewStatus: previous } : i)));
        setCardErrors((prev) => ({ ...prev, [item.id]: data?.error ?? "Could not save — please try again." }));
      }
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, reviewStatus: previous } : i)));
      setCardErrors((prev) => ({ ...prev, [item.id]: "Network error — please try again." }));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  if (items.length === 0) {
    return <p className={styles.hint}>No gallery-ready submissions yet — processed, genuinely-mentioned, date-eligible posts will appear here after a sync.</p>;
  }

  return (
    <div>
      <div className={styles.galleryGrid}>
        {items.map((item) => {
          const pending = pendingIds.has(item.id);
          const imageSrc = !brokenImages.has(item.id) ? item.mediaUrl ?? item.thumbnailUrl : null;
          return (
            <div key={item.id} className={styles.galleryCard}>
              <div className={styles.galleryImageWrap}>
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={item.caption ?? "Submission artwork"}
                    loading="lazy"
                    className={styles.galleryImage}
                    onError={() => setBrokenImages((prev) => new Set(prev).add(item.id))}
                  />
                ) : (
                  <div className={styles.galleryImageFallback}>
                    <span>Image unavailable</span>
                    {item.permalink && (
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                        View on Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.galleryCardBody}>
                <div className={styles.galleryCardMeta}>
                  <span className={styles.galleryCreator}>{item.creatorUsername ? `@${item.creatorUsername}` : "Unknown creator"}</span>
                  <span className={styles.galleryDate}>{formatDate(item.publishedAt)}</span>
                </div>
                {item.permalink && (
                  <a className={styles.galleryPermalink} href={item.permalink} target="_blank" rel="noopener noreferrer">
                    View on Instagram ↗
                  </a>
                )}
                <span className={`${styles.reviewBadge} ${styles[`reviewBadge_${item.reviewStatus}`]}`}>{REVIEW_LABEL[item.reviewStatus]}</span>
                <div className={styles.reviewControls}>
                  <button
                    type="button"
                    className={styles.reviewButtonSelect}
                    disabled={pending || item.reviewStatus === "selected"}
                    onClick={() => handleDecision(item, "selected")}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    className={styles.reviewButtonReject}
                    disabled={pending || item.reviewStatus === "rejected"}
                    onClick={() => handleDecision(item, "rejected")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className={styles.reviewButtonUndo}
                    disabled={pending || item.reviewStatus === "unreviewed"}
                    onClick={() => handleDecision(item, "unreviewed")}
                  >
                    Undo
                  </button>
                </div>
                {cardErrors[item.id] && <p className={styles.errorText}>{cardErrors[item.id]}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {nextCursor && (
        <div className={styles.loadMoreRow}>
          <button type="button" className={styles.submitButton} onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
          {loadMoreError && <p className={styles.errorText}>{loadMoreError}</p>}
        </div>
      )}
    </div>
  );
}
