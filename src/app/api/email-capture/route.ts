import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("email_signups")
    .insert({ email: email.toLowerCase().trim() });

  if (error && error.code !== "23505") {
    // 23505 = unique violation (already signed up) — treat as success
    console.error("email_signups insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
