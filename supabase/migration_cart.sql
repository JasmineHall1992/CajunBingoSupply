-- Adds the shopping-basket feature: a per-user cart (mirrors `favorites`),
-- plus an `order_items` column on `inquiries` so a basket checkout can carry
-- multiple line items into one order (the old flow only ever linked one
-- `product_id` per inquiry).
--
-- Run this once in the Supabase SQL Editor.

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity int not null default 1 check (quantity > 0),
  added_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

-- Same access pattern as favorites: a user manages only their own rows,
-- and only while their account is approved.
create policy "cart_items_select_own" on public.cart_items
  for select using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

create policy "cart_items_insert_own" on public.cart_items
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

create policy "cart_items_update_own" on public.cart_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cart_items_delete_own" on public.cart_items
  for delete using (auth.uid() = user_id);

-- Order form now sends a structured line-item list (product + quantity)
-- alongside the free-text comments box, instead of relying on one product_id.
alter table public.inquiries add column if not exists order_items jsonb;
alter table public.inquiries alter column message drop not null;
