-- Mapleins: Add phone column for locals
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
