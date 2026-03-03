# Mapleins - Get Canadian Job Interviews or Pay Nothing

Free Canadian resume tools, job matches, and interview prep. Optional donations support the project.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Supabase
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password)
- **Donations:** Stripe (optional, for one-time donations)
- **PDF:** @react-pdf/renderer
- **Deploy:** Vercel

## Setup

### 1. Clone and install

```bash
cd mapleins
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Create a storage bucket named `resumes` (public)
   - Storage → New bucket → Name: `resumes`, Public: ON
   - Policies → New policy → "Allow public read" for Select, expression: `true`
   - Policies → New policy → "Allow authenticated upload" for Insert, expression: `auth.role() = 'authenticated'`
3. In Authentication > URL Configuration, add:
   - Site URL: `http://localhost:3000` (or your Vercel URL)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://your-domain.com/auth/callback`

### 3. Stripe (optional — for donations)

1. Create an account at [stripe.com](https://stripe.com)
2. Get test keys from Dashboard > Developers > API keys
3. For recording donations in the admin dashboard: Stripe webhooks pointing to `/api/stripe/webhook`

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...   # optional, for donation checkout
STRIPE_WEBHOOK_SECRET=whsec_... # optional, to log donations in admin
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=sk-...  # required for AI resume analysis
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` - Landing page
- `/login` - Sign in
- `/signup` - Create account
- `/dashboard` - Upload resume, select job type/city/immigration status
- `/resume-results` - Jobs, resume download, interview prep (free), optional donation

## Flow

1. User signs up or signs in → Dashboard
2. **Uploads PDF resume** (required) → AI reads and analyzes resume
3. AI suggests job sectors (Warehouse, Trucking, Retail, IT, Healthcare) and target job titles
4. User fills: job sector, city, immigration status (sector pre-filled from AI)
5. Clicks "Get My ATS Resume + Jobs" → Results page
6. Downloads ATS-friendly resume and interview prep PDF (free)
7. Optional: Support Mapleins with a donation ($5 / $10 / $20) via Stripe

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Point mapleins.com to Vercel
