/**
 * Mapleins — Waitlist Email Blast
 * Google Apps Script — paste this into your Google Sheet:
 *   Extensions → Apps Script → paste → Save → Run sendWaitlistEmails
 *
 * Sheet format (Row 1 = headers):
 *   id | created_at | email | name | job_type | city | source
 *
 * The script reads every row, sends a personalised Gmail, and marks
 * column H ("Sent") so you don't double-send on re-runs.
 */

var PROMO_CODE  = "THANK YOU 20";   // ← your promo code
var SITE_URL    = "https://mapleins.com";
var FROM_NAME   = "Mapleins";       // display name in Gmail

// ─── Main entry point ────────────────────────────────────────────────────────
function sendWaitlistEmails() {
  var sheet  = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data   = sheet.getDataRange().getValues();
  var header = data[0];

  // Column indices (0-based)
  var emailCol   = header.indexOf("email");
  var nameCol    = header.indexOf("name");
  var cityCol    = header.indexOf("city");
  var jobCol     = header.indexOf("job_type");
  var sentCol    = header.indexOf("Sent");

  // Add "Sent" header if it doesn't exist
  if (sentCol === -1) {
    sentCol = header.length;
    sheet.getRange(1, sentCol + 1).setValue("Sent");
  }

  var sent   = 0;
  var failed = 0;
  var skipped = 0;

  for (var i = 1; i < data.length; i++) {
    var row       = data[i];
    var email     = (row[emailCol] || "").toString().trim();
    var name      = (row[nameCol]  || "").toString().trim();
    var city      = (row[cityCol]  || "Canada").toString().trim();
    var alreadySent = sheet.getRange(i + 1, sentCol + 1).getValue();

    if (!email) { skipped++; continue; }
    if (alreadySent === "✅") { skipped++; continue; }

    var firstName = name.split(" ")[0] || "there";

    try {
      GmailApp.sendEmail(
        email,
        "Mapleins is officially live — your free access is ready 🍁",
        stripHtml(buildBody(firstName, city, PROMO_CODE, SITE_URL)),  // plain text fallback
        {
          name:     FROM_NAME,
          htmlBody: buildBody(firstName, city, PROMO_CODE, SITE_URL),
          replyTo:  "hello@mapleins.com"
        }
      );
      sheet.getRange(i + 1, sentCol + 1).setValue("✅");
      sent++;
      Utilities.sleep(300); // stay well under Gmail quota (100/day free, 1500/day Workspace)
    } catch (e) {
      sheet.getRange(i + 1, sentCol + 1).setValue("❌ " + e.message);
      failed++;
    }
  }

  SpreadsheetApp.getUi().alert(
    "Done!\n\nSent: " + sent + "\nFailed: " + failed + "\nSkipped: " + skipped
  );
}

// ─── Email HTML ───────────────────────────────────────────────────────────────
function buildBody(firstName, city, promoCode, siteUrl) {
  var promoBlock = promoCode ? (
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">' +
    '<tr><td style="border:2px dashed #16a34a;border-radius:14px;padding:24px 28px;text-align:center;background:#fafffe;">' +
    '<p style="font-family:\'Inter\',system-ui,sans-serif;font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:3px;margin-bottom:10px;">Your exclusive promo code</p>' +
    '<p style="font-family:\'Inter\',system-ui,sans-serif;font-size:32px;font-weight:900;color:#166534;letter-spacing:3px;margin-bottom:8px;">' + promoCode + '</p>' +
    '<p style="font-family:\'Inter\',system-ui,sans-serif;font-size:13px;color:#6b7280;">30 days of unlimited PDF downloads — enter it at checkout. A thank you for believing in us early.</p>' +
    '</td></tr></table>'
  ) : '';

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>' +
    '</head>' +
    '<body style="background:#f3f4f6;margin:0;padding:0;font-family:\'Inter\',system-ui,-apple-system,sans-serif;">' +

    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">' +
    '<tr><td align="center">' +
    '<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">' +

    // Logo
    '<tr><td style="padding-bottom:24px;text-align:center;">' +
    '<span style="font-size:20px;font-weight:900;color:#166534;letter-spacing:-0.5px;">Mapleins 🍁</span>' +
    '</td></tr>' +

    // Hero banner
    '<tr><td style="background:linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%);border-radius:20px 20px 0 0;padding:48px 48px 40px;text-align:center;">' +
    '<p style="font-size:11px;font-weight:700;color:#86efac;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">We are</p>' +
    '<h1 style="font-size:52px;font-weight:900;color:#ffffff;letter-spacing:-2px;line-height:1;margin-bottom:16px;">Officially<br/>Live.</h1>' +
    '<p style="font-size:16px;color:#bbf7d0;line-height:1.6;max-width:380px;margin:0 auto;">The tool you signed up for is ready. Your Canadian resume, job matches, and interview prep — all in one place.</p>' +
    '</td></tr>' +

    // Body card
    '<tr><td style="background:#ffffff;border-radius:0 0 20px 20px;padding:40px 48px 48px;border:1px solid #e5e7eb;border-top:none;">' +

    // Greeting
    '<p style="font-size:17px;color:#111827;font-weight:500;margin-bottom:12px;">Hi ' + firstName + ' 👋</p>' +
    '<p style="font-size:15px;color:#4b5563;line-height:1.7;margin-bottom:28px;">' +
    'You signed up from <strong style="color:#111827;">' + city + '</strong> — and we\'ve been building ever since. ' +
    'Mapleins is now live and your spot is waiting. We built this because too many talented newcomers to Canada get overlooked, ' +
    'not because they\'re unqualified, but because their resume doesn\'t speak Canadian. We fix that in 2 minutes.' +
    '</p>' +

    // What's inside
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:14px;margin-bottom:28px;">' +
    '<tr><td style="padding:24px 28px;">' +
    '<p style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">What\'s inside</p>' +
    '<p style="font-size:14px;color:#1f2937;font-weight:500;margin-bottom:10px;">✅ &nbsp;Canadian ATS resume rewrite</p>' +
    '<p style="font-size:14px;color:#1f2937;font-weight:500;margin-bottom:10px;">✅ &nbsp;ATS score with keyword tips</p>' +
    '<p style="font-size:14px;color:#1f2937;font-weight:500;margin-bottom:10px;">✅ &nbsp;Job matches in ' + city + '</p>' +
    '<p style="font-size:14px;color:#1f2937;font-weight:500;margin-bottom:10px;">✅ &nbsp;AI interview prep with STAR method tips</p>' +
    '<p style="font-size:14px;color:#1f2937;font-weight:500;">✅ &nbsp;3 professional resume templates — download as PDF</p>' +
    '</td></tr></table>' +

    promoBlock +

    // CTA
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">' +
    '<tr><td align="center">' +
    '<a href="' + siteUrl + '/signup" style="display:inline-block;background:#166534;color:#ffffff;font-size:16px;font-weight:700;padding:18px 48px;border-radius:50px;text-decoration:none;letter-spacing:-0.3px;">Get My Canadian Resume →</a>' +
    '</td></tr></table>' +

    // Sign off
    '<p style="font-size:14px;color:#6b7280;line-height:1.7;border-top:1px solid #f3f4f6;padding-top:24px;">' +
    'It takes less than 2 minutes. Upload your resume and we\'ll handle the rest.<br/><br/>' +
    'Welcome to Canada. Let\'s get you that interview. 🍁<br/>' +
    '<strong style="color:#111827;">— The Mapleins Team</strong>' +
    '</p>' +

    '</td></tr>' +

    // Footer
    '<tr><td style="padding:24px 0;text-align:center;">' +
    '<p style="font-size:12px;color:#9ca3af;">You\'re receiving this because you joined the Mapleins waitlist.<br/>' +
    '<a href="' + siteUrl + '" style="color:#166534;text-decoration:none;font-weight:500;">mapleins.com</a></p>' +
    '</td></tr>' +

    '</table></td></tr></table>' +
    '</body></html>';
}

// ─── Plain text fallback ──────────────────────────────────────────────────────
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
