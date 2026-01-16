-- Automatically create profile when user signs up
-- This trigger creates a profile record in dev.profiles when a new user is created in auth.users

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION dev.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = dev, public, auth
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO dev.profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION dev.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA dev TO supabase_auth_admin;
GRANT INSERT ON dev.profiles TO supabase_auth_admin;

-- Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
