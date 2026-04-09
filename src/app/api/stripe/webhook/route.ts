import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { withApiHandler } from "@/lib/api/route";
import { ApiError } from "@/lib/api/error";
import { retryAsync } from "@/lib/net";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(500, "Stripe is not configured.", { code: "STRIPE_NOT_CONFIGURED" });
  return new Stripe(key);
}

const webhookMetaSchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.string().optional(),
});

async function processCompletedSession(session: Stripe.Checkout.Session) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || serviceKey === "your_service_role_key_here") {
    throw new ApiError(500, "Supabase service role is not configured.", {
      code: "SUPABASE_NOT_CONFIGURED",
    });
  }

  const parsedMeta = webhookMetaSchema.safeParse(session.metadata ?? {});
  const userId = parsedMeta.success ? parsedMeta.data.userId : undefined;
  const isDonation = parsedMeta.success ? parsedMeta.data.type === "donation" : false;

  if (!userId) {
    return { inserted: false, duplicate: false, reason: "missing_user_id" };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const sessionId = session.id;

  const existing = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .limit(1);

  if (existing.error) {
    throw new ApiError(500, "Failed to check existing payment.", {
      code: "PAYMENT_LOOKUP_FAILED",
      details: existing.error.message,
    });
  }

  if (existing.data && existing.data.length > 0) {
    return { inserted: false, duplicate: true };
  }

  await retryAsync(
    async () => {
      const { error } = await supabase.from("payments").insert({
        user_id: userId,
        stripe_session_id: sessionId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "cad",
        status: isDonation ? "donation" : "paid",
        paid_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    { retries: 2, timeoutMs: 6000 }
  );

  if (!isDonation) {
    await retryAsync(
      async () => {
        const { error } = await supabase
          .from("profiles")
          .upsert({ id: userId, has_paid: true, paid_at: new Date().toISOString() });
        if (error) throw new Error(error.message);
      },
      { retries: 2, timeoutMs: 6000 }
    );
  }

  return { inserted: true, duplicate: false };
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ApiError(500, "Stripe webhook secret is not configured.", {
        code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
      });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new ApiError(400, "Missing stripe-signature header.", {
        code: "MISSING_STRIPE_SIGNATURE",
      });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      throw new ApiError(400, `Webhook Error: ${error instanceof Error ? error.message : "Invalid signature"}`, {
        code: "INVALID_STRIPE_SIGNATURE",
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const outcome = await processCompletedSession(session);
      return NextResponse.json({ received: true, ...outcome });
    }

    return NextResponse.json({ received: true, ignored: true, eventType: event.type });
  },
  {
    routeKey: "api:stripe-webhook",
    rateLimit: { limit: 180, windowMs: 60_000 },
  }
);

