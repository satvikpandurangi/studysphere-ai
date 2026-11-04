-- Hosted PostgREST sessions load safeupdate. Target the policy's enforced
-- singleton explicitly; do not disable the provider's UPDATE safeguard.
-- Definitions only: applying this migration does not resume uploads.
begin;

create or replace function private.pdf_ledger_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.pdf_storage_policy set revision=revision+1 where singleton=true;
  return null;
end
$$;

create or replace function public.complete_pdf_storage_review(acting_user uuid,expected_revision bigint,confirmed_settled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare p public.pdf_storage_policy;
begin
  if not private.pdf_platform(acting_user) or confirmed_settled is distinct from true then raise exception 'Platform review and settled-write confirmation required'; end if;
  select * into p from public.pdf_storage_policy where singleton=true for update;
  if not found then raise exception 'PDF storage policy unavailable'; end if;
  if not p.uploads_paused or p.revision is distinct from expected_revision then raise exception 'Pause uploads and refresh the inventory before completing review'; end if;
  if exists(select 1 from public.pdf_asset_objects where state in ('reserved','uncertain') or (state<>'removed' and not size_verified)) then raise exception 'Resolve pending writes and unknown sizes before completing review'; end if;
  update public.pdf_storage_policy set uploads_paused=false,inventory_reviewed_at=now(),revision=revision+1 where singleton=true;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(acting_user,'pdf_storage_review_completed','storage','inventory');
end
$$;

-- CREATE OR REPLACE preserves the established service-only EXECUTE grants.
commit;
