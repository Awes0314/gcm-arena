-- Create storage bucket for score images
insert into storage.buckets (id, name, public)
values ('score-images', 'score-images', true);

-- Set up storage policies for score-images bucket
-- Allow authenticated users to upload images
create policy "Authenticated users can upload score images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'score-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own images
create policy "Users can read their own score images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'score-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow organizers to read images from their tournaments
create policy "Organizers can read tournament score images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'score-images' and
  exists (
    select 1 from dev.tournaments t
    where t.id::text = (storage.foldername(name))[1]
    and t.organizer_id = auth.uid()
  )
);

-- Allow public read access (for displaying images)
create policy "Public can read score images"
on storage.objects for select
to public
using (bucket_id = 'score-images');

-- Allow users to delete their own images
create policy "Users can delete their own score images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'score-images' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow organizers to delete images from their tournaments
create policy "Organizers can delete tournament score images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'score-images' and
  exists (
    select 1 from dev.tournaments t
    where t.id::text = (storage.foldername(name))[1]
    and t.organizer_id = auth.uid()
  )
);
