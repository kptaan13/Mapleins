-- Asualy: Fix Realtime, FK, and profile data
-- Run this in Supabase SQL Editor or via: supabase db push

-- 1) Enable Realtime for public.messages
--    (Add to supabase_realtime publication so postgres_changes events fire)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2) Ensure messages.sender_id has FK to profiles.id (for sender:profiles!sender_id join)
--    Skip if FK already exists (will error harmlessly - run manually if needed)
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

-- 4) Optional: set placeholder date_of_birth for profiles with none (for test users)
-- Uncomment if needed:
-- UPDATE public.profiles
-- SET date_of_birth = '1990-01-01'
-- WHERE date_of_birth IS NULL;
