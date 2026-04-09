import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, parseJsonBody } from "@/lib/api/route";
import { verifyCaptcha } from "@/lib/captcha";
import { getClientIp } from "@/lib/rate-limit";

const promoRedeemSchema = z.object({
  code: z.string().trim().min(1).max(128),
  captchaToken: z.string().min(1).max(4000).optional().nullable(),
});

export const POST = withApiHandler(
  async (req: NextRequest) => {
    const { code, captchaToken } = await parseJsonBody(req, promoRedeemSchema);
    await verifyCaptcha({
      token: captchaToken,
      ip: getClientIp(req),
      expectedAction: "promo_redeem",
    });

    const validCode = process.env.PROMO_CODE?.trim();
    if (!validCode) {
      return NextResponse.json({ valid: false, error: "Promo code is unavailable." }, { status: 500 });
    }

    if (code.trim().toUpperCase() !== validCode.toUpperCase()) {
      return NextResponse.json({ valid: false, error: "Invalid promo code." }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return NextResponse.json({ valid: true, expiresAt });
  },
  {
    routeKey: "api:promo-redeem",
    rateLimit: { limit: 10, windowMs: 60_000 },
  }
);

