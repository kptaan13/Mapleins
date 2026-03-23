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
    .select("email, name, city, job_type")
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
    const city = row.city || "Canada";
    try {
      await resend.emails.send({
        from: "Mapleins <hello@mapleins.com>",
        to: row.email,
        subject: "Mapleins is officially live — your free access is ready 🍁",
        html: buildEmail(firstName, city, promoCode, siteUrl),
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

export function buildEmail(firstName: string, city: string, promoCode: string, siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mapleins is Live</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f3f4f6; font-family: 'Inter', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body style="background:#f3f4f6;margin:0;padding:0;font-family:'Inter',system-ui,-apple-system,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- Logo row -->
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <span style="font-family:'Inter',system-ui,sans-serif;font-size:20px;font-weight:900;color:#166534;letter-spacing:-0.5px;">Mapleins 🍁</span>
          </td>
        </tr>

        <!-- OFFICIALLY LIVE banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%);border-radius:20px 20px 0 0;padding:48px 48px 40px;text-align:center;">
            <p style="font-family:'Inter',system-ui,sans-serif;font-size:11px;font-weight:700;color:#86efac;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">We are</p>
            <h1 style="font-family:'Inter',system-ui,sans-serif;font-size:52px;font-weight:900;color:#ffffff;letter-spacing:-2px;line-height:1;margin-bottom:16px;">Officially<br/>Live.</h1>
            <p style="font-family:'Inter',system-ui,sans-serif;font-size:16px;color:#bbf7d0;font-weight:400;line-height:1.6;max-width:380px;margin:0 auto;">
              The tool you signed up for is ready. Your Canadian resume, job matches, and interview prep — all in one place.
            </p>
          </td>
        </tr>

        <!-- White card body -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 20px 20px;padding:40px 48px 48px;border:1px solid #e5e7eb;border-top:none;">

            <!-- Greeting -->
            <p style="font-family:'Inter',system-ui,sans-serif;font-size:17px;color:#111827;font-weight:500;margin-bottom:12px;">
              Hi ${firstName} 👋
            </p>
            <p style="font-family:'Inter',system-ui,sans-serif;font-size:15px;color:#4b5563;line-height:1.7;margin-bottom:28px;">
              You signed up from <strong style="color:#111827;">${city}</strong> — and we've been building ever since.
              Mapleins is now live and your spot is waiting.
              We built this because too many talented newcomers to Canada get overlooked, not because they're unqualified,
              but because their resume doesn't speak Canadian. We fix that in 2 minutes.
            </p>

            <!-- What you get -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:14px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="font-family:'Inter',system-ui,sans-serif;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">What's inside</p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr><td style="padding-bottom:10px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:28px;font-size:16px;">✅</td>
                        <td style="font-family:'Inter',system-ui,sans-serif;font-size:14px;color:#1f2937;font-weight:500;">Canadian ATS resume rewrite</td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding-bottom:10px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:28px;font-size:16px;">✅</td>
                        <td style="font-family:'Inter',system-ui,sans-serif;font-size:14px;color:#1f2937;font-weight:500;">ATS score with keyword tips</td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding-bottom:10px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:28px;font-size:16px;">✅</td>
                        <td style="font-family:'Inter',system-ui,sans-serif;font-size:14px;color:#1f2937;font-weight:500;">Job matches in ${city}</td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding-bottom:10px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:28px;font-size:16px;">✅</td>
                        <td style="font-family:'Inter',system-ui,sans-serif;font-size:14px;color:#1f2937;font-weight:500;">AI interview prep with STAR method tips</td>
                      </tr></table>
                    </td></tr>
                    <tr><td>
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width:28px;font-size:16px;">✅</td>
                        <td style="font-family:'Inter',system-ui,sans-serif;font-size:14px;color:#1f2937;font-weight:500;">3 professional resume templates — download as PDF</td>
                      </tr></table>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>

            ${promoCode ? `
            <!-- Promo code -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="border:2px dashed #16a34a;border-radius:14px;padding:24px 28px;text-align:center;background:#fafffe;">
                  <p style="font-family:'Inter',system-ui,sans-serif;font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:3px;margin-bottom:10px;">Your exclusive promo code</p>
                  <p style="font-family:'Inter',system-ui,sans-serif;font-size:32px;font-weight:900;color:#166534;letter-spacing:3px;margin-bottom:8px;">${promoCode}</p>
                  <p style="font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#6b7280;font-weight:400;">30 days of unlimited PDF downloads — enter it at checkout. A thank you for believing in us early.</p>
                </td>
              </tr>
            </table>
            ` : ""}

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="${siteUrl}/signup" style="display:inline-block;background:#166534;color:#ffffff;font-family:'Inter',system-ui,sans-serif;font-size:16px;font-weight:700;padding:18px 48px;border-radius:50px;text-decoration:none;letter-spacing:-0.3px;">
                    Get My Canadian Resume →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Closing -->
            <p style="font-family:'Inter',system-ui,sans-serif;font-size:14px;color:#6b7280;line-height:1.7;border-top:1px solid #f3f4f6;padding-top:24px;">
              It takes less than 2 minutes. Upload your resume and we'll handle the rest.<br/><br/>
              Welcome to Canada. Let's get you that interview. 🍁<br/>
              <strong style="color:#111827;">— The Mapleins Team</strong>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0;text-align:center;">
            <p style="font-family:'Inter',system-ui,sans-serif;font-size:12px;color:#9ca3af;">
              You're receiving this because you joined the Mapleins waitlist.<br/>
              <a href="${siteUrl}" style="color:#166534;text-decoration:none;font-weight:500;">mapleins.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}
