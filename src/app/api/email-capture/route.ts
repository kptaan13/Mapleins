import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler, parseJsonBody } from "@/lib/api/route";
import { verifyCaptcha } from "@/lib/captcha";
import { getClientIp } from "@/lib/rate-limit";

const emailCaptureSchema = z.object({
  email: z.string().email().max(320),
  captchaToken: z.string().min(1).max(4000).optional().nullable(),
});

export const POST = withApiHandler(
  async (req: NextRequest) => {
    const { email, captchaToken } = await parseJsonBody(req, emailCaptureSchema);

    await verifyCaptcha({
      token: captchaToken,
      ip: getClientIp(req),
      expectedAction: "email_capture",
    });

    const supabase = await createClient();
    const { error } = await supabase
      .from("email_signups")
      .insert({ email: email.toLowerCase().trim() });

    if (error && error.code !== "23505") {
      console.error("email_signups insert error:", error);
      return NextResponse.json({ error: "Failed to save email signup." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  },
  {
    routeKey: "api:email-capture",
    rateLimit: { limit: 20, windowMs: 60_000 },
  }
);

