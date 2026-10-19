const REQUIRED_ENV_VARS = [
  "BASE_URL",
  "INSTAGRAM_APP_ID",
  "INSTAGRAM_APP_SECRET",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "WEBHOOK_VERIFY_TOKEN",
];

export default function DiagnosticPage() {
  const baseUrl = process.env.BASE_URL ?? "(BASE_URL not set)";
  const organizerToken = process.env.ORGANIZER_ACCESS_TOKEN;
  const organizerIgUserId = process.env.ORGANIZER_IG_USER_ID;
  const facebookOrganizerToken = process.env.FACEBOOK_ORGANIZER_ACCESS_TOKEN;

  return (
    <main>
      <h1>Instagram API Spike — diagnostic page</h1>
      <p>Not a product UI. Links below exercise Section 1 (auth) and Section 3 (discovery) tests.</p>

      <h2>Env vars</h2>
      <ul>
        {REQUIRED_ENV_VARS.map((key) => (
          <li key={key}>
            {key}: {process.env[key] ? "set" : "MISSING"}
          </li>
        ))}
        <li>
          ORGANIZER_IG_USER_ID: {organizerIgUserId ? organizerIgUserId : "MISSING"}
        </li>
        <li>
          ORGANIZER_ACCESS_TOKEN:{" "}
          {organizerToken
            ? `present, length=${organizerToken.length}, prefix=${organizerToken.slice(0, 4)}…`
            : "MISSING"}
        </li>
        <li>
          FACEBOOK_ORGANIZER_ACCESS_TOKEN:{" "}
          {facebookOrganizerToken
            ? `present, length=${facebookOrganizerToken.length}, prefix=${facebookOrganizerToken.slice(0, 4)}…`
            : "MISSING"}
        </li>
      </ul>

      <h2>Auth (Section 1)</h2>
      <ul>
        <li>
          <a href="/api/auth/instagram/start">Start — Instagram API with Instagram Login</a>
        </li>
        <li>
          <a href="/api/auth/facebook/start">Start — Facebook Login + Instagram Graph API</a>
        </li>
      </ul>

      <h2>Discovery (Section 3)</h2>
      <ul>
        <li>
          Webhook callback URL to register in the Meta app dashboard:
          <br />
          <code>{baseUrl}/api/webhooks/instagram</code>
        </li>
        <li>
          <a href="/api/discovery/poll">Poll fallback (needs igUserId + accessToken query params, or ORGANIZER_IG_USER_ID / ORGANIZER_ACCESS_TOKEN env)</a>
        </li>
        <li>
          <a href="/api/discovery/mentioned-media?mediaId=18105213724723381">
            mentioned_media retrieval probe (Facebook Login) — defaults to a known historical #callivember media ID; pass ?mediaId= to override
          </a>
        </li>
      </ul>

      <h2>Meta app publication requirements</h2>
      <ul>
        <li>
          <a href="/privacy">Privacy Policy</a>
        </li>
        <li>
          <a href="/data-deletion">Data Deletion instructions</a>
        </li>
        <li>
          <a href="/terms">Terms of Use</a>
        </li>
      </ul>

      <p>
        See <code>META-SETUP.md</code> for the Meta app configuration this depends on, and{" "}
        <code>SPIKE-RESULTS.md</code> for recorded outcomes.
      </p>
    </main>
  );
}
