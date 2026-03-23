import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { rating, category, message, email, page } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from("feedback").insert({
      rating: rating ?? null,
      category: category ?? null,
      message: message.trim(),
      email: email?.trim() || null,
      page: page ?? null,
    });

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Admin-only: return all feedback
  try {
    const checkRes = await fetch(new URL("/api/admin/check", req.url), {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    if (!checkRes.ok || (await checkRes.json()).admin !== true) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ feedback: data });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ error: "Failed to load feedback." }, { status: 500 });
  }
}
