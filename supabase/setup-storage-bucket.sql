-- ============================================
-- Storage Bucket Setup for Image Submissions
-- ============================================
-- Run this script in Supabase SQL Editor to create the storage bucket
-- and set up the necessary policies for image submissions.

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('score-images', 'score-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set up storage policies
-- Note: Drop existing policies first to avoid conflicts

DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Authenticated users can upload score images" ON storage.objects;
  DROP POLICY IF EXISTS "Public can read score images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own score images" ON storage.objects;
  DROP POLICY IF EXISTS "Organizers can read tournament score images" ON storage.objects;
  DROP POLICY IF EXISTS "Organizers can delete tournament score images" ON storage.objects;
END $$;

-- Policy 1: Allow authenticated users to upload images
-- Path format: {tournamentId}/{userId}/{filename}
CREATE POLICY "Authenticated users can upload score images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'score-images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Allow public read access (for displaying images)
CREATE POLICY "Public can read score images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'score-images');

-- Policy 3: Allow users to delete their own images
-- Path format: {tournamentId}/{userId}/{filename}
CREATE POLICY "Users can delete their own score images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'score-images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow organizers to read images from their tournaments
-- Path format: {tournamentId}/{userId}/{filename}
CREATE POLICY "Organizers can read tournament score images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'score-images' AND
  EXISTS (
    SELECT 1 FROM dev.tournaments t
    WHERE t.id::text = (storage.foldername(name))[1]
    AND t.organizer_id = auth.uid()
  )
);

-- Policy 5: Allow organizers to delete images from their tournaments
-- Path format: {tournamentId}/{userId}/{filename}
CREATE POLICY "Organizers can delete tournament score images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'score-images' AND
  EXISTS (
    SELECT 1 FROM dev.tournaments t
    WHERE t.id::text = (storage.foldername(name))[1]
    AND t.organizer_id = auth.uid()
  )
);

-- Verification query
SELECT 
  'Bucket created successfully!' as status,
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'score-images';
