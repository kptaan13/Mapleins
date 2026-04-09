import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/route";
import { ApiError } from "@/lib/api/error";

export const POST = withApiHandler(
  async () => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new ApiError(500, "Failed to sign out.", {
        code: "SIGNOUT_FAILED",
        details: error.message,
      });
    }

    return NextResponse.redirect(
      new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
      { status: 302 }
    );
  },
  {
    routeKey: "api:auth-signout",
    rateLimit: { limit: 30, windowMs: 60_000 },
  }
);

