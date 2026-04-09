import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler, parseJsonBody } from "@/lib/api/route";
import { getClientIp } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";
import { ApiError } from "@/lib/api/error";

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  message: z.string().trim().min(1).max(3000),
  email: z.string().email().max(320).nullable().optional(),
  page: z.string().trim().max(256).nullable().optional(),
  captchaToken: z.string().min(1).max(4000).optional().nullable(),
});

export const POST = withApiHandler(
  async (req: NextRequest) => {
    const { rating, category, message, email, page, captchaToken } = await parseJsonBody(
      req,
      feedbackSchema
    );

    await verifyCaptcha({
      token: captchaToken,
      ip: getClientIp(req),
      expectedAction: "feedback_submit",
    });

    const supabase = await createClient();
    const { error } = await supabase.from("feedback").insert({
      rating: rating ?? null,
      category: category ?? null,
      message: message.trim(),
      email: email?.trim().toLowerCase() || null,
      page: page ?? null,
    });

    if (error) {
      throw new ApiError(500, "Failed to save feedback.", {
        code: "FEEDBACK_INSERT_FAILED",
        details: error.message,
      });
    }

    return NextResponse.json({ success: true });
  },
  {
    routeKey: "api:feedback-post",
    rateLimit: { limit: 10, windowMs: 60_000 },
  }
);

export const GET = withApiHandler(
  async (req: NextRequest) => {
    const checkRes = await fetch(new URL("/api/admin/check", req.url), {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    const checkBody = (await checkRes.json()) as { admin?: boolean };
    if (!checkRes.ok || checkBody.admin !== true) {
      throw new ApiError(401, "Unauthorized", { code: "UNAUTHORIZED" });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new ApiError(500, "Failed to load feedback.", {
        code: "FEEDBACK_FETCH_FAILED",
        details: error.message,
      });
    }

    return NextResponse.json({ feedback: data });
  },
  {
    routeKey: "api:feedback-get",
    rateLimit: { limit: 60, windowMs: 60_000 },
  }
);

