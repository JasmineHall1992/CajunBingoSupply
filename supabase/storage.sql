-- Cajun Bingo Supply — Storage bucket for flyer uploads
-- Run once in the Supabase SQL Editor, after schema.sql (needs public.is_admin()).

insert into storage.buckets (id, name, public)
values ('flyers', 'flyers', true)
on conflict (id) do nothing;

-- Anyone can view flyers (they're public marketing PDFs/images once a
-- product is in the catalog) — the catalog page itself is still login-gated
-- separately via the products table RLS.
create policy "flyers_public_read" on storage.objects
  for select using (bucket_id = 'flyers');

-- Only admins can upload/replace/remove flyer files.
create policy "flyers_admin_insert" on storage.objects
  for insert with check (bucket_id = 'flyers' and public.is_admin());

create policy "flyers_admin_update" on storage.objects
  for update using (bucket_id = 'flyers' and public.is_admin());

create policy "flyers_admin_delete" on storage.objects
  for delete using (bucket_id = 'flyers' and public.is_admin());

-- ============================================================
-- Storage bucket for user profile pictures
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read (so the avatar can display in the nav/account page for anyone
-- viewing the site), but a user may only upload/replace/remove a file inside
-- their own folder — files are stored as "{user_id}/avatar.{ext}".
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_own_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_own_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
