-- ============================================
-- Schema Permissions for Public Schema
-- ============================================
-- This migration grants appropriate permissions to anon and authenticated roles
-- for the public schema used in production.
--
-- Requirements: 11.2, 11.3, 13.1, 13.3, 13.4

-- Set search path to public schema
SET search_path TO public;

-- ============================================
-- Grant Schema Usage
-- ============================================

-- Grant USAGE on the public schema (already exists by default, but explicit is better)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- Grant Table Permissions
-- ============================================

-- Grant SELECT on all tables in public schema to anon (for public data)
-- Individual RLS policies will still control what data is visible
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant INSERT, UPDATE, DELETE on tables to authenticated users
-- RLS policies will control which rows can be modified
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================
-- Grant Function Permissions
-- ============================================

-- Grant EXECUTE on all functions in public schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- Grant Sequence Permissions
-- ============================================

-- Grant USAGE on all sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- Set Default Privileges
-- ============================================

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated;

-- ============================================
-- Grant View Permissions
-- ============================================

-- Grant access to the tournaments_with_status view specifically
GRANT SELECT ON public.tournaments_with_status TO anon;
GRANT SELECT ON public.tournaments_with_status TO authenticated;

-- ============================================
-- Comments
-- ============================================

COMMENT ON SCHEMA public IS 'Production schema with full RLS policies and permissions';
