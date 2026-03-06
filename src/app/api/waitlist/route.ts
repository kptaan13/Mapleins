import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, name, jobType, city } = (await request.json()) as {
      email?: string;
      name?: string;
      jobType?: string;
      city?: string;
    };

    const trimmedEmail = email?.trim();
    const trimmedName = name?.trim();
    const trimmedJobType = jobType?.trim();
    const trimmedCity = city?.trim();

    if (!trimmedEmail || !trimmedName || !trimmedJobType || !trimmedCity) {
      return new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey || serviceKey === "your_service_role_key_here") {
      console.warn("Supabase waitlist insert skipped: missing service role key or URL");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase.from("waitlist").insert({
      email: trimmedEmail,
      name: trimmedName,
      job_type: trimmedJobType,
      city: trimmedCity,
      source: "website",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/api/waitlist error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

