-- Account privacy requests and aggregate operational visibility. No automatic account deletion.
begin;
alter table public.privacy_requests add column requested_by uuid references public.profiles(id) on delete set null;
alter table public.privacy_requests add column reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.privacy_requests add column reviewed_at timestamptz;
update public.privacy_requests set requested_by=user_id;
create index privacy_requests_open_subject on public.privacy_requests(user_id,kind,created_at) where status <> 'fulfilled';
drop policy privacy_requests_read on public.privacy_requests;
create policy privacy_requests_read on public.privacy_requests for select to authenticated
using(user_id=auth.uid() or requested_by=auth.uid() or private.is_platform_admin());

create function private.can_request_privacy(target_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
  and (
    (target_user=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and (
      p.role <> 'student' or exists(select 1 from public.student_profiles sp join public.grades g on g.id=sp.grade_id where sp.user_id=p.id and g.number between 6 and 10)
    ))) or exists (
      select 1 from public.guardian_links gl join public.profiles p on p.id=gl.parent_id and p.role='parent'
      join public.student_profiles sp on sp.user_id=gl.student_id join public.grades g on g.id=sp.grade_id
      where gl.parent_id=auth.uid() and gl.student_id=target_user and g.number between 1 and 5
    )
  )
$$;

create function public.account_privacy_overview() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'can_request_self',private.can_request_privacy(auth.uid()),
    'children',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'grade',g.number) order by p.full_name,p.id)
      from public.guardian_links gl join public.profiles p on p.id=gl.student_id
      join public.student_profiles sp on sp.user_id=p.id join public.grades g on g.id=sp.grade_id
      where gl.parent_id=auth.uid() and private.can_request_privacy(p.id)),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id) from (
      select pr.id,pr.user_id,p.full_name as subject_name,pr.kind,pr.status,pr.created_at,pr.reviewed_at
      from public.privacy_requests pr join public.profiles p on p.id=pr.user_id
      where pr.user_id=auth.uid() or pr.requested_by=auth.uid()
      order by pr.created_at desc,pr.id limit 100
    ) r),'[]'::jsonb)
  ) where auth.uid() is not null
$$;

create function public.request_account_privacy(request_kind text,target_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare subject_id uuid := coalesce(target_user,auth.uid()); saved public.privacy_requests;
begin
  if not private.can_request_privacy(subject_id) then raise exception 'Verified account holder or linked guardian required'; end if;
  if request_kind is null or request_kind not in ('export','delete') then raise exception 'Invalid privacy request kind'; end if;
  perform 1 from public.profiles where id=subject_id for update;
  -- Share an existing open request for the same subject/kind, but never reveal
  -- another guardian's request ID to the caller: record their request separately.
  select * into saved from public.privacy_requests where user_id=subject_id and kind=request_kind
    and status <> 'fulfilled' and requested_by=auth.uid() order by created_at,id limit 1;
  if found then return jsonb_build_object('id',saved.id,'status',saved.status,'existing',true); end if;
  insert into public.privacy_requests(user_id,requested_by,kind) values(subject_id,auth.uid(),request_kind) returning * into saved;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(auth.uid(),'privacy_requested','privacy_request',saved.id);
  return jsonb_build_object('id',saved.id,'status',saved.status,'existing',false);
end
$$;

create function public.review_account_privacy(request_id uuid,new_status text,export_delivered boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare saved public.privacy_requests;
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  select * into saved from public.privacy_requests where id=request_id for update;
  if not found or saved.status='fulfilled' then raise exception 'Open privacy request not found'; end if;
  if new_status is null or new_status not in ('in_review','fulfilled') then raise exception 'Invalid request status'; end if;
  if new_status='fulfilled' and (saved.kind <> 'export' or saved.status <> 'in_review' or export_delivered is distinct from true) then
    raise exception 'Only an in-review export confirmed as delivered can be fulfilled';
  end if;
  update public.privacy_requests set status=new_status,reviewed_by=auth.uid(),reviewed_at=now() where id=request_id;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(auth.uid(),'privacy_'||saved.kind||'_'||new_status,'privacy_request',request_id);
end
$$;

-- Retain institution material/audit events when an operator deletes an account.
-- Snapshot JSON and audit target text can still contain identifiers; policy review is required.
alter table public.content_items drop constraint content_items_author_id_fkey,
  add constraint content_items_author_id_fkey foreign key(author_id) references public.profiles(id) on delete set null;
alter table public.content_revisions drop constraint content_revisions_changed_by_fkey,
  add constraint content_revisions_changed_by_fkey foreign key(changed_by) references public.profiles(id) on delete set null;
alter table public.audit_events drop constraint audit_events_actor_id_fkey,
  add constraint audit_events_actor_id_fkey foreign key(actor_id) references public.profiles(id) on delete set null;
alter table public.school_requests drop constraint school_requests_reviewed_by_fkey,
  add constraint school_requests_reviewed_by_fkey foreign key(reviewed_by) references public.profiles(id) on delete set null;

create function private.guard_guardian_deletion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.guardian_links where parent_id=old.id) then
    raise exception 'Resolve linked child accounts before deleting this guardian';
  end if;
  return old;
end
$$;
create trigger guardian_deletion_guard before delete on public.profiles for each row execute function private.guard_guardian_deletion();

create function public.account_deletion_preflight(target_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  if not exists(select 1 from public.profiles where id=target_user) then raise exception 'Account unavailable'; end if;
  select jsonb_build_object(
    'linkedChildren',(select count(*) from public.guardian_links where parent_id=target_user),
    'staffMemberships',(select count(*) from public.memberships where user_id=target_user),
    'authoredItems',(select count(*) from public.content_items where author_id=target_user),
    'revisionAttributions',(select count(*) from public.content_revisions where changed_by=target_user),
    'auditAttributions',(select count(*) from public.audit_events where actor_id=target_user),
    'matchingInvitations',(select count(*) from public.school_enrollment_invites i join auth.users u on lower(btrim(u.email))=i.email where u.id=target_user),
    'personalAttempts',(select count(*) from public.quiz_attempts where student_id=target_user)
  ) into result;
  return result;
end
$$;

create function public.institution_usage(target_school uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  return jsonb_build_object('schoolId',target_school,'measuredAt',now(),
    'activeStudents',(select count(*) from public.school_enrollments e join public.student_profiles sp on sp.user_id=e.student_id where e.school_id=target_school and e.status='active' and sp.approval_status='approved'),
    'staff',(select count(*) from public.memberships where school_id=target_school),
    'publishedMaterials',(select count(*) from public.content_items where school_id=target_school and status='published'),
    'draftMaterials',(select count(*) from public.content_items where school_id=target_school and status='draft'),
    'publishedQuizzes',(select count(*) from public.quizzes where school_id=target_school and status='published'),
    'publishedFlashcards',(select count(*) from public.flashcards where school_id=target_school and status='published'),
    'trackedPdfBytes',(select coalesce(sum(asset_bytes),0) from public.content_items where school_id=target_school and kind='pdf' and object_key is not null)
  );
end
$$;

create function public.platform_usage_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare day date := (now() at time zone 'UTC')::date;
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  return jsonb_build_object('day',day,'measuredAt',now(),
    'users',(select count(*) from public.profiles),'students',(select count(*) from public.student_profiles),
    'databaseBytes',public.database_size_bytes(),
    'storageBytes',(select coalesce(sum(asset_bytes),0) from public.content_items where kind='pdf' and object_key is not null),
    'storageObjects',(select count(*) from public.content_items where kind='pdf' and object_key is not null),
    'apiRequestsToday',(select coalesce(sum(requests),0) from public.api_platform_daily where usage_day=day),
    'aiRequestsToday',(select coalesce(sum(requests),0) from public.ai_platform_daily where usage_day=day),
    'aiTokensToday',(select coalesce(sum(input_tokens+output_tokens),0) from public.ai_usage where usage_day=day),
    'openPrivacyRequests',(select count(*) from public.privacy_requests where status <> 'fulfilled'),
    'oldestPrivacyRequestAt',(select min(created_at) from public.privacy_requests where status <> 'fulfilled')
  );
end
$$;

revoke all on function private.can_request_privacy(uuid),private.guard_guardian_deletion() from public,anon,authenticated;
revoke all on function public.account_privacy_overview(),public.request_account_privacy(text,uuid),public.review_account_privacy(uuid,text,boolean),public.account_deletion_preflight(uuid),public.institution_usage(uuid),public.platform_usage_snapshot() from public,anon;
grant execute on function public.account_privacy_overview(),public.request_account_privacy(text,uuid),public.review_account_privacy(uuid,text,boolean),public.account_deletion_preflight(uuid),public.institution_usage(uuid),public.platform_usage_snapshot() to authenticated;
commit;
