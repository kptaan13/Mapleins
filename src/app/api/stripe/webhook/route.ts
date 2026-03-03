import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !webhookSecret) {
    return new Response("Webhook error", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown"}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const isDonation = session.metadata?.type === "donation";

    if (userId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceKey && serviceKey !== "your_service_role_key_here") {
          const supabase = createClient(supabaseUrl, serviceKey);

          await supabase.from("payments").insert({
            user_id: userId,
            stripe_session_id: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || "cad",
            status: isDonation ? "donation" : "paid",
            paid_at: new Date().toISOString(),
          });

          // Donations do not update has_paid (interview prep is free)
          if (!isDonation) {
            await supabase
              .from("profiles")
              .upsert({ id: userId, has_paid: true, paid_at: new Date().toISOString() });
          }
        }
      } catch (dbErr) {
        console.error("Failed to save payment/donation to DB:", dbErr);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
