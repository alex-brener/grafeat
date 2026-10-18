export const metadata = {
  title: "Privacy Policy — Challenge Curator Spike",
};

export default function PrivacyPolicyPage() {
  return (
    <main>
      <h1>Privacy Policy — Challenge Curator Spike</h1>
      <p>Last updated: October 18, 2026</p>

      <p>
        Challenge Curator Spike is a technical test application used to evaluate the
        Instagram API (Meta Platform) ahead of building a production product. It is not a
        public consumer product.
      </p>

      <h2>What data this application may receive</h2>
      <p>While testing the Instagram integration, this application may receive:</p>
      <ul>
        <li>Instagram account and profile identifiers (e.g. user ID, username)</li>
        <li>Media metadata (e.g. media ID, media type, timestamps, permalinks, thumbnail/media URLs)</li>
        <li>Captions and @mentions associated with Instagram posts</li>
        <li>Webhook event data sent by Meta when test posts mention or tag a connected account</li>
      </ul>

      <h2>How this data is used</h2>
      <p>
        Data received is used solely to test and validate the Instagram integration
        described above — for example, confirming that posts can be discovered,
        retrieved, and processed correctly. It is not sold, shared with third parties, or
        used for advertising or any purpose unrelated to this testing.
      </p>

      <h2>Data retention</h2>
      <p>
        This application does not maintain a production database of user data. Any data
        captured during testing is limited to temporary logs and test fixtures used to
        validate API behavior, and is deleted or redacted as part of normal development
        cleanup.
      </p>

      <h2>Data deletion</h2>
      <p>
        You can request deletion of any data associated with your Instagram account that
        this application may have received. See our{" "}
        <a href="/data-deletion">Data Deletion instructions</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or this application: <a href="mailto:a@brener.digital">a@brener.digital</a>.
      </p>
    </main>
  );
}
