"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./Dashboard.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={pending} className={styles.signOutButton}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
