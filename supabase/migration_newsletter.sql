-- Newsletter: admin-authored posts (announcements, giveaways, drawings)
-- with open public commenting, shown on the new pages/newsletter.html.
-- Run this once in the Supabase SQL Editor, after schema.sql.
-- Also run the "Storage bucket for newsletter images" section added to
-- storage.sql, if you want post images.

create table public.newsletter_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'announcement' check (category in ('announcement', 'giveaway', 'drawing', 'general')),
  body text not null,
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.newsletter_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.newsletter_posts(id) on delete cascade,
  name text not null,
  comment text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.newsletter_posts enable row level security;
alter table public.newsletter_comments enable row level security;

-- Posts: published ones are public (no login required — this is a public
-- announcements/giveaways feed); admins can also see + manage drafts.
create policy "newsletter_posts_select_published" on public.newsletter_posts
  for select using (published = true or public.is_admin());

create policy "newsletter_posts_write_admin" on public.newsletter_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- Comments: anyone can post, no login required (same anonymous-insert
-- pattern as the contact form's inquiries table). Visible comments are
-- public; admins can see + moderate everything including hidden ones.
create policy "newsletter_comments_select_visible" on public.newsletter_comments
  for select using (hidden = false or public.is_admin());

create policy "newsletter_comments_insert_public" on public.newsletter_comments
  for insert with check (true);

create policy "newsletter_comments_moderate_admin" on public.newsletter_comments
  for update using (public.is_admin()) with check (public.is_admin());

create policy "newsletter_comments_delete_admin" on public.newsletter_comments
  for delete using (public.is_admin());
