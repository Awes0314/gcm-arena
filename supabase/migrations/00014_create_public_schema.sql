-- ============================================
-- Create Public Schema for Production
-- ============================================
-- This migration creates the same structure as dev schema in the public schema
-- for production use. The public schema is the default schema in PostgreSQL.
--
-- Requirements: 11.2, 11.3, 11.5

-- Set search path to public schema
SET search_path TO public;

-- ============================================
-- Create Enum Types
-- ============================================

CREATE TYPE public.game_type AS ENUM ('ongeki', 'chunithm', 'maimai');
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'active', 'ended');
CREATE TYPE public.submission_method AS ENUM ('bookmarklet', 'image', 'both');
CREATE TYPE public.difficulty AS ENUM ('basic', 'advanced', 'expert', 'master', 'ultima', 'world_end');
CREATE TYPE public.score_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- Create Tables
-- ============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ
);

-- Songs table
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type public.game_type NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  difficulty public.difficulty NOT NULL,
  level NUMERIC(3,1) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (game_type, title, difficulty)
);

-- Tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  game_type public.game_type NOT NULL,
  submission_method public.submission_method NOT NULL DEFAULT 'both',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (start_at < end_at)
);

-- Tournament songs table
CREATE TABLE public.tournament_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments (id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (tournament_id, song_id)
);

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (tournament_id, user_id)
);

-- Scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs (id) ON DELETE RESTRICT,
  score INTEGER NOT NULL,
  status public.score_status NOT NULL DEFAULT 'approved',
  image_url TEXT,
  submitted_via TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles (id),
  
  CONSTRAINT valid_score CHECK (score >= 0)
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Create Indexes
-- ============================================

CREATE INDEX idx_tournaments_organizer ON public.tournaments(organizer_id);
CREATE INDEX idx_tournaments_game_type ON public.tournaments(game_type);
CREATE INDEX idx_tournaments_dates ON public.tournaments(start_at, end_at);
CREATE INDEX idx_tournament_songs_tournament ON public.tournament_songs(tournament_id);
CREATE INDEX idx_participants_tournament ON public.participants(tournament_id);
CREATE INDEX idx_participants_user ON public.participants(user_id);
CREATE INDEX idx_scores_tournament ON public.scores(tournament_id);
CREATE INDEX idx_scores_user ON public.scores(user_id);
CREATE INDEX idx_scores_status ON public.scores(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_songs_game_type ON public.songs(game_type);

-- ============================================
-- Create Trigger Functions
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- Create Triggers
-- ============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Comments
-- ============================================

COMMENT ON SCHEMA public IS 'Production schema for GCM Arena platform';
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users';
COMMENT ON TABLE public.tournaments IS 'Tournament definitions with rules and settings';
COMMENT ON TABLE public.tournament_songs IS 'Songs included in each tournament';
COMMENT ON TABLE public.participants IS 'Users participating in tournaments';
COMMENT ON TABLE public.scores IS 'Score submissions from participants';
COMMENT ON TABLE public.songs IS 'Master list of songs from all supported games';
COMMENT ON TABLE public.notifications IS 'User notifications for tournament events';
