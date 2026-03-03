import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!user) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ admin: false }, { status: 403 });
  }
  return NextResponse.json({ admin: true });
}
