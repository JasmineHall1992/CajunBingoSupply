-- Renames the "Bingo Winner" payout row label to "Ball Winner" on the
-- Rubber Ducky Downline products (RBDD01/02/03) — the seed data used the
-- old wording, this fixes the rows already in the live products table.
--
-- Run this once in the Supabase SQL Editor.

update public.products
set payout_rows = (
  select jsonb_agg(
    case when row->>'label' = 'Bingo Winner'
         then jsonb_set(row, '{label}', '"Ball Winner"')
         else row
    end
  )
  from jsonb_array_elements(payout_rows) as row
)
where payout_rows @> '[{"label": "Bingo Winner"}]'::jsonb;
