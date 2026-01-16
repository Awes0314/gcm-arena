-- Comprehensive fix for all RLS infinite recursion issues
-- The problem: Multiple tables reference tournaments, creating circular dependencies

-- ============================================
-- Step 1: Drop all problematic policies
-- ============================================

-- Drop participants policies
DROP POLICY IF EXISTS "participants_select_policy" ON dev.participants;

-- Drop tournament_songs policies  
DROP POLICY IF EXISTS "tournament_songs_select_policy" ON dev.tournament_songs;

-- Drop scores policies that might cause recursion
DROP POLICY IF EXISTS "scores_select_policy" ON dev.scores;

-- ============================================
-- Step 2: Recreate policies WITHOUT recursion
-- ============================================

-- Participants: Visible based on tournament visibility (no subquery to tournaments)
CREATE POLICY "participants_select_policy"
  ON dev.participants FOR SELECT
  USING (
    -- User can see their own participation
    user_id = auth.uid()
    OR
    -- User can see participants if they are the organizer
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id 
      AND t.organizer_id = auth.uid()
    )
    OR
    -- User can see participants of public tournaments
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id 
      AND t.is_public = TRUE
    )
    OR
    -- User can see other participants if they are also a participant
    EXISTS (
      SELECT 1 FROM dev.participants p2
      WHERE p2.tournament_id = tournament_id
      AND p2.user_id = auth.uid()
    )
  );

-- Tournament songs: Visible based on tournament visibility (no subquery to tournaments)
CREATE POLICY "tournament_songs_select_policy"
  ON dev.tournament_songs FOR SELECT
  USING (
    -- Songs visible if tournament is public
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id 
      AND t.is_public = TRUE
    )
    OR
    -- Songs visible if user is organizer
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id 
      AND t.organizer_id = auth.uid()
    )
    OR
    -- Songs visible if user is participant
    EXISTS (
      SELECT 1 FROM dev.participants p
      WHERE p.tournament_id = tournament_id
      AND p.user_id = auth.uid()
    )
  );

-- Scores: Visible to participants and organizer (no subquery to tournaments)
CREATE POLICY "scores_select_policy"
  ON dev.scores FOR SELECT
  USING (
    -- Public tournament scores are visible to everyone
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id 
      AND t.is_public = TRUE
    )
    OR
    -- Organizer can see all scores
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id 
      AND t.organizer_id = auth.uid()
    )
    OR
    -- Participants can see scores
    EXISTS (
      SELECT 1 FROM dev.participants p
      WHERE p.tournament_id = tournament_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 3: Verify policies
-- ============================================

SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'dev' 
AND tablename IN ('tournaments', 'participants', 'tournament_songs', 'scores')
ORDER BY tablename, policyname;
