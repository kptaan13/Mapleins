# Mapleins — Free Canadian Resume & Job Tools for Newcomers

ATS-optimized resumes, job matches, interview prep, and more — built for newcomers to Canada. Free to use, supported by optional donations.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth)
- **AI:** Groq (llama-3.1-8b-instant) via `src/lib/ai.ts`
- **PDF Generation:** @react-pdf/renderer (3 resume templates)
- **Payments:** Stripe (one-time donations)
- **Deploy:** Vercel

## Features

- Upload a PDF resume → AI parses and analyzes it
- ATS score with keyword breakdown
- 3 resume templates: Classic (7 colour themes), Bay Street (sidebar), Newcomer Bold
- Job matching with salary estimates and application tips
- AI-generated interview prep: role-specific questions + general tips
- Interview checklist with localStorage persistence
- Admin dashboard with donation stats
- Promo code system for 1-month free trial

## Setup

### 1. Clone and install

```bash
git clone https://github.com/kptaan13/Mapleins.git
cd mapleins
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, create the required tables:

```sql
-- Profiles (auto-created on signup via trigger)
create table profiles (
  id uuid references auth.users primary key,
  email text,
  has_paid boolean default false,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Payments / donations
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  stripe_session_id text,
  amount numeric,
  currency text default 'cad',
  status text,
  paid_at timestamptz
);

-- Waitlist
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  city text,
  immigration_status text,
  created_at timestamptz default now()
);
```

3. In Authentication → URL Configuration, add:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://mapleins.com/auth/callback`

### 3. Stripe (for donations)

1. Create an account at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API keys
3. Set up a webhook pointing to `/api/stripe/webhook` for the `checkout.session.completed` event

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_DONATION_LINK=   # optional payment link

# AI
GROQ_API_KEY=gsk_...

# Site
NEXT_PUBLIC_SITE_URL=https://mapleins.com

# Feature flags
WAITLIST_ONLY=false                  # server: redirects non-public routes to /waitlist
NEXT_PUBLIC_WAITLIST_ONLY=false      # client: controls homepage UI (baked at build time)

# Admin
ADMIN_EMAIL=your@email.com

# Promo code for 1-month free trial
PROMO_CODE=YOUR_SECRET_CODE_HERE
```

> **Note:** `NEXT_PUBLIC_*` variables are baked into the JS bundle at build time. After changing them in Vercel, you must do a fresh redeploy (uncheck "use existing build cache").

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signup` / `/login` | Auth |
| `/dashboard` | Upload resume, select job type, city, immigration status |
| `/editor` | Edit AI-optimized resume, pick template, download PDF |
| `/resume-results` | Job matches, interview prep, interview checklist, download |
| `/donate` | Optional donation via Stripe |
| `/waitlist` | Pre-launch waitlist signup |
| `/about` / `/contact` | Company pages |
| `/admin` | Donation stats (admin email only) |
| `/privacy` / `/terms` / `/cookies` | Legal |

## User Flow

1. Sign up → Dashboard
2. Upload PDF resume → AI parses and analyzes it
3. Select job type, city, immigration status (sector pre-filled by AI)
4. Click "Get My ATS Resume + Jobs" → Resume Results page
5. View ATS score, download optimized resume, explore job matches
6. Read AI interview prep questions and checklist
7. Optionally edit resume further in the Editor page
8. Optional: support with a donation via Stripe

## Soft Paywall

Users get **3 free PDF downloads**. After that, a modal appears offering:
- Support via donation
- Enter a promo code (30-day unlimited trial)
- Continue for free anyway

Download count is tracked in `localStorage` (`mapleins_free_downloads`). Promo trial stored under `mapleins_promo_trial`.

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Add all environment variables (see above)
4. Set `WAITLIST_ONLY=false` and `NEXT_PUBLIC_WAITLIST_ONLY=false` for production
5. Add `PROMO_CODE` with your secret promo code
6. Deploy — your custom domain should point to the `mapleins-reqj` Vercel project
