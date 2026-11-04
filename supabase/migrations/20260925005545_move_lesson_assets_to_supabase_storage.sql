alter table public.content_items
  add column if not exists asset_bytes bigint not null default 0
  check (asset_bytes between 0 and 15000000);

comment on column public.content_items.asset_bytes is
  'Byte size of the private PDF stored in the lesson-assets Supabase Storage bucket.';
