-- Fix infinite recursion in tournaments RLS policies
-- The issue: tournaments_select_private references participants table,
-- which in turn references tournaments table, causing infinite recursion

-- Drop all existing SELECT policies on tournaments
DROP POLICY IF EXISTS "tournaments_select_public" ON dev.tournaments;
DROP POLICY IF EXISTS "tournaments_select_private" ON dev.tournaments;

-- Create a single unified SELECT policy that handles both public and private cases
-- This avoids the recursion by not having multiple SELECT policies that might interact
CREATE POLICY "tournaments_select_unified"
  ON dev.tournaments FOR SELECT
  USING (
    -- Public tournaments are visible to everyone
    is_public = TRUE
    OR
    -- Private tournaments are visible to organizer
    organizer_id = auth.uid()
    OR
    -- Private tournaments are visible to participants
    -- We check participants directly without triggering tournament policies
    (
      is_public = FALSE AND
      EXISTS (
        SELECT 1 FROM dev.participants p
        WHERE p.tournament_id = tournaments.id 
        AND p.user_id = auth.uid()
      )
    )
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'dev' 
AND tablename = 'tournaments'
ORDER BY policyname;
