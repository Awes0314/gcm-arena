-- Use SECURITY DEFINER functions to break RLS recursion
-- These functions bypass RLS when checking permissions

-- ============================================
-- Helper functions with SECURITY DEFINER
-- ============================================

-- Check if a tournament is public (bypasses RLS)
CREATE OR REPLACE FUNCTION dev.is_tournament_public(tournament_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dev, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dev.tournaments
    WHERE id = tournament_id_param
    AND is_public = TRUE
  );
END;
$$;

-- Check if user is tournament organizer (bypasses RLS)
CREATE OR REPLACE FUNCTION dev.is_tournament_organizer(tournament_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dev, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dev.tournaments
    WHERE id = tournament_id_param
    AND organizer_id = user_id_param
  );
END;
$$;

-- Check if user is tournament participant (bypasses RLS)
CREATE OR REPLACE FUNCTION dev.is_tournament_participant(tournament_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dev, public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dev.participants
    WHERE tournament_id = tournament_id_param
    AND user_id = user_id_param
  );
END;
$$;

-- ============================================
-- Recreate policies using helper functions
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "participants_select_policy" ON dev.participants;
DROP POLICY IF EXISTS "tournament_songs_select_policy" ON dev.tournament_songs;
DROP POLICY IF EXISTS "scores_select_policy" ON dev.scores;

-- Participants policy using helper functions
CREATE POLICY "participants_select_policy"
  ON dev.participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR dev.is_tournament_public(tournament_id)
    OR dev.is_tournament_organizer(tournament_id, auth.uid())
    OR dev.is_tournament_participant(tournament_id, auth.uid())
  );

-- Tournament songs policy using helper functions
CREATE POLICY "tournament_songs_select_policy"
  ON dev.tournament_songs FOR SELECT
  USING (
    dev.is_tournament_public(tournament_id)
    OR dev.is_tournament_organizer(tournament_id, auth.uid())
    OR dev.is_tournament_participant(tournament_id, auth.uid())
  );

-- Scores policy using helper functions
CREATE POLICY "scores_select_policy"
  ON dev.scores FOR SELECT
  USING (
    dev.is_tournament_public(tournament_id)
    OR dev.is_tournament_organizer(tournament_id, auth.uid())
    OR dev.is_tournament_participant(tournament_id, auth.uid())
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dev.is_tournament_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dev.is_tournament_organizer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dev.is_tournament_participant TO anon, authenticated;

-- Verify
SELECT 
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'dev'
AND routine_name LIKE 'is_tournament%';
