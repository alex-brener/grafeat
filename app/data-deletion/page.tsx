import type { Metadata } from "next";
import { LegalShell } from "../legal/LegalShell";
import styles from "../legal/legal.module.css";

export const metadata: Metadata = {
  title: "Data Deletion — Grafeat",
  description: "How to request deletion of data Grafeat holds about you or your Instagram account.",
};

const LAST_UPDATED = "October 22, 2026";

export default function DataDeletionPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Data Deletion"
      lastUpdated={LAST_UPDATED}
      intro="If Grafeat has received data associated with your Instagram account — whether you're an organizer or a creator whose public post was discovered by a challenge — you can request that it be deleted."
    >
      <section>
        <h2>1. Disconnect your Instagram account</h2>
        <p>
          If you connected an Instagram or Facebook account to Grafeat as an organizer, the
          fastest way to stop any further data collection is to revoke Grafeat&rsquo;s access
          directly from Instagram or Facebook:
        </p>
        <ul>
          <li>Open the Instagram app → Settings → Apps and Websites (or Meta Accounts Center on Facebook)</li>
          <li>Find Grafeat in your list of connected apps</li>
          <li>Remove or revoke its access</li>
        </ul>
        <p>
          This immediately prevents Grafeat from making any further API calls on your behalf. It
          does not by itself delete data already received — request that separately below.
        </p>
      </section>

      <section>
        <h2>2. Request deletion</h2>
        <p>
          Email <a href="mailto:a@brener.digital">a@brener.digital</a> with:
        </p>
        <ul>
          <li>The Instagram username or account ID you&rsquo;d like removed</li>
          <li>
            Whether you were an organizer or a participant, and enough detail to identify the
            relevant data (for example, the challenge name, approximate date, or post involved)
          </li>
        </ul>
        <p>This works whether you&rsquo;re an organizer requesting deletion of your own account&rsquo;s data, or a creator asking us to delete data from a public post a challenge discovered.</p>
      </section>

      <section>
        <h2>3. What happens next</h2>
        <p>
          We will locate and delete the data associated with the account identified in your
          request — including stored tokens, cached submission data, and logs or fixtures tied to
          that account — and confirm back to you by email once this is done.
        </p>
      </section>

      <div className={styles.noteBox}>
        <strong>Note:</strong> deletion requests are currently handled manually by email. See also
        our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
      </div>
    </LegalShell>
  );
}
