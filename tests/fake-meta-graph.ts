import { MetaGraphError, type MetaGraphClient, type RecentMediaItem, type MentionedMediaResult } from "@/lib/meta-graph";

/**
 * In-memory fake MetaGraphClient for discovery/processing/sync tests — no
 * network, no fetch mocking. `pages` is indexed by cursor key: undefined/""
 * means "page 1". `mentions` maps mediaId -> the result fetchMentionedMedia
 * should return (or an error to throw) for that id.
 */
export interface FakePage {
  items: RecentMediaItem[];
  nextAfter: string | null;
}

export function createFakeMetaGraphClient(opts: {
  hashtagId?: string;
  pages?: Record<string, FakePage>;
  mentions?: Record<string, MentionedMediaResult | MetaGraphError>;
  onSearchHashtag?: () => void;
  onFetchRecentMedia?: (after?: string | null) => void;
  onFetchMentionedMedia?: (mediaId: string) => void;
}): MetaGraphClient {
  const pages = opts.pages ?? {};
  const mentions = opts.mentions ?? {};
  return {
    async searchHashtag() {
      opts.onSearchHashtag?.();
      return opts.hashtagId ?? "fake-hashtag-id";
    },
    async fetchRecentMedia(_igUserId, _hashtagId, after) {
      opts.onFetchRecentMedia?.(after);
      const key = after ?? "page1";
      const page = pages[key];
      if (!page) return { items: [], nextAfter: null };
      return page;
    },
    async fetchMentionedMedia(_igUserId, mediaId) {
      opts.onFetchMentionedMedia?.(mediaId);
      const result = mentions[mediaId];
      if (result instanceof MetaGraphError) throw result;
      return result ?? { outcome: "not_mentioned" };
    },
  };
}
