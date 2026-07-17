-- Cajun Bingo Supply — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query) on a fresh project.
-- Safe to re-run top to bottom on an empty project; not idempotent against partial re-runs.

-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  role text not null default 'customer' check (role in ('customer','admin')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  name text not null,
  form_label text,
  category text not null check (category in ('pull-tab','raffle')),
  price_display text not null,
  img_class text,
  flyer_path text,
  payout_rows jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id),
  saved_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  product_id text,
  product_name text,
  action text not null check (action in ('saved','removed')),
  ts timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  product_id text references public.products(id),
  user_id uuid references public.profiles(id),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER: is_admin()
-- SECURITY DEFINER so it can read profiles.role without recursing
-- through the RLS policy that itself calls this function.
-- ============================================================

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- TRIGGER: auto-create a profiles row when someone signs up
-- (email/password or Google — both go through auth.users insert)
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: log favorites add/remove into activity_log
-- (client never writes activity_log directly)
-- ============================================================

create function public.log_favorite_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.activity_log (user_id, product_id, product_name, action)
    values (new.user_id, new.product_id, (select name from public.products where id = new.product_id), 'saved');
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.activity_log (user_id, product_id, product_name, action)
    values (old.user_id, old.product_id, (select name from public.products where id = old.product_id), 'removed');
    return old;
  end if;
  return null;
end;
$$;

create trigger on_favorite_change
  after insert or delete on public.favorites
  for each row execute function public.log_favorite_activity();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;
alter table public.activity_log enable row level security;
alter table public.inquiries enable row level security;

-- profiles: own row or admin can read; admin can update status/role;
-- a user can update their own name only.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

create policy "profiles_update_own_name" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_admin());

-- products: readable by any authenticated user whose profile is approved;
-- admins can read everything (including inactive) and write.
create policy "products_select_approved_users" on public.products
  for select using (
    is_active = true
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'approved'
    )
  );

create policy "products_select_admin" on public.products
  for select using (public.is_admin());

create policy "products_write_admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- favorites: a user manages only their own rows, and only while approved.
create policy "favorites_select_own" on public.favorites
  for select using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

create policy "favorites_insert_own" on public.favorites
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- activity_log: admin-only read; deletes allowed for admin ("Clear Log").
-- No insert policy — rows are only ever created by the SECURITY DEFINER trigger above.
create policy "activity_log_select_admin" on public.activity_log
  for select using (public.is_admin());

create policy "activity_log_delete_admin" on public.activity_log
  for delete using (public.is_admin());

-- inquiries: anyone (including anonymous visitors) can submit the contact form;
-- only admins can read/manage them.
create policy "inquiries_insert_public" on public.inquiries
  for insert with check (true);

create policy "inquiries_select_admin" on public.inquiries
  for select using (public.is_admin());

create policy "inquiries_update_admin" on public.inquiries
  for update using (public.is_admin());

-- ============================================================
-- ONE-TIME MANUAL STEP (do this after your first real signup):
--   update public.profiles set role = 'admin', status = 'approved'
--   where email = 'joeys-email@example.com';
-- This bootstraps the first admin account. Every other admin/approval
-- action after this can be done from the app's admin panel.
-- ============================================================
