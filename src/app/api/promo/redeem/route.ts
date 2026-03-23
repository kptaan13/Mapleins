import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  const validCode = process.env.PROMO_CODE || "";
  if (!code || code.trim().toUpperCase() !== validCode.trim().toUpperCase()) {
    return NextResponse.json({ valid: false, error: "Invalid promo code." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return NextResponse.json({ valid: true, expiresAt });
}
