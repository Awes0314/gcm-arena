-- Create dev schema
CREATE SCHEMA IF NOT EXISTS dev;

-- Set search path to dev schema
SET search_path TO dev;

-- Create enum types
CREATE TYPE dev.game_type AS ENUM ('ongeki', 'chunithm', 'maimai');
CREATE TYPE dev.tournament_status AS ENUM ('upcoming', 'active', 'ended');
CREATE TYPE dev.submission_method AS ENUM ('bookmarklet', 'image', 'both');
CREATE TYPE dev.difficulty AS ENUM ('basic', 'advanced', 'expert', 'master', 'ultima', 'world_end');
CREATE TYPE dev.score_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE dev.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ
);

-- Create songs table
CREATE TABLE dev.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type dev.game_type NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  difficulty dev.difficulty NOT NULL,
  level NUMERIC(3,1) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (game_type, title, difficulty)
);

-- Create tournaments table
CREATE TABLE dev.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES dev.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  game_type dev.game_type NOT NULL,
  submission_method dev.submission_method NOT NULL DEFAULT 'both',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (start_at < end_at)
);

-- Create tournament_songs table
CREATE TABLE dev.tournament_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES dev.tournaments (id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES dev.songs (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (tournament_id, song_id)
);

-- Create participants table
CREATE TABLE dev.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES dev.tournaments (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES dev.profiles (id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (tournament_id, user_id)
);

-- Create scores table
CREATE TABLE dev.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES dev.tournaments (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES dev.profiles (id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES dev.songs (id) ON DELETE RESTRICT,
  score INTEGER NOT NULL,
  status dev.score_status NOT NULL DEFAULT 'approved',
  image_url TEXT,
  submitted_via TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES dev.profiles (id),
  
  CONSTRAINT valid_score CHECK (score >= 0)
);

-- Create notifications table
CREATE TABLE dev.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES dev.profiles (id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tournaments_organizer ON dev.tournaments(organizer_id);
CREATE INDEX idx_tournaments_game_type ON dev.tournaments(game_type);
CREATE INDEX idx_tournaments_dates ON dev.tournaments(start_at, end_at);
CREATE INDEX idx_tournament_songs_tournament ON dev.tournament_songs(tournament_id);
CREATE INDEX idx_participants_tournament ON dev.participants(tournament_id);
CREATE INDEX idx_participants_user ON dev.participants(user_id);
CREATE INDEX idx_scores_tournament ON dev.scores(tournament_id);
CREATE INDEX idx_scores_user ON dev.scores(user_id);
CREATE INDEX idx_scores_status ON dev.scores(status);
CREATE INDEX idx_notifications_user ON dev.notifications(user_id);
CREATE INDEX idx_notifications_unread ON dev.notifications(user_id, is_read);
CREATE INDEX idx_songs_game_type ON dev.songs(game_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION dev.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON dev.profiles
  FOR EACH ROW
  EXECUTE FUNCTION dev.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON dev.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION dev.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON dev.songs
  FOR EACH ROW
  EXECUTE FUNCTION dev.update_updated_at_column();
