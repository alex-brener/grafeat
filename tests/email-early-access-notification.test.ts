import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEarlyAccessNotification } from "@/lib/email";

const ENV_KEYS = ["RESEND_API_KEY", "MAGIC_LINK_FROM_EMAIL", "EARLY_ACCESS_NOTIFY_EMAIL"] as const;
const originalEnv: Record<string, string | undefined> = {};

const sampleData = {
  account: "@creativeoctober",
  email: "organizer@example.com",
  frequency: "Once a year",
  painPoint: "Scrolling the hashtag every night",
  wantsBeta: false,
};

describe("sendEarlyAccessNotification", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("throws when the provider isn't configured, without calling fetch", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAGIC_LINK_FROM_EMAIL;
    delete process.env.EARLY_ACCESS_NOTIFY_EMAIL;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(sendEarlyAccessNotification(sampleData)).rejects.toThrow(/not configured/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to Resend with the configured recipient when fully configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.MAGIC_LINK_FROM_EMAIL = "noreply@grafeat.app";
    process.env.EARLY_ACCESS_NOTIFY_EMAIL = "team@grafeat.app";
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);

    await sendEarlyAccessNotification(sampleData);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body.to).toBe("team@grafeat.app");
    expect(body.from).toBe("noreply@grafeat.app");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
  });

  it("throws when Resend responds with a non-ok status", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.MAGIC_LINK_FROM_EMAIL = "noreply@grafeat.app";
    process.env.EARLY_ACCESS_NOTIFY_EMAIL = "team@grafeat.app";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(sendEarlyAccessNotification(sampleData)).rejects.toThrow(/failed to send/i);
  });

  it("throws on a network-level failure", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.MAGIC_LINK_FROM_EMAIL = "noreply@grafeat.app";
    process.env.EARLY_ACCESS_NOTIFY_EMAIL = "team@grafeat.app";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(sendEarlyAccessNotification(sampleData)).rejects.toThrow("network down");
  });
});
