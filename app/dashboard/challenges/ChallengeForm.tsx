"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listTimeZones } from "@/lib/timezone";
import styles from "./Challenges.module.css";

// "UTC" itself isn't enumerated by Intl.supportedValuesOf("timeZone") even
// though it's a valid zone (lib/timezone.ts's isValidTimeZone confirms
// that) — prepended explicitly so organizers who want it can pick it.
const timeZones = ["UTC", ...listTimeZones()];

type Props =
  | {
      mode: "create";
      defaultRequiredMention: string;
    }
  | {
      mode: "edit";
      challengeId: string;
      initial: {
        name: string;
        startDate: string;
        endDate: string;
        timezone: string;
        status: "draft" | "active";
      };
    };

export function ChallengeForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.mode === "edit" ? props.initial.name : "");
  const [hashtag, setHashtag] = useState("");
  const [requiredMention, setRequiredMention] = useState(
    props.mode === "create" ? props.defaultRequiredMention : ""
  );
  const [startDate, setStartDate] = useState(props.mode === "edit" ? props.initial.startDate : "");
  const [endDate, setEndDate] = useState(props.mode === "edit" ? props.initial.endDate : "");
  const [timezone, setTimezone] = useState(props.mode === "edit" ? props.initial.timezone : "");
  const [status, setStatus] = useState<"draft" | "active">(
    props.mode === "edit" ? props.initial.status : "draft"
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Default to the organizer's own browser timezone — computed client-side
  // only, after mount, so the server-rendered markup (which runs with
  // TZ=UTC on Vercel) never mismatches what hydrates in the browser.
  useEffect(() => {
    if (props.mode === "create" && !timezone) {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (props.mode === "create") {
        const res = await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, hashtag, requiredMention, startDate, endDate, timezone }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        router.push(`/dashboard/challenges/${data.id}`);
      } else {
        const res = await fetch(`/api/challenges/${props.challengeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, startDate, endDate, timezone, status }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        router.push(`/dashboard/challenges/${props.challengeId}`);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.errorText}>{error}</p>}

      <label className={styles.field}>
        Name
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Creative October 2026"
          required
        />
      </label>

      {props.mode === "create" && (
        <>
          <label className={styles.field}>
            Hashtag
            <input
              className={styles.input}
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              placeholder="creativeoctober2026"
              required
            />
            <span className={styles.hint}>Can&apos;t be changed after the challenge is created.</span>
          </label>

          <label className={styles.field}>
            Required mention
            <input
              className={styles.input}
              value={requiredMention}
              onChange={(e) => setRequiredMention(e.target.value)}
              placeholder="yourstudio"
              required
            />
            <span className={styles.hint}>
              The @username submissions must mention to be verified.
            </span>
          </label>
        </>
      )}

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Start date
          <input
            type="date"
            className={styles.input}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          End date
          <input
            type="date"
            className={styles.input}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </label>
      </div>

      <label className={styles.field}>
        Timezone
        <select
          className={styles.select}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          required
        >
          {!timezone && <option value="">Select a timezone…</option>}
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <span className={styles.hint}>Submission dates are evaluated in this timezone.</span>
      </label>

      {props.mode === "edit" && (
        <label className={styles.field}>
          Status
          <select
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "active")}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
          <span className={styles.hint}>Draft challenges aren&apos;t synchronized yet.</span>
        </label>
      )}

      <button type="submit" className={styles.submitButton} disabled={submitting}>
        {submitting ? "Saving…" : props.mode === "create" ? "Create challenge" : "Save changes"}
      </button>
    </form>
  );
}
