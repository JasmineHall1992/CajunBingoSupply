-- Expands Pull Tab subcategories from 4 to 9, and adds "Dabbers" as a new
-- top-level product category alongside pull-tab/raffle.
-- Run this once in the Supabase SQL Editor.

alter table public.products drop constraint if exists products_status_tag_check;
alter table public.products add constraint products_status_tag_check
  check (status_tag in (
    'all_plays',
    'coming_soon',
    'dab_tickets',
    'horse_races',
    'instant',
    'newest',
    'out_of_stock_production',
    'progressives',
    'seasonal'
  ));

alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('pull-tab', 'raffle', 'dabber'));
