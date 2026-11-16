-- Adds a pre-generated thumbnail image column for PDF flyers.
--
-- Catalog cards used to render PDF flyers live in the browser via PDF.js
-- on every single page view, for every visitor — slow, and the cause of
-- thumbnails intermittently failing to load under load. Now a thumbnail
-- image is generated once, when the flyer is uploaded in the admin
-- dashboard, and stored here; catalog pages just show that image
-- directly (a plain <img>, no PDF.js needed) whenever it's present.
--
-- Existing products added before this change will have this column as
-- null and keep rendering via the old live PDF.js path until re-saved.
--
-- Run this once in the Supabase SQL Editor.

alter table public.products add column if not exists flyer_thumb_path text;
