import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMetaGraphClient, MetaGraphError } from "@/lib/meta-graph";

function mockFetchOnce(status: number, body: unknown, headers: Record<string, string> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status, headers })
    )
  );
}

describe("createMetaGraphClient error classification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies an OAuthException (code 190) as token_invalid", async () => {
    mockFetchOnce(401, { error: { message: "Error validating access token", type: "OAuthException", code: 190 } });
    const client = createMetaGraphClient("token");
    await expect(client.fetchRecentMedia("ig-1", "hashtag-1")).rejects.toMatchObject({ kind: "token_invalid" } satisfies Partial<MetaGraphError>);
  });

  it("classifies a 429 as rate_limited and captures Retry-After", async () => {
    mockFetchOnce(429, { error: { message: "rate limited", code: 4 } }, { "retry-after": "30" });
    const client = createMetaGraphClient("token");
    try {
      await client.fetchRecentMedia("ig-1", "hashtag-1");
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MetaGraphError);
      expect((err as MetaGraphError).kind).toBe("rate_limited");
      expect((err as MetaGraphError).retryAfterSeconds).toBe(30);
    }
  });

  it("classifies a permissions error distinctly from token_invalid", async () => {
    mockFetchOnce(403, { error: { message: "permission denied", type: "OAuthException", code: 10 } });
    const client = createMetaGraphClient("token");
    await expect(client.fetchRecentMedia("ig-1", "hashtag-1")).rejects.toMatchObject({ kind: "permissions" });
  });

  it("[regression, confirmed live 2026-10-27] fetchMentionedMedia resolves not_mentioned for Meta's actual 'not mentioned' error shape, not a permissions failure", async () => {
    // The exact response observed from graph.facebook.com for a genuine
    // hashtag-only (non-mentioning) post — HTTP 400, code 10, OAuthException.
    mockFetchOnce(400, { error: { message: "(#10) User is not mentioned in the caption.", type: "OAuthException", code: 10, fbtrace_id: "A33sGisMt3bX1VFx3OaNXN8" } });
    const client = createMetaGraphClient("token");
    const result = await client.fetchMentionedMedia("ig-1", "m1");
    expect(result.outcome).toBe("not_mentioned");
  });

  it("a genuinely different code-10 message (not the confirmed 'not mentioned' text) still classifies as a real permissions error", async () => {
    mockFetchOnce(400, { error: { message: "(#10) This endpoint requires the pages_read_engagement permission.", type: "OAuthException", code: 10 } });
    const client = createMetaGraphClient("token");
    await expect(client.fetchMentionedMedia("ig-1", "m1")).rejects.toMatchObject({ kind: "permissions" });
  });

  it("classifies a 5xx as transient", async () => {
    mockFetchOnce(503, { error: { message: "internal error" } });
    const client = createMetaGraphClient("token");
    await expect(client.fetchRecentMedia("ig-1", "hashtag-1")).rejects.toMatchObject({ kind: "transient" });
  });

  it("classifies a network failure (fetch throws) as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const client = createMetaGraphClient("token");
    await expect(client.fetchRecentMedia("ig-1", "hashtag-1")).rejects.toMatchObject({ kind: "transient" });
  });

  it("never includes the access token in a thrown error's message", async () => {
    mockFetchOnce(401, { error: { message: "Error validating access token ya29.supersecrettoken", type: "OAuthException", code: 190 } });
    const client = createMetaGraphClient("super-secret-access-token");
    try {
      await client.fetchRecentMedia("ig-1", "hashtag-1");
      throw new Error("expected to throw");
    } catch (err) {
      expect(JSON.stringify(err)).not.toContain("super-secret-access-token");
    }
  });

  it("fetchRecentMedia reports nextAfter null when paging.next is absent, even if cursors.after is present", async () => {
    mockFetchOnce(200, { data: [{ id: "m1", timestamp: "2026-10-16T12:00:00Z" }], paging: { cursors: { after: "some-cursor" } } });
    const client = createMetaGraphClient("token");
    const page = await client.fetchRecentMedia("ig-1", "hashtag-1");
    expect(page.nextAfter).toBeNull();
  });

  it("fetchMentionedMedia resolves not_mentioned when the field comes back empty", async () => {
    mockFetchOnce(200, { id: "ig-1", mentioned_media: {} });
    const client = createMetaGraphClient("token");
    const result = await client.fetchMentionedMedia("ig-1", "m1");
    expect(result.outcome).toBe("not_mentioned");
  });

  it("fetchMentionedMedia resolves inaccessible when the field is entirely absent", async () => {
    mockFetchOnce(200, { id: "ig-1" });
    const client = createMetaGraphClient("token");
    const result = await client.fetchMentionedMedia("ig-1", "m1");
    expect(result.outcome).toBe("inaccessible");
  });

  it("fetchMentionedMedia resolves verified with the mention's data when present", async () => {
    mockFetchOnce(200, { id: "ig-1", mentioned_media: { username: "participant", caption: "cap", media_type: "IMAGE", media_url: "https://example.com/a.jpg", permalink: "https://instagram.com/p/abc" } });
    const client = createMetaGraphClient("token");
    const result = await client.fetchMentionedMedia("ig-1", "m1");
    expect(result.outcome).toBe("verified");
    if (result.outcome === "verified") {
      expect(result.data.username).toBe("participant");
      expect(result.data.mediaUrl).toBe("https://example.com/a.jpg");
    }
  });
});
