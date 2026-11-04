-- Count physical overlap and uncertain writes; never release capacity just because a lease ages.
begin;
create table public.pdf_storage_policy (
  singleton boolean primary key default true check(singleton),
  max_pdf_bytes bigint not null default 15000000 check(max_pdf_bytes between 5 and 15000000),
  storage_limit_bytes bigint not null default 800000000 check(storage_limit_bytes>0),
  bucket text not null default 'lesson-assets' check(bucket ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  uploads_paused boolean not null default true,
  inventory_reviewed_at timestamptz,
  revision bigint not null default 1
);
insert into public.pdf_storage_policy(singleton) values(true);
create table public.pdf_asset_objects (
  id uuid primary key default gen_random_uuid(),
  object_key text not null unique check(length(object_key) between 1 and 1024),
  content_id uuid references public.content_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  bytes bigint not null check(bytes>=0),
  size_verified boolean not null default true,
  state text not null check(state in ('reserved','active','cleanup','uncertain','retained','removed')),
  expected_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index pdf_one_upload_per_content on public.pdf_asset_objects(content_id) where state in ('reserved','uncertain');
create index pdf_asset_cleanup on public.pdf_asset_objects(state,created_at);
alter table public.pdf_storage_policy enable row level security;
alter table public.pdf_asset_objects enable row level security;
revoke all on public.pdf_storage_policy,public.pdf_asset_objects from public,anon,authenticated;

-- Existing pointers remain usable. Zero/conflicting legacy sizes block new reservations until inventory review.
insert into public.pdf_asset_objects(object_key,content_id,bytes,size_verified,state)
select object_key,min(id::text)::uuid,max(asset_bytes),min(asset_bytes)>0 and count(distinct asset_bytes)=1,'active'
from public.content_items where object_key is not null group by object_key;

create function private.pdf_staff(actor uuid,school uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=actor and p.role='platform_admin') or
    (school is not null and exists(select 1 from public.memberships m where m.user_id=actor and m.school_id=school and m.role in ('editor','school_admin')))
$$;
create function private.pdf_platform(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=actor and role='platform_admin')
$$;
create function private.pdf_ledger_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.pdf_storage_policy set revision=revision+1; return null; end
$$;
create trigger pdf_ledger_changed after insert or update or delete on public.pdf_asset_objects for each statement execute function private.pdf_ledger_changed();

create function private.pdf_content_guard() returns trigger language plpgsql set search_path='' as $$
begin
  if (tg_op='INSERT' and (new.object_key is not null or new.asset_bytes<>0)) or
    (tg_op='UPDATE' and (new.object_key is distinct from old.object_key or new.asset_bytes is distinct from old.asset_bytes)) then
    if current_user <> pg_get_userbyid((select relowner from pg_class where oid='public.pdf_asset_objects'::regclass)) then
      raise exception 'PDF attachments must use the storage transaction';
    end if;
  end if;
  if tg_op='UPDATE' and old.object_key is not null and new.kind is distinct from old.kind then
    raise exception 'Remove the attached PDF before changing content type';
  end if;
  if new.kind='pdf' and new.status='published' and new.object_key is null then raise exception 'Upload a PDF before publishing'; end if;
  return new;
end
$$;
create trigger asset_integrity before insert or update on public.content_items for each row execute function private.pdf_content_guard();

create function public.pdf_storage_state() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('maxPdfBytes',p.max_pdf_bytes,'storageLimitBytes',p.storage_limit_bytes,'bucket',p.bucket,
    'uploadsPaused',p.uploads_paused,'inventoryReviewed',p.inventory_reviewed_at is not null,'revision',p.revision,'measuredAt',now(),
    'accountedBytes',coalesce(sum(o.bytes) filter(where o.state<>'removed'),0),
    'activeBytes',coalesce(sum(o.bytes) filter(where o.state='active'),0),
    'pendingBytes',coalesce(sum(o.bytes) filter(where o.state in ('reserved','uncertain','cleanup','retained')),0),
    'heldObjects',count(o.id) filter(where o.state='retained'),
    'reservedUploads',count(o.id) filter(where o.state='reserved'),
    'uncertainUploads',count(o.id) filter(where o.state='uncertain'),
    'cleanupObjects',count(o.id) filter(where o.state='cleanup'),
    'unverifiedObjects',count(o.id) filter(where o.state<>'removed' and not o.size_verified))
  from public.pdf_storage_policy p left join public.pdf_asset_objects o on true group by p.singleton
$$;

create function public.check_pdf_upload_access(target_content uuid,acting_user uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.content_items c where c.id=target_content and c.kind='pdf' and private.pdf_staff(acting_user,c.school_id)) then
    raise exception 'PDF content unavailable for this staff account';
  end if;
end
$$;

create function public.reserve_pdf_upload(target_content uuid,acting_user uuid,incoming_bytes bigint,pdf_cap bigint,storage_cap bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pdf_storage_policy; c public.content_items; upload_id uuid:=gen_random_uuid(); key text; used bigint;
begin
  select * into p from public.pdf_storage_policy for update;
  select * into c from public.content_items where id=target_content for update;
  if not found or c.kind<>'pdf' or not private.pdf_staff(acting_user,c.school_id) then raise exception 'PDF content unavailable for this staff account'; end if;
  if p.uploads_paused then raise exception 'PDF uploads are paused for maintenance'; end if;
  if p.inventory_reviewed_at is null then raise exception 'Complete the initial PDF inventory review before uploads'; end if;
  if incoming_bytes is null or incoming_bytes<5 or incoming_bytes>least(p.max_pdf_bytes,coalesce(pdf_cap,p.max_pdf_bytes)) then raise exception 'PDF exceeds the current file-size limit'; end if;
  if exists(select 1 from public.pdf_asset_objects where state<>'removed' and not size_verified) then raise exception 'PDF storage needs inventory reconciliation before new uploads'; end if;
  if exists(select 1 from public.pdf_asset_objects where content_id=c.id and state in ('reserved','uncertain')) then raise exception 'This PDF already has a pending upload; refresh or contact the operator'; end if;
  select coalesce(sum(bytes),0) into used from public.pdf_asset_objects where state<>'removed';
  if used+incoming_bytes>least(p.storage_limit_bytes,coalesce(storage_cap,p.storage_limit_bytes)) then raise exception 'PDF storage capacity reached, including pending uploads and cleanup'; end if;
  key:='pdf/'||c.id||'/'||upload_id||'.pdf';
  insert into public.pdf_asset_objects(id,object_key,content_id,created_by,bytes,state,expected_version)
    values(upload_id,key,c.id,acting_user,incoming_bytes,'reserved',c.version);
  return jsonb_build_object('id',upload_id,'key',key,'bucket',p.bucket);
end
$$;

create function public.finalize_pdf_upload(upload_id uuid,acting_user uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.pdf_asset_objects; c public.content_items; old_key text; saved_version integer;
begin
  perform 1 from public.pdf_storage_policy for update;
  select * into o from public.pdf_asset_objects where id=upload_id for update;
  if not found or o.created_by is distinct from acting_user or o.state<>'reserved' then raise exception 'Upload reservation unavailable'; end if;
  select * into c from public.content_items where id=o.content_id for update;
  if not found or c.kind<>'pdf' or c.version<>o.expected_version or not private.pdf_staff(acting_user,c.school_id) then raise exception 'Content or staff access changed during upload; reload the item'; end if;
  old_key:=c.object_key;
  update public.content_items set object_key=o.object_key,asset_bytes=o.bytes,pdf_text=null,status='draft' where id=c.id returning version into saved_version;
  update public.pdf_asset_objects set state='active',updated_at=now() where id=o.id;
  update public.pdf_asset_objects set state='cleanup',updated_at=now() where object_key=old_key
    and not exists(select 1 from public.content_items where object_key=old_key);
  return jsonb_build_object('ok',true,'contentVersion',saved_version);
end
$$;

create function public.settle_pdf_upload(upload_id uuid,acting_user uuid,upload_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.pdf_storage_policy for update;
  -- A lost finalize response may already have attached the object. Never detach it here.
  update public.pdf_asset_objects set state=case when upload_confirmed is true then 'cleanup' else 'uncertain' end,updated_at=now()
    where id=upload_id and state='reserved' and (created_by=acting_user or created_by is null)
    and not exists(select 1 from public.content_items c where c.object_key=pdf_asset_objects.object_key);
end
$$;

create function public.detach_pdf_asset(target_content uuid,acting_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.content_items;
begin
  perform 1 from public.pdf_storage_policy for update;
  select * into c from public.content_items where id=target_content for update;
  if not found or c.kind<>'pdf' or not private.pdf_staff(acting_user,c.school_id) then raise exception 'PDF content unavailable for this staff account'; end if;
  if exists(select 1 from public.pdf_asset_objects where content_id=c.id and state in ('reserved','uncertain')) then raise exception 'Resolve the pending upload before removing this PDF'; end if;
  update public.content_items set object_key=null,asset_bytes=0,pdf_text=null,status='draft' where id=c.id;
  update public.pdf_asset_objects set state='cleanup',updated_at=now() where object_key=c.object_key
    and not exists(select 1 from public.content_items where object_key=c.object_key);
end
$$;

create function public.pdf_cleanup_candidates(target_content uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
    select o.id,o.object_key,p.bucket from public.pdf_asset_objects o cross join public.pdf_storage_policy p
    where o.state='cleanup' and (target_content is null or o.content_id=target_content) and not exists(select 1 from public.content_items c where c.object_key=o.object_key)
    order by o.updated_at,o.id limit 20
  ) r
$$;
create function public.confirm_pdf_cleanup(object_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.pdf_storage_policy for update;
  update public.pdf_asset_objects set state='removed',updated_at=now() where id=object_id and state='cleanup'
    and not exists(select 1 from public.content_items c where c.object_key=pdf_asset_objects.object_key);
end
$$;

create function public.pdf_asset_inventory() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('policy',public.pdf_storage_state(),'objects',coalesce((select jsonb_agg(to_jsonb(o)) from public.pdf_asset_objects o where state<>'removed'),'[]'::jsonb),
    'references',coalesce((select jsonb_agg(jsonb_build_object('id',id,'key',object_key,'bytes',asset_bytes)) from public.content_items where object_key is not null),'[]'::jsonb))
$$;

-- Maintenance reconciliation is explicit, one inspected object at a time, after writes have settled.
create function public.mark_abandoned_pdf_upload(upload_id uuid,acting_user uuid,confirmed_settled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.pdf_platform(acting_user) or confirmed_settled is distinct from true then raise exception 'Platform review and settled-write confirmation required'; end if;
  perform 1 from public.pdf_storage_policy where uploads_paused for update;
  if not found then raise exception 'Pause uploads before maintenance'; end if;
  update public.pdf_asset_objects set state='uncertain',updated_at=now() where id=upload_id and state='reserved' and created_at<now()-interval '1 hour';
  if not found then raise exception 'Reservation is not eligible for abandoned-write review'; end if;
end
$$;
create function public.reconcile_pdf_asset(acting_user uuid,asset_key text,actual_bytes bigint,expected_revision bigint,confirmed_settled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare p public.pdf_storage_policy; referenced boolean;
begin
  if not private.pdf_platform(acting_user) or confirmed_settled is distinct from true then raise exception 'Platform review and settled-write confirmation required'; end if;
  select * into p from public.pdf_storage_policy for update;
  if not p.uploads_paused or p.revision is distinct from expected_revision then raise exception 'Pause uploads and refresh the inventory before reconciliation'; end if;
  if exists(select 1 from public.pdf_asset_objects where state='reserved') then raise exception 'Resolve in-flight reservations before reconciliation'; end if;
  select exists(select 1 from public.content_items where object_key=asset_key) into referenced;
  if actual_bytes is null then
    if referenced then raise exception 'Referenced PDF is missing; restore or explicitly detach it first'; end if;
    update public.pdf_asset_objects set state='removed',size_verified=true,updated_at=now() where object_key=asset_key;
  else
    if actual_bytes<0 then raise exception 'Invalid observed object size'; end if;
    insert into public.pdf_asset_objects(object_key,bytes,state,size_verified) values(asset_key,actual_bytes,case when referenced then 'active' else 'retained' end,true)
      on conflict(object_key) do update set bytes=excluded.bytes,
        state=case when referenced then 'active' when pdf_asset_objects.state='cleanup' then 'cleanup' else 'retained' end,
        size_verified=true,updated_at=now();
    if referenced and actual_bytes<=15000000 then update public.content_items set asset_bytes=actual_bytes where object_key=asset_key and asset_bytes<>actual_bytes; end if;
  end if;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(acting_user,'pdf_storage_reconciled','storage','inventory');
end
$$;

create function public.approve_pdf_object_cleanup(acting_user uuid,asset_key text,expected_revision bigint,confirmed_delete boolean) returns void
language plpgsql security definer set search_path='' as $$
declare p public.pdf_storage_policy; object_id uuid;
begin
  if not private.pdf_platform(acting_user) or confirmed_delete is distinct from true then raise exception 'Explicit platform approval to delete this object is required'; end if;
  select * into p from public.pdf_storage_policy for update;
  if not p.uploads_paused or p.revision is distinct from expected_revision then raise exception 'Pause uploads and refresh the inventory before cleanup approval'; end if;
  if exists(select 1 from public.pdf_asset_objects where state='reserved') then raise exception 'Resolve in-flight reservations before cleanup approval'; end if;
  update public.pdf_asset_objects set state='cleanup',updated_at=now() where object_key=asset_key and state='retained' and size_verified
    and not exists(select 1 from public.content_items where object_key=asset_key) returning id into object_id;
  if not found then raise exception 'Object is not an eligible reviewed orphan'; end if;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(acting_user,'pdf_cleanup_approved','pdf_object',object_id);
end
$$;

create function public.complete_pdf_storage_review(acting_user uuid,expected_revision bigint,confirmed_settled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare p public.pdf_storage_policy;
begin
  if not private.pdf_platform(acting_user) or confirmed_settled is distinct from true then raise exception 'Platform review and settled-write confirmation required'; end if;
  select * into p from public.pdf_storage_policy for update;
  if not p.uploads_paused or p.revision is distinct from expected_revision then raise exception 'Pause uploads and refresh the inventory before completing review'; end if;
  if exists(select 1 from public.pdf_asset_objects where state in ('reserved','uncertain') or (state<>'removed' and not size_verified)) then raise exception 'Resolve pending writes and unknown sizes before completing review'; end if;
  update public.pdf_storage_policy set uploads_paused=false,inventory_reviewed_at=now(),revision=revision+1;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(acting_user,'pdf_storage_review_completed','storage','inventory');
end
$$;

-- Extend the existing platform snapshot without changing its caller authorization.
create or replace function public.platform_usage_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare day date := (now() at time zone 'UTC')::date;
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  return jsonb_build_object('day',day,'measuredAt',now(),
    'users',(select count(*) from public.profiles),'students',(select count(*) from public.student_profiles),
    'databaseBytes',public.database_size_bytes(),
    'storageBytes',(select coalesce(sum(asset_bytes),0) from public.content_items where kind='pdf' and object_key is not null),
    'storageObjects',(select count(*) from public.content_items where kind='pdf' and object_key is not null),
    'pdfMaxBytes',(select max_pdf_bytes from public.pdf_storage_policy),
    'storageLimitBytes',(select storage_limit_bytes from public.pdf_storage_policy),
    'apiRequestsToday',(select coalesce(sum(requests),0) from public.api_platform_daily where usage_day=day),
    'aiRequestsToday',(select coalesce(sum(requests),0) from public.ai_platform_daily where usage_day=day),
    'aiTokensToday',(select coalesce(sum(input_tokens+output_tokens),0) from public.ai_usage where usage_day=day),
    'openPrivacyRequests',(select count(*) from public.privacy_requests where status <> 'fulfilled'),
    'oldestPrivacyRequestAt',(select min(created_at) from public.privacy_requests where status <> 'fulfilled')
  );
end
$$;

revoke all on function private.pdf_staff(uuid,uuid),private.pdf_platform(uuid),private.pdf_ledger_changed(),private.pdf_content_guard() from public,anon,authenticated;
revoke all on function public.approve_pdf_object_cleanup(uuid,text,bigint,boolean) from public,anon,authenticated;
grant execute on function public.approve_pdf_object_cleanup(uuid,text,bigint,boolean) to service_role;
revoke all on function public.check_pdf_upload_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.check_pdf_upload_access(uuid,uuid) to service_role;
revoke all on function public.complete_pdf_storage_review(uuid,bigint,boolean) from public,anon,authenticated;
grant execute on function public.complete_pdf_storage_review(uuid,bigint,boolean) to service_role;
revoke all on function public.pdf_storage_state(),public.reserve_pdf_upload(uuid,uuid,bigint,bigint,bigint),public.finalize_pdf_upload(uuid,uuid),public.settle_pdf_upload(uuid,uuid,boolean),public.detach_pdf_asset(uuid,uuid),public.pdf_cleanup_candidates(uuid),public.confirm_pdf_cleanup(uuid),public.pdf_asset_inventory(),public.mark_abandoned_pdf_upload(uuid,uuid,boolean),public.reconcile_pdf_asset(uuid,text,bigint,bigint,boolean) from public,anon,authenticated;
grant execute on function public.pdf_storage_state(),public.reserve_pdf_upload(uuid,uuid,bigint,bigint,bigint),public.finalize_pdf_upload(uuid,uuid),public.settle_pdf_upload(uuid,uuid,boolean),public.detach_pdf_asset(uuid,uuid),public.pdf_cleanup_candidates(uuid),public.confirm_pdf_cleanup(uuid),public.pdf_asset_inventory(),public.mark_abandoned_pdf_upload(uuid,uuid,boolean),public.reconcile_pdf_asset(uuid,text,bigint,bigint,boolean) to service_role;
commit;
