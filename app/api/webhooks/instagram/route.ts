import { NextRequest, NextResponse } from "next/server";
import { logEvent, saveFixture } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Meta's webhook verification handshake. Called once when you click
 * "Verify and Save" on the Instagram webhook subscription in the app dashboard.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const expected = process.env.WEBHOOK_VERIFY_TOKEN;
  const ok = mode === "subscribe" && !!expected && token === expected;

  await logEvent({
    testCaseId: "webhook.verify",
    endpoint: "/api/webhooks/instagram",
    method: "GET",
    params: { mode, tokenProvided: !!token },
    status: ok ? 200 : 403,
    result: ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - start,
  });

  if (!ok) {
    return new NextResponse("verification failed", { status: 403 });
  }
  return new NextResponse(challenge ?? "", { status: 200 });
}

/**
 * Receives mention/tag webhook deliveries. Must respond quickly (2xx within
 * a few seconds) or Meta will retry/disable the subscription.
 */
export async function POST(req: NextRequest) {
  const start = Date.now();
  const body = await req.json().catch(() => null);

  const fixturePath = await saveFixture("webhook-delivery", body);

  await logEvent({
    testCaseId: "webhook.receive",
    endpoint: "/api/webhooks/instagram",
    method: "POST",
    status: 200,
    response: body,
    result: "INFO",
    notes: `saved to ${fixturePath}`,
    latencyMs: Date.now() - start,
  });

  return NextResponse.json({ received: true });
}
