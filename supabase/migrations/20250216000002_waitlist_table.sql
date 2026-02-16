-- Mapleins: Waitlist table for early-access signups
-- Anyone can insert; only admins (service role) read via Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  role text,
  city text,
  country text DEFAULT 'India',
  intake text,
  source text DEFAULT 'waitlist_page',
  created_at timestamptz DEFAULT now()
);

-- RLS: allow anyone to insert (anon + authenticated)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist FOR INSERT
WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policy = deny for anon/auth (use service role for admin reads)
