-- Add tournament_id and link_url columns to notifications table
-- This allows notifications to link to specific tournaments or pages

-- Add columns to dev schema
ALTER TABLE dev.notifications
ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES dev.tournaments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS link_url text;

-- Add columns to public schema (for production)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS link_url text;

-- Add index for faster queries by tournament_id
CREATE INDEX IF NOT EXISTS idx_notifications_tournament_id ON dev.notifications(tournament_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tournament_id ON public.notifications(tournament_id);

-- Add comments
COMMENT ON COLUMN dev.notifications.tournament_id IS 'Optional reference to related tournament';
COMMENT ON COLUMN dev.notifications.link_url IS 'Optional URL to navigate to when notification is clicked';
COMMENT ON COLUMN public.notifications.tournament_id IS 'Optional reference to related tournament';
COMMENT ON COLUMN public.notifications.link_url IS 'Optional URL to navigate to when notification is clicked';
