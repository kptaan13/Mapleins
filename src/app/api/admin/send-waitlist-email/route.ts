import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  // Admin check
  const checkRes = await fetch(new URL("/api/admin/check", req.url), {
    headers: { cookie: req.headers.get("cookie") || "" },
  });
  if (!checkRes.ok || (await checkRes.json()).admin !== true) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const promoCode = process.env.PROMO_CODE || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mapleins.com";

  const supabase = await createClient();
  const { data: waitlist, error } = await supabase
    .from("waitlist")
    .select("email, name")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch waitlist." }, { status: 500 });
  }

  const emails = (waitlist || []).filter((r) => r.email);
  if (emails.length === 0) {
    return NextResponse.json({ error: "No emails on waitlist." }, { status: 400 });
  }

  const results: { email: string; status: "sent" | "failed" }[] = [];

  for (const row of emails) {
    const firstName = row.name?.split(" ")[0] || "there";
    try {
      await resend.emails.send({
        from: "Mapleins <hello@mapleins.com>",
        to: row.email,
        subject: "You're in — here's your free access to Mapleins 🍁",
        html: buildEmail(firstName, promoCode, siteUrl),
      });
      results.push({ email: row.email, status: "sent" });
    } catch {
      results.push({ email: row.email, status: "failed" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({ sent, failed, results });
}

function buildEmail(firstName: string, promoCode: string, siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're in — Mapleins</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header band -->
          <tr>
            <td style="background:#166534;padding:36px 48px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Mapleins 🍁</p>
              <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">Free Canadian resume tools for newcomers</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${firstName},</p>

              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                Thank you for signing up — Mapleins is now live and your spot is ready.
              </p>

              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
                We built Mapleins because too many talented newcomers to Canada are getting overlooked — not because they're unqualified, but because their resume isn't formatted the Canadian way. Mapleins fixes that in minutes.
              </p>

              <!-- What you get -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">What Mapleins does for you</p>
                    <p style="margin:0 0 8px;font-size:15px;color:#374151;">✅ &nbsp;Rewrites your resume in Canadian ATS format</p>
                    <p style="margin:0 0 8px;font-size:15px;color:#374151;">✅ &nbsp;Gives you an ATS score with keyword tips</p>
                    <p style="margin:0 0 8px;font-size:15px;color:#374151;">✅ &nbsp;Matches you with real jobs in your city</p>
                    <p style="margin:0 0 8px;font-size:15px;color:#374151;">✅ &nbsp;Prepares you for interviews with role-specific questions</p>
                    <p style="margin:0;font-size:15px;color:#374151;">✅ &nbsp;3 professional resume templates to download as PDF</p>
                  </td>
                </tr>
              </table>

              <!-- Promo code -->
              ${promoCode ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed #166534;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your exclusive promo code</p>
                    <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#166534;letter-spacing:2px;">${promoCode}</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;">Unlocks 30 days of unlimited PDF downloads — use it at checkout.</p>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}" style="display:inline-block;background:#166534;color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:50px;text-decoration:none;">
                      Get My Canadian Resume →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
                It takes less than 2 minutes. Upload your current resume and we'll handle the rest.
              </p>

              <p style="margin:24px 0 0;font-size:15px;color:#374151;">
                Welcome to Canada. Let's get you that interview. 🍁<br/>
                <strong>— The Mapleins Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 48px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                You're receiving this because you signed up for the Mapleins waitlist.<br/>
                <a href="${siteUrl}" style="color:#166534;text-decoration:none;">mapleins.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
