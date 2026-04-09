import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/route";

export const POST = withApiHandler(
  async () =>
    NextResponse.json(
      {
        error: "Waitlist is closed. Please sign up directly.",
        code: "WAITLIST_CLOSED",
      },
      { status: 410 }
    ),
  {
    routeKey: "api:waitlist",
    rateLimit: { limit: 20, windowMs: 60_000 },
  }
);
