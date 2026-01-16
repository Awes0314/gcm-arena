-- Enable Row Level Security on all tables
ALTER TABLE dev.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.tournament_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Profiles Table Policies
-- ============================================

-- All users can view any profile (要件 1.6)
CREATE POLICY "profiles_select_policy"
  ON dev.profiles FOR SELECT
  USING (TRUE);

-- Users can only update their own profile (要件 1.7)
CREATE POLICY "profiles_update_policy"
  ON dev.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy"
  ON dev.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Songs Table Policies
-- ============================================

-- All users can view songs
CREATE POLICY "songs_select_policy"
  ON dev.songs FOR SELECT
  USING (TRUE);

-- Only authenticated users can insert songs (admin functionality)
CREATE POLICY "songs_insert_policy"
  ON dev.songs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Tournaments Table Policies
-- ============================================

-- Unified SELECT policy to avoid infinite recursion
-- Public tournaments are visible to everyone, private to organizer and participants
CREATE POLICY "tournaments_select_unified"
  ON dev.tournaments FOR SELECT
  USING (
    -- Public tournaments are visible to everyone (要件 7.1, 13.3)
    is_public = TRUE
    OR
    -- Private tournaments are visible to organizer (要件 7.5)
    organizer_id = auth.uid()
    OR
    -- Private tournaments are visible to participants (要件 7.5)
    (
      is_public = FALSE AND
      EXISTS (
        SELECT 1 FROM dev.participants p
        WHERE p.tournament_id = tournaments.id 
        AND p.user_id = auth.uid()
      )
    )
  );

-- Authenticated users can create tournaments (要件 2.1, 13.4)
CREATE POLICY "tournaments_insert_policy"
  ON dev.tournaments FOR INSERT
  WITH CHECK (auth.uid() = organizer_id AND auth.uid() IS NOT NULL);

-- Organizers can update their tournaments before start (要件 2.5, 8.5)
CREATE POLICY "tournaments_update_policy"
  ON dev.tournaments FOR UPDATE
  USING (
    auth.uid() = organizer_id AND
    start_at > NOW()
  );

-- Organizers can delete their tournaments
CREATE POLICY "tournaments_delete_policy"
  ON dev.tournaments FOR DELETE
  USING (auth.uid() = organizer_id);

-- ============================================
-- Tournament Songs Table Policies
-- ============================================

-- Tournament songs are visible if tournament is visible
-- Note: We check tournament visibility directly without triggering tournament policies
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

-- Organizers can add songs to their tournaments
CREATE POLICY "tournament_songs_insert_policy"
  ON dev.tournament_songs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dev.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- Organizers can remove songs from their tournaments
CREATE POLICY "tournament_songs_delete_policy"
  ON dev.tournament_songs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dev.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- ============================================
-- Participants Table Policies
-- ============================================

-- Participants are visible if tournament is visible (要件 7.2)
-- Note: We check tournament visibility directly without triggering tournament policies
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

-- Authenticated users can join tournaments (要件 3.1, 13.4)
CREATE POLICY "participants_insert_policy"
  ON dev.participants FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can leave tournaments they joined (要件 3.2)
CREATE POLICY "participants_delete_policy"
  ON dev.participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Scores Table Policies
-- ============================================

-- Scores are visible to tournament participants and organizer (要件 6.4, 6.5)
CREATE POLICY "scores_select_policy"
  ON dev.scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dev.tournaments t
      WHERE t.id = tournament_id AND (
        -- Public tournament
        t.is_public = TRUE OR
        -- Organizer
        t.organizer_id = auth.uid() OR
        -- Participant
        EXISTS (
          SELECT 1 FROM dev.participants p
          WHERE p.tournament_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- Participants can submit scores (要件 4.3, 13.4)
CREATE POLICY "scores_insert_policy"
  ON dev.scores FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM dev.participants
      WHERE tournament_id = scores.tournament_id AND user_id = auth.uid()
    )
  );

-- Organizers can approve/update scores (要件 5.3)
CREATE POLICY "scores_update_policy"
  ON dev.scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dev.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- Users can update their own pending scores
CREATE POLICY "scores_update_own_policy"
  ON dev.scores FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- ============================================
-- Notifications Table Policies
-- ============================================

-- Users can only view their own notifications (要件 9.2, 9.6)
CREATE POLICY "notifications_select_policy"
  ON dev.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own notifications (要件 9.3)
CREATE POLICY "notifications_update_policy"
  ON dev.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can create notifications for any user
CREATE POLICY "notifications_insert_policy"
  ON dev.notifications FOR INSERT
  WITH CHECK (TRUE);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_policy"
  ON dev.notifications FOR DELETE
  USING (auth.uid() = user_id);
