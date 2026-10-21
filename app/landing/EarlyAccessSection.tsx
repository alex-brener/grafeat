"use client";

import { useState } from "react";
import { useLandingDemo } from "./DemoContext";
import { frequencyOptions, NOT_DAILY_ANSWER } from "./content";
import styles from "./EarlyAccessSection.module.css";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function EarlyAccessSection() {
  const { formRef, timeAnswer } = useLandingDemo();

  const [account, setAccount] = useState("");
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState<string | null>(null);
  const [pain, setPain] = useState("");
  const [beta, setBeta] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const hasTime = !!timeAnswer && timeAnswer !== NOT_DAILY_ANSWER;
  const timeAnswerLower = (timeAnswer ?? "").toLowerCase();

  function handleSubmit() {
    const acct = account.trim();
    if (!acct) {
      setError("Add your challenge account so we can look at it.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("That email doesn't look right.");
      return;
    }
    setError("");
    setSubmitted(true);
  }

  const acct = account.trim();
  const accountShown = acct ? (acct.startsWith("@") ? acct : `@${acct}`) : "";
  const thanksBody = beta
    ? "We read every answer. Because you'd like to try it with your real challenge, we'll email you to find a time to set it up together."
    : "We read every answer and will email you when early access opens.";

  return (
    <section id="early-access" ref={formRef} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Early access · research program</div>
          <h2 className={styles.heading}>Run an Instagram challenge?</h2>
          <p className={styles.lede}>
            We&apos;re building this for challenge organizers. Tell us how you currently curate
            submissions and get early access.
          </p>
          <p className={styles.fine}>
            We&apos;re looking for a small group of organizers to try it on a real challenge, with
            us setting it up alongside you.
          </p>
        </div>

        {!submitted && (
          <div className={styles.form}>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                Your challenge&apos;s Instagram account
                <input
                  value={account}
                  onChange={(e) => {
                    setAccount(e.target.value);
                    setError("");
                  }}
                  placeholder="@yourchallenge"
                  className={styles.input}
                />
              </label>
              <label className={styles.field}>
                Email
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  type="email"
                  placeholder="you@studio.com"
                  className={styles.input}
                />
              </label>
            </div>

            <div className={styles.freqBlock}>
              <span className={styles.freqLabel}>How often does your challenge run?</span>
              <div className={styles.freqOptions}>
                {frequencyOptions.map((label) =>
                  freq === label ? (
                    <span key={label} className={styles.freqOptionOn}>
                      {label}
                    </span>
                  ) : (
                    <button
                      key={label}
                      type="button"
                      className={styles.freqOptionOff}
                      onClick={() => setFreq(label)}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <label className={styles.field}>
              What&apos;s the most time-consuming part of running your challenge today?
              <textarea
                value={pain}
                onChange={(e) => setPain(e.target.value)}
                rows={4}
                placeholder="e.g. Scrolling the hashtag every night and copying handles into my notes app"
                className={styles.textarea}
              />
            </label>

            {hasTime && (
              <div className={styles.timeFromDemo}>
                From the demo: by hand, a daily feature takes you <strong>{timeAnswerLower}</strong>.
              </div>
            )}

            <div
              role="checkbox"
              aria-checked={beta}
              tabIndex={0}
              onClick={() => setBeta((b) => !b)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setBeta((b) => !b);
                }
              }}
              className={styles.betaRow}
            >
              {beta ? (
                <span className={styles.betaCheckOn}>✓</span>
              ) : (
                <span className={styles.betaCheckOff} />
              )}
              <div className={styles.betaText}>
                <span className={styles.betaTitle}>
                  I&apos;d like to try it with my actual challenge
                </span>
                <span className={styles.betaSubtitle}>
                  Current or next edition. We&apos;ll reach out to set it up together.
                </span>
              </div>
            </div>

            <div className={styles.submitRow}>
              <button type="button" onClick={handleSubmit} className={styles.submitButton}>
                Get early access
              </button>
              {error && <span className={styles.errorText}>{error}</span>}
            </div>
          </div>
        )}

        {submitted && (
          <div className={styles.thanks}>
            <span className={styles.thanksMark}>✓</span>
            <h3 className={styles.thanksHeading}>Thank you, {accountShown}.</h3>
            <p className={styles.thanksBody}>{thanksBody}</p>
          </div>
        )}
      </div>
    </section>
  );
}
