-- ============================================
-- Row Level Security Policies for Public Schema
-- ============================================
-- This migration creates the same RLS policies as dev schema
-- for the public schema used in production.
--
-- Requirements: 11.2, 11.3, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6

-- Set search path to public schema
SET search_path TO public;

-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Profiles Table Policies
-- ============================================

-- All users can view any profile (要件 1.6)
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Users can only update their own profile (要件 1.7)
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Songs Table Policies
-- ============================================

-- All users can view songs
CREATE POLICY "songs_select_policy"
  ON public.songs FOR SELECT
  USING (TRUE);

-- Only authenticated users can insert songs (admin functionality)
CREATE POLICY "songs_insert_policy"
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Tournaments Table Policies
-- ============================================

-- Unified SELECT policy to avoid infinite recursion
-- Public tournaments are visible to everyone, private to organizer and participants
CREATE POLICY "tournaments_select_unified"
  ON public.tournaments FOR SELECT
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
        SELECT 1 FROM public.participants p
        WHERE p.tournament_id = tournaments.id 
        AND p.user_id = auth.uid()
      )
    )
  );

-- Authenticated users can create tournaments (要件 2.1, 13.4)
CREATE POLICY "tournaments_insert_policy"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.uid() = organizer_id AND auth.uid() IS NOT NULL);

-- Organizers can update their tournaments before start (要件 2.5, 8.5)
CREATE POLICY "tournaments_update_policy"
  ON public.tournaments FOR UPDATE
  USING (
    auth.uid() = organizer_id AND
    start_at > NOW()
  );

-- Organizers can delete their tournaments
CREATE POLICY "tournaments_delete_policy"
  ON public.tournaments FOR DELETE
  USING (auth.uid() = organizer_id);

-- ============================================
-- Tournament Songs Table Policies
-- ============================================

-- Tournament songs are visible if tournament is visible
CREATE POLICY "tournament_songs_select_policy"
  ON public.tournament_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND (
        t.is_public = TRUE OR
        t.organizer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.participants p
          WHERE p.tournament_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- Organizers can add songs to their tournaments
CREATE POLICY "tournament_songs_insert_policy"
  ON public.tournament_songs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- Organizers can remove songs from their tournaments
CREATE POLICY "tournament_songs_delete_policy"
  ON public.tournament_songs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- ============================================
-- Participants Table Policies
-- ============================================

-- Participants are visible if tournament is visible (要件 7.2)
CREATE POLICY "participants_select_policy"
  ON public.participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND (
        t.is_public = TRUE OR
        t.organizer_id = auth.uid() OR
        user_id = auth.uid()
      )
    )
  );

-- Authenticated users can join tournaments (要件 3.1, 13.4)
CREATE POLICY "participants_insert_policy"
  ON public.participants FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can leave tournaments they joined (要件 3.2)
CREATE POLICY "participants_delete_policy"
  ON public.participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Scores Table Policies
-- ============================================

-- Scores are visible to tournament participants and organizer (要件 6.4, 6.5)
CREATE POLICY "scores_select_policy"
  ON public.scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND (
        -- Public tournament
        t.is_public = TRUE OR
        -- Organizer
        t.organizer_id = auth.uid() OR
        -- Participant
        EXISTS (
          SELECT 1 FROM public.participants p
          WHERE p.tournament_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- Participants can submit scores (要件 4.3, 13.4)
CREATE POLICY "scores_insert_policy"
  ON public.scores FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE tournament_id = scores.tournament_id AND user_id = auth.uid()
    )
  );

-- Organizers can approve/update scores (要件 5.3)
CREATE POLICY "scores_update_policy"
  ON public.scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- Users can update their own pending scores
CREATE POLICY "scores_update_own_policy"
  ON public.scores FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- ============================================
-- Notifications Table Policies
-- ============================================

-- Users can only view their own notifications (要件 9.2, 9.6)
CREATE POLICY "notifications_select_policy"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own notifications (要件 9.3)
CREATE POLICY "notifications_update_policy"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can create notifications for any user
CREATE POLICY "notifications_insert_policy"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_policy"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Comments
-- ============================================

COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 
  'All users can view any profile (Requirement 1.6)';

COMMENT ON POLICY "profiles_update_policy" ON public.profiles IS 
  'Users can only update their own profile (Requirement 1.7)';

COMMENT ON POLICY "tournaments_select_unified" ON public.tournaments IS 
  'Public tournaments visible to all, private to organizer and participants (Requirements 7.1, 7.5, 13.3)';

COMMENT ON POLICY "tournaments_insert_policy" ON public.tournaments IS 
  'Authenticated users can create tournaments (Requirements 2.1, 13.4)';

COMMENT ON POLICY "scores_insert_policy" ON public.scores IS 
  'Participants can submit scores (Requirements 4.3, 13.4)';
