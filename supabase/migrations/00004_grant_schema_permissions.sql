-- Grant usage on dev schema to anon and authenticated roles
-- This allows unauthenticated and authenticated users to access the dev schema

-- Grant USAGE on the dev schema
GRANT USAGE ON SCHEMA dev TO anon;
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant SELECT on all tables in dev schema to anon (for public data)
-- Individual RLS policies will still control what data is visible
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO authenticated;

-- Grant INSERT, UPDATE, DELETE on tables to authenticated users
-- RLS policies will control which rows can be modified
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dev TO authenticated;

-- Grant EXECUTE on all functions in dev schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dev TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dev TO authenticated;

-- Grant USAGE on all sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA dev TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT EXECUTE ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT USAGE ON SEQUENCES TO authenticated;

-- Grant access to the tournaments_with_status view specifically
GRANT SELECT ON dev.tournaments_with_status TO anon;
GRANT SELECT ON dev.tournaments_with_status TO authenticated;
