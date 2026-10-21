import type { Metadata } from "next";
import { LegalShell } from "../legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — Grafeat",
  description:
    "How Grafeat collects, uses, and protects information from organizers and public Instagram submissions.",
};

const LAST_UPDATED = "October 22, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This policy explains what information Grafeat collects, how we use it, and the choices available to organizers who connect an Instagram account and to the creators whose public work Grafeat may discover on their behalf."
    >
      <section>
        <h2>1. Who operates Grafeat</h2>
        <p>
          Grafeat is operated by Brener Digital LLC, a Delaware, USA limited liability company
          (&ldquo;Grafeat,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). If you have
          questions about this policy or how your information is handled, contact us at{" "}
          <a href="mailto:a@brener.digital">a@brener.digital</a>.
        </p>
      </section>

      <section>
        <h2>2. Who this policy covers</h2>
        <p>Grafeat involves two kinds of people, and this policy covers information about both:</p>
        <ul>
          <li>
            <strong>Organizers</strong> — people who create an account, connect an Instagram
            professional account, and use Grafeat to curate and publish a recurring challenge.
          </li>
          <li>
            <strong>Participants / creators</strong> — people who post publicly on Instagram and
            whose posts an organizer&rsquo;s challenge may discover through a mention, hashtag, or
            other Meta-approved discovery mechanism. Participants do not register with Grafeat or
            create a Grafeat account.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Information we collect</h2>
        <h3>From organizers</h3>
        <ul>
          <li>Account and contact information you provide to us (such as your email address).</li>
          <li>
            Instagram/Facebook account identifiers returned by Meta&rsquo;s OAuth login flow when
            you connect a professional Instagram account (such as your Instagram user ID and
            username).
          </li>
          <li>
            OAuth access tokens issued by Meta that authorize Grafeat to act on your connected
            account within the permissions you grant.
          </li>
          <li>
            Configuration you enter into Grafeat, such as challenge rules, hashtag templates,
            caption templates, and your selections of which submissions to feature.
          </li>
        </ul>
        <h3>From public Instagram submissions</h3>
        <p>
          When an organizer&rsquo;s challenge discovers a public post — through a caption mention,
          hashtag, native Instagram tag, or another mechanism Meta&rsquo;s APIs make available —
          Grafeat may receive data about that post directly from Meta&rsquo;s APIs, including:
        </p>
        <ul>
          <li>The poster&rsquo;s public Instagram username and account identifier</li>
          <li>Media identifiers, media type, and media URLs</li>
          <li>Captions and hashtags</li>
          <li>Post timestamps and permalinks</li>
          <li>Public engagement metadata made available by the API (such as like or comment counts)</li>
        </ul>
        <p>
          This data comes from Instagram&rsquo;s public API surface for content that participants
          have already made public on Instagram — Grafeat does not access private accounts, private
          messages, or content outside what Meta&rsquo;s APIs expose for a given permission level.
        </p>
      </section>

      <section>
        <h2>4. How Instagram/Meta APIs are used</h2>
        <p>
          Grafeat is built to use Instagram&rsquo;s and Meta&rsquo;s official APIs to help an
          organizer discover eligible submissions to their challenge, retrieve the information
          needed to evaluate and credit them, and — once an organizer reviews and selects specific
          posts — prepare and publish a credited carousel back to the organizer&rsquo;s own connected
          Instagram account.
        </p>
        <p>
          Some discovery mechanisms (for example, searching by hashtag) require a level of Meta API
          access that is subject to Meta&rsquo;s App Review process. Where a capability has not yet
          completed that review, it is not available in the live product, regardless of anything
          described elsewhere on this site. We will update this policy as additional capabilities
          become available.
        </p>
      </section>

      <section>
        <h2>5. OAuth access tokens and connected accounts</h2>
        <p>
          When you connect an Instagram or Facebook account to Grafeat, Meta issues an OAuth access
          token scoped to the specific permissions you approve during that authorization. Grafeat
          stores and uses that token only to make the API calls necessary to provide the service to
          you — it is not used to access anything outside the scopes you granted.
        </p>
        <p>
          You can revoke Grafeat&rsquo;s access at any time from Instagram&rsquo;s or
          Facebook&rsquo;s own account settings (Settings → Apps and Websites, or equivalent).
          Revoking access immediately prevents Grafeat from making further API calls on your behalf.
        </p>
      </section>

      <section>
        <h2>6. Purposes of processing</h2>
        <p>We process the information described above to:</p>
        <ul>
          <li>Operate the organizer-facing curation, composition, and publishing workflow</li>
          <li>Discover and retrieve public submissions relevant to an organizer&rsquo;s challenge</li>
          <li>Evaluate submissions against an organizer&rsquo;s configured rules</li>
          <li>Prepare and publish credited carousels through an organizer&rsquo;s authorized account</li>
          <li>Maintain the security, integrity, and reliability of the service</li>
          <li>Respond to support requests and data-deletion requests</li>
        </ul>
        <p>We do not sell personal information, and we do not use it for advertising.</p>
      </section>

      <section>
        <h2>7. Third-party service providers and infrastructure</h2>
        <p>Grafeat relies on a small number of third parties to operate:</p>
        <ul>
          <li>
            <strong>Meta Platforms, Inc.</strong> — the source of all Instagram/Facebook data
            described in this policy, under Meta&rsquo;s own platform terms and policies.
          </li>
          <li>
            <strong>Vercel</strong> — our hosting and infrastructure provider, which processes
            standard request/connection data as part of serving this application.
          </li>
        </ul>
        <p>
          We do not currently integrate any other third-party analytics, advertising, or data
          processing services. If that changes, we will update this policy.
        </p>
      </section>

      <section>
        <h2>8. Data retention</h2>
        <p>
          We retain organizer and submission data only for as long as reasonably necessary to
          provide the service to the relevant organizer, plus any additional time needed for
          security, troubleshooting, or legal compliance. When data is no longer needed for these
          purposes, we delete or de-identify it. See Section 9 for how to request deletion directly.
        </p>
      </section>

      <section>
        <h2>9. Your privacy rights and requests</h2>
        <p>
          Whether you are an organizer or a participant whose public post was discovered by a
          challenge, you may request access to, correction of, or deletion of information Grafeat
          holds about you or your Instagram account. See our{" "}
          <a href="/data-deletion">Data Deletion instructions</a> for how to submit a request, or
          email us directly at <a href="mailto:a@brener.digital">a@brener.digital</a>.
        </p>
        <p>
          Depending on where you live, you may have additional rights under local law. We will
          honor applicable legal requirements for any request we receive.
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          We use reasonable technical and organizational measures designed to protect the
          information we handle, including restricting access to connected-account tokens and data
          to what the service needs to operate. No method of transmission or storage is completely
          secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>11. International data processing</h2>
        <p>
          Grafeat and the third parties described in Section 7 may process and store information in
          countries other than the one where you live, including the United States. By using
          Grafeat or by posting content that a Grafeat-connected challenge discovers, you understand
          that your information may be processed internationally.
        </p>
      </section>

      <section>
        <h2>12. Children&rsquo;s privacy</h2>
        <p>
          Grafeat is not directed at children and is not intended for use by anyone under the
          minimum age required to maintain an Instagram account under Instagram&rsquo;s own terms.
          We do not knowingly collect personal information directly from children.
        </p>
      </section>

      <section>
        <h2>13. Changes to this policy</h2>
        <p>
          We may update this policy as Grafeat&rsquo;s capabilities change, including as additional
          Instagram/Meta API capabilities become available following App Review. We will update the
          &ldquo;Last updated&rdquo; date above when we do. Material changes will be reflected on
          this page before they take effect.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions about this policy or how Grafeat handles your information:{" "}
          <a href="mailto:a@brener.digital">a@brener.digital</a>.
        </p>
      </section>
    </LegalShell>
  );
}
