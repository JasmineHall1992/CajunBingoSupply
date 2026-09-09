-- Lets the admin change the sign-up access code from the dashboard instead
-- of it being a hardcoded constant in login.html's source. Single-row
-- settings table, extensible later for other site-wide settings.
--
-- Run this once in the Supabase SQL Editor.

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  signup_access_code text not null default 'CAJUN1989',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.app_settings (id, signup_access_code) values (1, 'CAJUN1989');

alter table public.app_settings enable row level security;

-- The sign-up page reads this before the visitor is authenticated at all,
-- so it has to be publicly readable — it's a first-line filter, not a real
-- secret (same as the old hardcoded constant it replaces).
create policy "app_settings_select_all" on public.app_settings
  for select using (true);

create policy "app_settings_update_admin" on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());
