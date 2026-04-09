import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/route";
import { ApiError } from "@/lib/api/error";
import { retryAsync } from "@/lib/net";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(500, "STRIPE_SECRET_KEY is not set", { code: "STRIPE_NOT_CONFIGURED" });
  return new Stripe(key);
}

const amountSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((value) => Number.parseInt(value, 10));

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const amountParam = new URL(request.url).searchParams.get("amount") || "500";
    const parsedAmount = amountSchema.safeParse(amountParam);
    const rawAmount = parsedAmount.success ? parsedAmount.data : 500;
    const amountCents = Math.min(100000, Math.max(100, rawAmount));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const successUrl = `${baseUrl}/donate?status=success`;
    const cancelUrl = `${baseUrl}/donate?status=cancelled`;

    const stripe = getStripe();
    const session = await retryAsync(
      () =>
        stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card", "link"],
          line_items: [
            {
              price_data: {
                currency: "cad",
                product_data: {
                  name: "Donation to Mapleins",
                  description:
                    "Support Mapleins - free Canadian resume and job-matching tools for job seekers.",
                  images: [],
                },
                unit_amount: amountCents,
              },
              quantity: 1,
            },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            ...(user ? { userId: String(user.id) } : {}),
            type: "donation",
          },
        }),
      { retries: 2, timeoutMs: 10000 }
    );

    if (!session.url) {
      throw new ApiError(500, "Could not create checkout session.", {
        code: "STRIPE_SESSION_FAILED",
      });
    }

    return NextResponse.json({ url: session.url });
  },
  {
    routeKey: "api:donate-checkout",
    rateLimit: { limit: 30, windowMs: 60_000 },
  }
);

