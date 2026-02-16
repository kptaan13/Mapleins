-- Mapleins: Enable Realtime for messages and ensure RLS allows room members to receive events
-- Run in Supabase SQL Editor or: supabase db push
--
-- Realtime only delivers postgres_changes to subscribers who can SELECT the row (RLS).
-- Room members must have SELECT on messages in their rooms.

-- 0) Ensure room_memberships allows users to read their own rows (needed for messages policy)
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own memberships" ON public.room_memberships;
CREATE POLICY "Users can read own memberships"
ON public.room_memberships FOR SELECT
USING (user_id = auth.uid());

-- 1) Ensure messages is in supabase_realtime publication (required for postgres_changes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 2) Enable RLS on messages (if not already)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3) Drop existing policies if they exist (to avoid conflicts when re-running)
DROP POLICY IF EXISTS "Room members can read messages" ON public.messages;
DROP POLICY IF EXISTS "Room members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Room members can insert messages" ON public.messages;

-- 4) Room members can SELECT messages in rooms they belong to (required for Realtime to deliver events)
CREATE POLICY "Room members can read messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_memberships
    WHERE room_memberships.room_id = messages.room_id
    AND room_memberships.user_id = auth.uid()
  )
);

-- 5) Room members can INSERT messages in rooms they belong to
CREATE POLICY "Room members can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_memberships
    WHERE room_memberships.room_id = messages.room_id
    AND room_memberships.user_id = auth.uid()
  )
);
