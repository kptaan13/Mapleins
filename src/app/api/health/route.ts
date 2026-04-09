import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/route";
import { fetchWithTimeoutRetry } from "@/lib/net";

type DependencyStatus = "ok" | "degraded" | "down";

type DependencyCheck = {
  name: string;
  status: DependencyStatus;
  message: string;
};

async function checkSupabase(): Promise<DependencyCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { name: "supabase", status: "down", message: "Supabase env vars are missing." };
  }

  try {
    const res = await fetchWithTimeoutRetry(
      `${url.replace(/\/$/, "")}/rest/v1/`,
      {
        method: "GET",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
      },
      { retries: 1, timeoutMs: 5000 }
    );
    if (res.ok || res.status === 401 || res.status === 404) {
      return { name: "supabase", status: "ok", message: "Supabase reachable." };
    }
    return { name: "supabase", status: "degraded", message: `Supabase responded with ${res.status}.` };
  } catch {
    return { name: "supabase", status: "down", message: "Supabase unreachable." };
  }
}

function checkAiConfig(): DependencyCheck {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasOllama = Boolean(process.env.OLLAMA_URL);
  if (hasGroq || hasOllama) {
    return { name: "ai", status: "ok", message: "AI provider is configured." };
  }
  return { name: "ai", status: "down", message: "No AI provider configured." };
}

function checkStripeConfig(): DependencyCheck {
  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    return { name: "stripe", status: "ok", message: "Stripe is configured." };
  }
  return { name: "stripe", status: "degraded", message: "Stripe secret key missing." };
}

function checkResendConfig(): DependencyCheck {
  if (process.env.RESEND_API_KEY?.trim()) {
    return { name: "resend", status: "ok", message: "Resend is configured." };
  }
  return { name: "resend", status: "degraded", message: "Resend API key missing." };
}

export const GET = withApiHandler(
  async () => {
    const dependencies = [
      await checkSupabase(),
      checkAiConfig(),
      checkStripeConfig(),
      checkResendConfig(),
    ];

    const hasDown = dependencies.some((d) => d.status === "down");
    const hasDegraded = dependencies.some((d) => d.status === "degraded");
    const overall: DependencyStatus = hasDown ? "down" : hasDegraded ? "degraded" : "ok";
    const httpStatus = overall === "down" ? 503 : 200;

    return NextResponse.json(
      {
        status: overall,
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        dependencies,
        version: process.env.npm_package_version || "0.0.0",
      },
      { status: httpStatus }
    );
  },
  {
    routeKey: "api:health",
    rateLimit: { limit: 120, windowMs: 60_000 },
  }
);
