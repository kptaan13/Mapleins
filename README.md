# Mapleins — Free Canadian Resume & Job Tools for Newcomers

ATS-optimized resumes, job matches, interview prep, and more — built for newcomers to Canada. Free to use, supported by optional donations.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API routes (Node.js runtime) |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| AI | Groq (`llama-3.1-8b-instant`) via `src/lib/ai.ts` |
| PDF Generation | `@react-pdf/renderer` — 3 resume templates |
| PDF Parsing | `pdf-parse@1.1.1` (pure JS, Vercel-compatible) |
| Payments | Stripe (one-time donations via Checkout) |
| Deployment | Vercel (`mapleins-reqj` project → `mapleins.com`) |

---

## Features

- Upload a PDF resume → AI parses and analyzes it
- ATS score with keyword breakdown and improvement tips
- 3 resume templates: **Classic** (7 colour themes), **Bay Street** (dark navy sidebar), **Newcomer Bold** (green header band)
- Edit resume content in the AI-powered editor before downloading
- Job matching: curated roles by job type + city with salary estimates
- AI interview prep: 5–7 role-specific questions with STAR method tips
- Interview checklist with localStorage persistence
- Feedback widget on all pages — saved to Supabase
- Promo code system (30-day unlimited trial)
- Admin dashboard: user stats, donation history, feedback viewer

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signup` / `/login` / `/forgot-password` | Auth |
| `/dashboard` | Upload resume, set job type, city, immigration status |
| `/resume-results` | ATS score, job matches, interview prep, interview checklist, download |
| `/editor` | Edit optimized resume, pick template + theme, download PDF |
| `/donate` | Optional Stripe donation |
| `/waitlist` | Pre-launch waitlist signup |
| `/blog` | Blog |
| `/about` / `/contact` | Company pages |
| `/admin` | Admin-only: users, donations, feedback |
| `/tools/pdf-extract` | Standalone PDF text extraction tool |
| `/privacy` / `/terms` / `/cookies` | Legal |

---

## User Flow

1. Sign up → Dashboard
2. Upload PDF resume → AI parses and analyzes it
3. Set job type, city, immigration status (sector pre-filled by AI)
4. Click "Get My ATS Resume + Jobs" → Resume Results page
5. View ATS score, download optimized resume (3 free downloads)
6. Explore job matches with salary ranges and application tips
7. Read AI-generated interview prep questions + general tips
8. Work through the interview checklist
9. Optionally edit the resume further in the Editor
10. Optionally support the project with a donation

---

## Soft Paywall

Users get **3 free PDF downloads**. After that, a modal appears:

- Donate via Stripe to unlock unlimited downloads
- Enter a promo code for a 30-day unlimited trial
- Continue for free (downloads remain blocked until one of the above)

Download count tracked in `localStorage` (`mapleins_free_downloads`).
Promo trial stored under `mapleins_promo_trial` as `{ expiresAt }`.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/kptaan13/Mapleins.git
cd mapleins
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_DONATION_LINK=https://buy.stripe.com/...

# AI (Groq)
GROQ_API_KEY=gsk_...

# Site
NEXT_PUBLIC_SITE_URL=https://mapleins.com

# Admin
ADMIN_EMAIL=your@email.com

# Feature flags (both required — see note below)
WAITLIST_ONLY=false
NEXT_PUBLIC_WAITLIST_ONLY=false

# Promo code for 30-day free trial
PROMO_CODE=YOUR_SECRET_CODE_HERE
```

> **Important:** `NEXT_PUBLIC_*` variables are baked into the JS bundle at build time. After changing them in Vercel, you must trigger a fresh redeploy with "use existing build cache" unchecked, otherwise the old value stays active in the frontend.

> **Two flags needed:** `WAITLIST_ONLY` controls server-side middleware redirects. `NEXT_PUBLIC_WAITLIST_ONLY` controls the homepage UI. Both must be set.

### 3. Supabase tables

Run this in your Supabase SQL Editor:

```sql
-- Profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users primary key,
  email text,
  has_paid boolean default false,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Donations
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

-- Feedback
create table feedback (
  id uuid primary key default gen_random_uuid(),
  rating int check (rating >= 1 and rating <= 5),
  category text,
  message text not null,
  email text,
  page text,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table payments enable row level security;
alter table waitlist enable row level security;
alter table feedback enable row level security;

create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Service role manages profiles" on profiles using (true) with check (true);
create policy "Service role manages payments" on payments using (true) with check (true);
create policy "Anyone can join waitlist" on waitlist for insert with check (true);
create policy "Anyone can submit feedback" on feedback for insert with check (true);
```

In Supabase → Authentication → URL Configuration, add:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://mapleins.com/auth/callback`

### 4. Stripe

1. Create an account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers → API keys
3. Create a webhook pointing to `https://mapleins.com/api/stripe/webhook` for the `checkout.session.completed` event
4. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/resume/analyze` | POST | Parse uploaded PDF + AI analysis |
| `/api/resume/generate` | POST | Render resume to PDF (3 templates) |
| `/api/resume/edit` | POST | AI-powered resume field editing |
| `/api/resume/hint` | POST | AI writing hints for resume fields |
| `/api/resume/jobs` | POST | Curated job matches by type + city |
| `/api/resume/interview-prep` | POST | AI interview questions + tips |
| `/api/interview-prep` | POST | Standalone interview prep endpoint |
| `/api/donate/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe payment confirmation |
| `/api/promo/redeem` | POST | Validate promo code, return expiry |
| `/api/feedback` | POST | Save feedback to Supabase |
| `/api/feedback` | GET | Admin-only: fetch all feedback |
| `/api/waitlist` | POST | Add email to waitlist |
| `/api/email-capture` | POST | General email capture |
| `/api/admin/check` | GET | Verify current user is admin |
| `/api/auth/signout` | POST | Sign out |
| `/api/tools/pdf-text` | POST | Extract raw text from PDF |

---

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in Vercel — the active production project is `mapleins-reqj` (custom domain `mapleins.com` points here)
3. Add all environment variables listed above
4. Set both `WAITLIST_ONLY=false` and `NEXT_PUBLIC_WAITLIST_ONLY=false`
5. Deploy — uncheck "use existing build cache" if you changed any `NEXT_PUBLIC_*` vars
