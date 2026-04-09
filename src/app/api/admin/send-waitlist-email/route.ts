import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/route";

const CLOSED_RESPONSE = {
  error: "Waitlist email sending is retired because the product is live.",
  code: "WAITLIST_RETIRED",
};

export const GET = withApiHandler(
  async () => NextResponse.json(CLOSED_RESPONSE, { status: 410 }),
  {
    routeKey: "api:admin-send-waitlist-email-get",
    rateLimit: { limit: 20, windowMs: 60_000 },
  }
);

export const POST = withApiHandler(
  async () => NextResponse.json(CLOSED_RESPONSE, { status: 410 }),
  {
    routeKey: "api:admin-send-waitlist-email-post",
    rateLimit: { limit: 20, windowMs: 60_000 },
  }
);
