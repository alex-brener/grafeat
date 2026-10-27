"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Challenges.module.css";

export function SyncButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setIsError(true);
        setMessage(data.error ?? "Sync failed.");
      } else {
        setIsError(data.status === "error");
        const s = data.summary;
        const rateLimitNote = data.rateLimitedUntil
          ? ` Meta rate-limited this connection — try again after ${new Date(data.rateLimitedUntil).toLocaleTimeString()}.`
          : "";
        setMessage(
          `Sync ${data.status}. Discovered ${s.newCandidates} new (${s.existingCandidates} already known), processed ${s.attempted} (${s.completed} completed, ${s.permanentFailures} permanently failed).${rateLimitNote}`
        );
        router.refresh();
      }
    } catch {
      setIsError(true);
      setMessage("Network error — please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <button type="button" className={styles.submitButton} onClick={handleSync} disabled={syncing}>
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {message && <p className={`${isError ? styles.errorText : styles.hint} ${styles.syncMessage}`}>{message}</p>}
    </div>
  );
}
