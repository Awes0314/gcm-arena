-- Grant full access to service_role on dev schema
-- This allows scripts and admin operations to work with the dev schema

-- Grant ALL privileges on dev schema to service_role
GRANT ALL ON SCHEMA dev TO service_role;

-- Grant ALL privileges on all tables in dev schema to service_role
GRANT ALL ON ALL TABLES IN SCHEMA dev TO service_role;

-- Grant ALL privileges on all sequences in dev schema to service_role
GRANT ALL ON ALL SEQUENCES IN SCHEMA dev TO service_role;

-- Grant EXECUTE on all functions in dev schema to service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA dev TO service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA dev
  GRANT EXECUTE ON FUNCTIONS TO service_role;
