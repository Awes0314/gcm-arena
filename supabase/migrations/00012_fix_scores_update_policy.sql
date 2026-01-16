-- Set search path to dev schema
SET search_path TO dev;

-- ============================================
-- Fix Scores Update Policy
-- ============================================

/**
 * Fix scores update policy to allow users to update their own scores
 * 
 * Previous policy only allowed updating pending scores, but users should
 * be able to update their approved scores if they submit a higher score.
 * 
 * Requirements: 4.6 (Score submission updates participant records)
 */

-- Drop the old policy
DROP POLICY IF EXISTS "scores_update_own_policy" ON dev.scores;

-- Create new policy that allows users to update their own scores
CREATE POLICY "scores_update_own_policy"
  ON dev.scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT UPDATE ON dev.scores TO authenticated;

COMMENT ON POLICY "scores_update_own_policy" ON dev.scores IS 
  'Users can update their own scores (both pending and approved)';
