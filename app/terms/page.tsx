import type { Metadata } from "next";
import { LegalShell } from "../legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — Grafeat",
  description: "The terms that govern use of Grafeat by challenge organizers.",
};

const LAST_UPDATED = "October 22, 2026";

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of Grafeat. By connecting an Instagram account or otherwise using Grafeat, you agree to these terms."
    >
      <section>
        <h2>1. Service description</h2>
        <p>
          Grafeat is a tool for organizers of recurring creative challenges on Instagram. It helps
          an organizer discover public submissions to their challenge, evaluate them against rules
          the organizer configures, curate a selection, prepare a credited carousel, and publish or
          schedule that carousel through the organizer&rsquo;s own authorized Instagram professional
          account.
        </p>
        <p>
          Some capabilities described on this site depend on Meta App Review and are not available
          until that review is complete. We do not represent any capability as live in the product
          before it is.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be of legal age to form a binding contract in your jurisdiction, and you must
          have the authority to connect and act on behalf of the Instagram professional account you
          connect to Grafeat — whether it is your own account or one you are authorized to manage
          (for example, on behalf of a brand, community, or organization).
        </p>
      </section>

      <section>
        <h2>3. Organizer responsibilities</h2>
        <p>As an organizer, you are responsible for:</p>
        <ul>
          <li>The accuracy of the challenge rules, hashtags, and templates you configure</li>
          <li>Reviewing submissions and selections before anything is published to your account</li>
          <li>Complying with Instagram&rsquo;s and Meta&rsquo;s own platform policies in how you run your challenge and communicate with participants</li>
          <li>Anything published to your connected Instagram account using Grafeat, since publishing only happens through your own authorized account and at your direction</li>
        </ul>
      </section>

      <section>
        <h2>4. Instagram/Meta platform dependency</h2>
        <p>
          Grafeat depends on Instagram&rsquo;s and Meta&rsquo;s APIs, policies, and review processes,
          which are outside our control and may change at any time. Meta may restrict, rate-limit,
          or suspend API access in ways that affect Grafeat&rsquo;s functionality, including
          discovery, retrieval, or publishing. We are not responsible for disruptions caused by
          changes to Meta&rsquo;s platform.
        </p>
      </section>

      <section>
        <h2>5. Content ownership</h2>
        <p>
          Grafeat does not claim ownership of any content — neither the organizer&rsquo;s own
          account and brand content, nor the creative work posted by participants. Creators retain
          all rights to their own work. Grafeat&rsquo;s role is limited to helping an organizer
          discover, evaluate, and — at the organizer&rsquo;s direction — republish eligible
          submissions.
        </p>
      </section>

      <section>
        <h2>6. Permission to republish participants&rsquo; work</h2>
        <p>
          <strong>
            A participant&rsquo;s Instagram post being public, or mentioning or tagging your
            account, does not by itself grant you the right to republish that work.
          </strong>{" "}
          You are solely responsible for obtaining whatever permission, consent, or license is
          necessary from a creator before republishing their work as part of a Grafeat-assisted
          feature — including complying with any rules, terms, or participation requirements you
          have set for your own challenge, and with the creator&rsquo;s own rights under copyright
          and other applicable law.
        </p>
        <p>
          Grafeat provides tools to help you organize and credit submissions, but we do not verify,
          guarantee, or take responsibility for whether you have obtained the rights needed to
          republish any specific piece of work. If you collect participation terms from creators
          (for example, by requiring them to agree to specific rules before entering your
          challenge), that agreement is between you and your participants — Grafeat is not a party
          to it.
        </p>
      </section>

      <section>
        <h2>7. Attribution and creator credits</h2>
        <p>
          Grafeat is designed to help you keep creator credits accurate and in the order your
          carousel is published — for example, by tying numbered caption credits to slide order.
          You remain responsible for reviewing and confirming that credits are correct before you
          publish, and for any attribution requirements beyond what Grafeat automates.
        </p>
      </section>

      <section>
        <h2>8. Acceptable use</h2>
        <p>You agree not to use Grafeat to:</p>
        <ul>
          <li>Violate any applicable law, or Instagram&rsquo;s or Meta&rsquo;s platform terms and policies</li>
          <li>Access, discover, or process Instagram content outside the scope of a permission Meta has granted</li>
          <li>Harass, impersonate, or misrepresent your relationship with any creator or participant</li>
          <li>Interfere with or attempt to circumvent Grafeat&rsquo;s security or rate limits</li>
          <li>Use Grafeat for any purpose other than operating a legitimate creative challenge</li>
        </ul>
      </section>

      <section>
        <h2>9. Account connections and authorization</h2>
        <p>
          Connecting an Instagram or Facebook account authorizes Grafeat, through Meta&rsquo;s OAuth
          flow, to act on that account within the specific permissions you approve — and no further.
          You can revoke this authorization at any time from your Instagram or Facebook account
          settings, which immediately stops Grafeat from making further API calls on your behalf.
        </p>
      </section>

      <section>
        <h2>10. Service availability and changes</h2>
        <p>
          Grafeat is an early-stage product. Features, including those described on this site, may
          change, be limited, or be temporarily or permanently unavailable, including while Meta App
          Review for specific capabilities is pending. We do not guarantee uninterrupted availability
          and may modify or discontinue parts of the service at any time.
        </p>
      </section>

      <section>
        <h2>11. Disclaimers</h2>
        <p>
          Grafeat is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties
          of any kind, express or implied, including any warranty of merchantability, fitness for a
          particular purpose, or non-infringement. We do not warrant that discovery, retrieval, or
          publishing through Instagram&rsquo;s APIs will be complete, accurate, or uninterrupted.
        </p>
      </section>

      <section>
        <h2>12. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Grafeat and Brener Digital LLC will not be liable
          for any indirect, incidental, special, consequential, or punitive damages, or for any loss
          of data, revenue, or goodwill, arising from your use of or inability to use the service —
          including any consequences arising from content you choose to publish through your
          connected Instagram account.
        </p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <p>
          You may stop using Grafeat and disconnect your Instagram account at any time. We may
          suspend or terminate your access if you violate these terms, violate Instagram&rsquo;s or
          Meta&rsquo;s platform policies, or if we discontinue the service or a feature you rely on.
        </p>
      </section>

      <section>
        <h2>14. Changes to these terms</h2>
        <p>
          We may update these terms as Grafeat changes. We will update the &ldquo;Last
          updated&rdquo; date above when we do, and material changes will be reflected on this page
          before they take effect. Continued use of Grafeat after changes take effect constitutes
          acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:a@brener.digital">a@brener.digital</a>. See
          also our <a href="/privacy">Privacy Policy</a> and{" "}
          <a href="/data-deletion">Data Deletion instructions</a>.
        </p>
      </section>
    </LegalShell>
  );
}
