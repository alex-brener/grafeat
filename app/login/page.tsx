"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

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
    <main style={{ maxWidth: 420, margin: "80px auto", padding: "0 24px", fontFamily: "var(--font-albert-sans, system-ui)" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Sign in to Grafeat</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>
        We&apos;ll email you a link — no password needed.
      </p>

      {status === "sent" ? (
        <p role="status">
          Check <strong>{email}</strong> for a sign-in link. It expires in 5 minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 8 }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, fontSize: 16, marginBottom: 16, boxSizing: "border-box" }}
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            style={{ width: "100%", padding: 12, fontSize: 16, cursor: "pointer" }}
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          {status === "error" && (
            <p role="alert" style={{ color: "#b00020", marginTop: 12 }}>
              {errorMessage}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
