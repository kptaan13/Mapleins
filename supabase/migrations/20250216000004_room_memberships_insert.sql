-- Mapleins: Allow users to insert their own room_memberships (onboarding auto-join)
-- Without this, RLS blocks INSERT and onboarding creates no memberships

DROP POLICY IF EXISTS "Users can insert own memberships" ON public.room_memberships;
CREATE POLICY "Users can insert own memberships"
ON public.room_memberships FOR INSERT
WITH CHECK (user_id = auth.uid());
