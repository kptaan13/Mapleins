-- =============================================================================
-- Mapleins: Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- =============================================================================

-- 1) Enable Realtime for public.messages (required for live message delivery)
--    Adds the table to supabase_realtime publication so postgres_changes fire.
--    If you get "already member of publication" error, table is already enabled - skip that line.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2) Add FK from messages.sender_id to profiles.id (if missing)
--    Required for sender:profiles!sender_id join in PostgREST.
--    Run this; if FK already exists you'll get a duplicate constraint error - safe to ignore.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Normalize existing profiles: fill display_name from full_name where missing
UPDATE public.profiles
SET display_name = split_part(trim(full_name), ' ', 1)
WHERE (display_name IS NULL OR trim(display_name) = '')
  AND full_name IS NOT NULL
  AND trim(full_name) != '';

-- 4) Verify: list recent profiles (optional)
-- SELECT id, username, display_name, full_name, date_of_birth
-- FROM public.profiles
-- ORDER BY created_at DESC
-- LIMIT 20;
