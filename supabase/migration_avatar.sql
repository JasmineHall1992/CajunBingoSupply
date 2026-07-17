-- Cajun Bingo Supply — add profile picture support
-- Run once in the Supabase SQL Editor, after schema.sql and storage.sql.

alter table public.profiles add column if not exists avatar_url text;
