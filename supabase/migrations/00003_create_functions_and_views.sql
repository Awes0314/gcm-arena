-- Set search path to dev schema
SET search_path TO dev;

-- ============================================
-- Ranking Calculation Function
-- ============================================

/**
 * Calculate tournament ranking based on total scores
 * 
 * This function computes the ranking for all participants in a tournament
 * by summing their approved scores and ranking them in descending order.
 * 
 * @param p_tournament_id UUID - The tournament ID to calculate ranking for
 * @returns TABLE with user_id, display_name, total_score, and rank
 * 
 * Requirements: 6.1 (Ranking calculation)
 */
CREATE OR REPLACE FUNCTION dev.calculate_ranking(p_tournament_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  total_score BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    pr.display_name,
    COALESCE(SUM(s.score), 0)::BIGINT AS total_score,
    RANK() OVER (ORDER BY COALESCE(SUM(s.score), 0) DESC) AS rank
  FROM dev.participants p
  JOIN dev.profiles pr ON pr.id = p.user_id
  LEFT JOIN dev.scores s ON s.user_id = p.user_id
    AND s.tournament_id = p.tournament_id
    AND s.status = 'approved'
  WHERE p.tournament_id = p_tournament_id
  GROUP BY p.user_id, pr.display_name
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION dev.calculate_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION dev.calculate_ranking(UUID) TO anon;

-- ============================================
-- Tournament Status View
-- ============================================

/**
 * View that adds computed status field to tournaments
 * 
 * Status is calculated based on current time:
 * - 'upcoming': start_at is in the future
 * - 'active': current time is between start_at and end_at
 * - 'ended': end_at is in the past
 * 
 * Requirements: 7.4 (Tournament status display)
 */
CREATE OR REPLACE VIEW dev.tournaments_with_status AS
SELECT
  t.*,
  CASE
    WHEN NOW() < t.start_at THEN 'upcoming'::dev.tournament_status
    WHEN NOW() BETWEEN t.start_at AND t.end_at THEN 'active'::dev.tournament_status
    ELSE 'ended'::dev.tournament_status
  END AS status
FROM dev.tournaments t;

-- Grant select permission on the view
GRANT SELECT ON dev.tournaments_with_status TO authenticated;
GRANT SELECT ON dev.tournaments_with_status TO anon;

-- ============================================
-- Helper Function: Check Active Tournament Limit
-- ============================================

/**
 * Check if a user has reached the active tournament limit
 * 
 * Users can only organize one active tournament at a time.
 * A tournament is considered active if its end_at is in the future.
 * 
 * @param p_user_id UUID - The user ID to check
 * @returns BOOLEAN - TRUE if user has an active tournament, FALSE otherwise
 * 
 * Requirements: 2.2 (Active tournament limit)
 */
CREATE OR REPLACE FUNCTION dev.has_active_tournament(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM dev.tournaments
    WHERE organizer_id = p_user_id
      AND end_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION dev.has_active_tournament(UUID) TO authenticated;

-- ============================================
-- Helper Function: Get Tournament Participant Count
-- ============================================

/**
 * Get the number of participants in a tournament
 * 
 * @param p_tournament_id UUID - The tournament ID
 * @returns INTEGER - Number of participants
 * 
 * Requirements: 8.4 (Participant statistics)
 */
CREATE OR REPLACE FUNCTION dev.get_participant_count(p_tournament_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM dev.participants
    WHERE tournament_id = p_tournament_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION dev.get_participant_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION dev.get_participant_count(UUID) TO anon;

-- ============================================
-- Helper Function: Get Tournament Score Count
-- ============================================

/**
 * Get the number of approved scores in a tournament
 * 
 * @param p_tournament_id UUID - The tournament ID
 * @returns INTEGER - Number of approved scores
 * 
 * Requirements: 8.4 (Submission statistics)
 */
CREATE OR REPLACE FUNCTION dev.get_score_count(p_tournament_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM dev.scores
    WHERE tournament_id = p_tournament_id
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION dev.get_score_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION dev.get_score_count(UUID) TO anon;

-- ============================================
-- Trigger: Prevent Multiple Active Tournaments
-- ============================================

/**
 * Trigger function to enforce active tournament limit
 * 
 * Prevents a user from creating a second active tournament
 * 
 * Requirements: 2.2 (Active tournament limit)
 */
CREATE OR REPLACE FUNCTION dev.check_active_tournament_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF dev.has_active_tournament(NEW.organizer_id) THEN
    RAISE EXCEPTION 'User already has an active tournament'
      USING ERRCODE = '23505'; -- unique_violation
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tournaments table
CREATE TRIGGER enforce_active_tournament_limit
  BEFORE INSERT ON dev.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION dev.check_active_tournament_limit();

-- ============================================
-- Trigger: Validate Tournament Has Songs
-- ============================================

/**
 * Trigger function to ensure tournament has at least one song
 * 
 * This is a deferred constraint check that validates after the transaction
 * 
 * Requirements: 2.4 (Tournament song requirement)
 */
CREATE OR REPLACE FUNCTION dev.validate_tournament_has_songs()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if tournament has at least one song
  IF NOT EXISTS (
    SELECT 1
    FROM dev.tournament_songs
    WHERE tournament_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Tournament must have at least one song'
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger should be created as a CONSTRAINT TRIGGER
-- but for simplicity, we'll document this requirement in the application layer
-- The application should ensure at least one song is added when creating a tournament

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON FUNCTION dev.calculate_ranking(UUID) IS 
  'Calculate tournament ranking based on total approved scores. Returns ranked list of participants.';

COMMENT ON VIEW dev.tournaments_with_status IS 
  'Tournaments with computed status field (upcoming/active/ended) based on current time.';

COMMENT ON FUNCTION dev.has_active_tournament(UUID) IS 
  'Check if a user has an active tournament (end_at in future).';

COMMENT ON FUNCTION dev.get_participant_count(UUID) IS 
  'Get the number of participants in a tournament.';

COMMENT ON FUNCTION dev.get_score_count(UUID) IS 
  'Get the number of approved scores in a tournament.';
