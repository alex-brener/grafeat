"use client";

import { useRouter } from "next/navigation";
import styles from "./Challenges.module.css";

export interface SwitcherChallenge {
  id: string;
  name: string;
}

/**
 * A native <select> rather than a custom dropdown — keyboard/focus support
 * (UX-A locked decision #7) comes for free, and at pilot scale (a handful
 * of challenges per workspace) there's no reason to build a richer control.
 */
export function ChallengeSwitcher({ challenges, currentId }: { challenges: SwitcherChallenge[]; currentId: string }) {
  const router = useRouter();
  if (challenges.length <= 1) return null;
  return (
    <select
      className={styles.challengeSwitcher}
      value={currentId}
      onChange={(e) => router.push(`/dashboard/challenges/${e.target.value}`)}
      aria-label="Switch challenge"
    >
      {challenges.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
