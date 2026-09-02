-- Adds a status tag to products so Premium Pull Tabs can be organized into
-- subcategories, surfaced as separate pages under a nav dropdown: Coming
-- Soon, Out of Stock (In Production), Newest Tabs, Instants.
-- Nullable: no tag = a regular catalog listing, unaffected by this change.
--
-- Run this once in the Supabase SQL Editor.

alter table public.products
  add column if not exists status_tag text
  check (status_tag in ('coming_soon', 'out_of_stock_production', 'newest', 'instant'));
