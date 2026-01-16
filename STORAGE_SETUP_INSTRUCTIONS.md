# Storage Bucket Setup Instructions

The image submission feature requires a Supabase Storage bucket to be created. You have two options:

## Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Apply the migration
supabase db push

# Or if you're using local development
supabase migration up
```

## Option 2: Manual Setup via Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - Name: `score-images`
   - Public bucket: **Yes** (checked)
   - Click **Create bucket**

6. Set up Storage Policies:
   - Click on the `score-images` bucket
   - Go to **Policies** tab
   - Click **New Policy**
   - Add the following policies:

### Policy 1: Authenticated users can upload
```sql
CREATE POLICY "Authenticated users can upload score images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'score-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Public can read
```sql
CREATE POLICY "Public can read score images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'score-images');
```

### Policy 3: Users can delete their own images
```sql
CREATE POLICY "Users can delete their own score images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'score-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Organizers can read tournament images
```sql
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
```

### Policy 5: Organizers can delete tournament images
```sql
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
```

## Option 3: Run the SQL Migration Directly

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/00011_create_storage_bucket.sql`
5. Click **Run**

## Verification

After setting up the bucket, verify it works by:

1. Restart your Next.js development server
2. Navigate to a tournament you're participating in
3. Go to the score submission page
4. Try uploading an image

The upload should now work successfully!

## Troubleshooting

If you still get errors:

1. **Check bucket exists**: Go to Storage in Supabase Dashboard and verify `score-images` bucket is listed
2. **Check bucket is public**: The bucket should have "Public" badge
3. **Check policies**: Verify all 5 policies are created in the Policies tab
4. **Check schema**: If using dev schema, make sure the policy references `dev.tournaments` not `public.tournaments`
