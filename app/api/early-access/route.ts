import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { createEarlyAccessHandler } from "@/lib/early-access-handler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // getDb() called here (request time), not at module scope — consistent
  // with every other route in this codebase; a missing DATABASE_URL must
  // not break the ability to even load this module.
  return createEarlyAccessHandler(getDb())(req);
}
