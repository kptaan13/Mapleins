import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const amountParam = searchParams.get("amount");
    const amountCents = Math.min(
      100000,
      Math.max(100, parseInt(amountParam || "500", 10))
    );

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const successUrl = `${baseUrl}/resume-results?donated=true`;
    const cancelUrl = `${baseUrl}/resume-results`;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Donation to Mapleins",
              description: "Support Mapleins — free Canadian resume and job-matching tools for job seekers.",
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
    });

    if (session.url) {
      return Response.json({ url: session.url });
    }
    return Response.json({ error: "Could not create checkout session." }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Donation checkout failed.";
    const isConfig = message.includes("not configured") || message.includes("STRIPE");
    console.error("Donate checkout error:", err);
    return Response.json(
      { error: isConfig ? "Donations are not configured. Please try again later." : message },
      { status: 500 }
    );
  }
}
