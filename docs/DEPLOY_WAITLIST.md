# Deploy Waitlist Only (mapleins.com)

Your app is set up so **mapleins.com** goes straight to the waitlist. Follow these steps.

## Before you deploy

1. **Google Sheets webhook** – Follow [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) and get your web app URL.

2. **Environment variable** – You’ll need:
   ```
   GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_ID/exec
   ```

---

## Deploy to Vercel

### 1. Push your code

```bash
git add .
git commit -m "Waitlist ready for deploy"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub recommended).
2. **Add New** → **Project** → Import your `mapleins` repo.
3. Leave Framework Preset as **Next.js**.
4. Before deploying, open **Environment Variables** and add:
   - Name: `GOOGLE_SHEETS_WEBHOOK_URL`
   - Value: your Apps Script web app URL (from step 1 above)
   - Apply to: Production, Preview, Development
5. Click **Deploy**.

### 3. Add mapleins.com

1. After deploy: **Project** → **Settings** → **Domains**.
2. Add `mapleins.com`.
3. At your domain registrar:
   - Add the Vercel nameservers (shown in Vercel), or
   - Add an A record for `@` pointing to `76.76.21.21`, and a CNAME for `www` pointing to `cname.vercel-dns.com`.
4. Wait a few minutes for DNS to propagate.

---

## Verify

1. Visit `https://your-project.vercel.app` (or mapleins.com after DNS is set).
2. Confirm it redirects to the waitlist.
3. Submit a test signup and check your Google Sheet.

---

## Troubleshooting

- **"Waitlist is not configured"** – `GOOGLE_SHEETS_WEBHOOK_URL` is missing or wrong. Add it in Vercel → Project → Settings → Environment Variables and redeploy.
- **Form submits but no row in Sheet** – Test the Apps Script URL directly with a tool like Postman, or check the Apps Script execution log (Extensions → Apps Script → Executions).
