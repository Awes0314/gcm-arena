-- Fix infinite recursion in RLS policies
-- This migration fixes circular dependencies between tournament, participant, and tournament_songs policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "tournament_songs_select_policy" ON dev.tournament_songs;
DROP POLICY IF EXISTS "participants_select_policy" ON dev.participants;

-- Recreate tournament_songs_select_policy without recursion
-- Check tournament visibility directly without triggering tournament SELECT policies
CREATE POLICY "tournament_songs_select_policy"
  ON dev.tournament_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id AND (
        t.is_public = TRUE OR
        t.organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM dev.participants p
          WHERE p.tournament_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- Recreate participants_select_policy without recursion
-- Check tournament visibility directly without triggering tournament SELECT policies
CREATE POLICY "participants_select_policy"
  ON dev.participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id AND (
        t.is_public = TRUE OR
        t.organizer_id = auth.uid() OR
        user_id = auth.uid()
      )
    )
  );
