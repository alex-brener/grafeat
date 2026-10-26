"use client";

import { useState } from "react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import logoMark from "../icon.png";
import styles from "./Login.module.css";

/**
 * Email magic-link sign-in only for Slice A (Google is deferred — see
 * HANDOVER.md). No password field: entering an email either signs in an
 * existing organizer or creates their account, matching magicLinkClient's
 * default disableSignUp=false behavior.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.logo}>
          <Image src={logoMark} alt="" width={26} height={26} className={styles.logoMark} priority />
          Grafeat
        </a>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Sign in to Grafeat</h1>
          <p className={styles.lede}>We&apos;ll email you a link — no password needed.</p>

          {status === "sent" ? (
            <p role="status" className={styles.sentStatus}>
              Check <strong>{email}</strong> for a sign-in link. It expires in 5 minutes.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="email" className={styles.field}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
              <button type="submit" disabled={status === "sending"} className={styles.submitButton}>
                {status === "sending" ? "Sending…" : "Send sign-in link"}
              </button>
              {status === "error" && (
                <p role="alert" className={styles.errorText}>
                  {errorMessage}
                </p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
