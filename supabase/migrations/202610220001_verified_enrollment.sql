-- Verified enrollment is separate from signup's unverified school label.
-- Intentionally no automatic enrollment backfill from student_profiles.school_id.
begin;

create table public.school_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  status text not null default 'active' check (status in ('active','revoked')),
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  unique(school_id,student_id)
);
create index school_enrollments_student on public.school_enrollments(student_id,school_id,status);

create table public.school_enrollment_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  email text not null check (email=lower(btrim(email)) and length(email) between 3 and 254),
  token_hash text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days',
  redeemed_at timestamptz,
  redeemed_student_id uuid references public.student_profiles(user_id) on delete set null,
  revoked_at timestamptz
);
create index school_enrollment_invites_school on public.school_enrollment_invites(school_id,email);
alter table public.school_enrollments enable row level security;
alter table public.school_enrollment_invites enable row level security;
revoke all on public.school_enrollments,public.school_enrollment_invites from public,anon,authenticated;
grant select on public.school_enrollments to authenticated;

create function private.is_school_admin(target_school uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (private.is_platform_admin() or exists (
    select 1 from public.memberships m where m.school_id=target_school
      and m.user_id=auth.uid() and m.role='school_admin'
  ))
$$;
revoke all on function private.is_school_admin(uuid) from public,anon;
grant execute on function private.is_school_admin(uuid) to authenticated;
create policy enrollments_read on public.school_enrollments for select to authenticated
using (student_id=auth.uid() or private.is_school_admin(school_id) or exists (
  select 1 from public.guardian_links gl where gl.student_id=school_enrollments.student_id and gl.parent_id=auth.uid()
));

-- A self-asserted school label must not expose a learner's records to its staff.
-- Cross-institution learning records have no tenant provenance yet: expose only
-- minimal roster information through the dedicated RPC, not their entire history.
create or replace function private.can_access_student(target_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (target_student=auth.uid() or private.is_platform_admin() or exists (
    select 1 from public.guardian_links gl where gl.student_id=target_student and gl.parent_id=auth.uid()
  ))
$$;

create or replace function private.can_read_topic(target_topic uuid,target_school uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    private.is_platform_admin() or
    (target_school is not null and private.is_staff_for(target_school)) or
    (target_school is null and exists(select 1 from public.memberships m where m.user_id=auth.uid())) or
    exists (
      select 1 from public.student_profiles sp
      join public.student_subjects ss on ss.student_id=sp.user_id
      join public.chapters c on c.subject_id=ss.subject_id
      join public.topics t on t.chapter_id=c.id
      where sp.user_id=auth.uid() and sp.approval_status='approved' and t.id=target_topic
        and (target_school is null or exists (
          select 1 from public.school_enrollments e join public.schools sch on sch.id=e.school_id
          where e.student_id=sp.user_id and e.school_id=target_school and e.status='active' and sch.active
        ))
    )
  )
$$;

create function public.create_enrollment_invite(target_school uuid,student_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare code text; invite_id uuid; expiry timestamptz; normalized_email text:=lower(btrim(student_email));
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  perform 1 from public.schools where id=target_school and active for update;
  if not found then raise exception 'School unavailable'; end if;
  if (select count(*) from public.school_enrollment_invites where school_id=target_school and created_at>now()-interval '1 day')>=500 then
    raise exception 'Daily school invitation limit reached';
  end if;
  if normalized_email is null or length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid student account email';
  end if;
  update public.school_enrollment_invites set revoked_at=now()
    where school_id=target_school and email=normalized_email and redeemed_at is null and revoked_at is null;
  code:=gen_random_uuid()::text||gen_random_uuid()::text;
  insert into public.school_enrollment_invites(school_id,email,token_hash,created_by)
    values(target_school,normalized_email,encode(sha256(convert_to(code,'UTF8')),'hex'),auth.uid())
    returning id,expires_at into invite_id,expiry;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'enrollment_invited','enrollment_invite',invite_id);
  return jsonb_build_object('id',invite_id,'code',code,'expiresAt',expiry);
end
$$;

create function public.accept_enrollment_invite(invite_code text,target_student uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare invitation public.school_enrollment_invites; student_email text; enrollment_id uuid; institution_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to accept an invitation'; end if;
  if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
    raise exception 'Verify your account email first';
  end if;
  if target_student=auth.uid() then
    if private.current_role()<>'student' then raise exception 'Student account required'; end if;
    if exists(select 1 from public.student_profiles sp join public.grades g on g.id=sp.grade_id where sp.user_id=target_student and g.number<=5) then
      raise exception 'Ask your guardian to accept this invitation';
    end if;
  elsif not (private.current_role()='parent' and exists (
    select 1 from public.guardian_links gl where gl.parent_id=auth.uid() and gl.student_id=target_student and gl.status='approved'
  )) then raise exception 'Choose your own account or an approved linked child';
  end if;
  if not exists(select 1 from public.student_profiles where user_id=target_student and approval_status='approved') then
    raise exception 'Student access is paused';
  end if;
  if invite_code is null or length(btrim(invite_code))<>72 then raise exception 'Invitation unavailable or expired'; end if;
  select * into invitation from public.school_enrollment_invites
    where token_hash=encode(sha256(convert_to(btrim(invite_code),'UTF8')),'hex');
  if not found then raise exception 'Invitation unavailable or expired'; end if;
  -- Consistent school-first lock order serializes issue/accept/revoke operations.
  select name into institution_name from public.schools where id=invitation.school_id and active for update;
  if not found then raise exception 'School unavailable'; end if;
  select * into invitation from public.school_enrollment_invites where id=invitation.id for update;
  if invitation.revoked_at is not null or invitation.redeemed_at is not null or invitation.expires_at<=now() then
    raise exception 'Invitation unavailable or expired';
  end if;
  select lower(btrim(email)) into student_email from auth.users where id=target_student;
  if student_email is distinct from invitation.email then raise exception 'Invitation does not match the student account email'; end if;
  insert into public.school_enrollments(school_id,student_id,updated_by)
    values(invitation.school_id,target_student,auth.uid())
    on conflict(school_id,student_id) do update set status='active',accepted_at=now(),revoked_at=null,updated_by=auth.uid()
    returning id into enrollment_id;
  update public.school_enrollment_invites set redeemed_at=now(),redeemed_student_id=target_student where id=invitation.id;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),invitation.school_id,'enrollment_accepted','school_enrollment',enrollment_id);
  return jsonb_build_object('schoolId',invitation.school_id,'schoolName',institution_name);
end
$$;

create function public.revoke_school_enrollment(target_school uuid,target_student uuid)
returns void language plpgsql security definer set search_path='' as $$
declare enrollment_id uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  perform 1 from public.schools where id=target_school for update;
  update public.school_enrollments set status='revoked',revoked_at=now(),updated_by=auth.uid()
    where school_id=target_school and student_id=target_student and status='active' returning id into enrollment_id;
  if not found then raise exception 'Active enrollment not found'; end if;
  update public.school_enrollment_invites set revoked_at=now()
    where school_id=target_school and email=(select lower(btrim(email)) from auth.users where id=target_student)
      and redeemed_at is null and revoked_at is null;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'enrollment_revoked','school_enrollment',enrollment_id);
end
$$;

create function public.cancel_enrollment_invite(target_school uuid,invite_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  perform 1 from public.schools where id=target_school for update;
  update public.school_enrollment_invites set revoked_at=now()
    where id=invite_id and school_id=target_school and redeemed_at is null and revoked_at is null;
  if not found then raise exception 'Open invitation not found'; end if;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'enrollment_invite_cancelled','enrollment_invite',invite_id);
end
$$;

create function public.revoke_school_staff(target_school uuid,target_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare membership_role public.account_role; membership_id uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  if target_user=auth.uid() then raise exception 'Ask another administrator to remove your staff access'; end if;
  perform 1 from public.schools where id=target_school for update;
  select id,role into membership_id,membership_role from public.memberships where school_id=target_school and user_id=target_user for update;
  if not found then raise exception 'Staff membership not found'; end if;
  if membership_role='school_admin' and not private.is_platform_admin() and
    (select count(*) from public.memberships where school_id=target_school and role='school_admin')<=1 then
    raise exception 'A school administrator must remain';
  end if;
  delete from public.memberships where id=membership_id;
  -- Keep the account/profile role and other school memberships unchanged.
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'staff_access_revoked','user',target_user);
end
$$;

create function public.school_enrollment_roster(target_school uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  return jsonb_build_object(
    'enrollments',coalesce((select jsonb_agg(row_to_json(r)) from (
      select e.id,e.student_id,p.full_name,e.status,e.accepted_at,e.revoked_at,g.number as grade_number,b.name as board_name
      from public.school_enrollments e join public.profiles p on p.id=e.student_id
      join public.student_profiles sp on sp.user_id=e.student_id
      join public.grades g on g.id=sp.grade_id join public.boards b on b.id=sp.board_id
      where e.school_id=target_school order by e.accepted_at desc,e.id limit 200
    ) r),'[]'::jsonb),
    'invitations',coalesce((select jsonb_agg(row_to_json(r)) from (
      select i.id,i.email,i.created_at,i.expires_at from public.school_enrollment_invites i
      where i.school_id=target_school and i.redeemed_at is null and i.revoked_at is null and i.expires_at>now()
      order by i.created_at desc,i.id limit 200
    ) r),'[]'::jsonb),
    'staff',coalesce((select jsonb_agg(row_to_json(r)) from (
      select m.id,m.user_id,m.role,p.full_name from public.memberships m join public.profiles p on p.id=m.user_id
      where m.school_id=target_school order by m.created_at,m.id limit 200
    ) r),'[]'::jsonb)
  );
end
$$;

create function public.add_existing_school_staff(target_school uuid,staff_email text,staff_role text)
returns void language plpgsql security definer set search_path='' as $$
declare target_user uuid; membership_id uuid;
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  if staff_role is null or staff_role not in ('editor','school_admin') then raise exception 'Invalid staff role'; end if;
  perform 1 from public.schools where id=target_school and active for update;
  if not found then raise exception 'School unavailable'; end if;
  select p.id into target_user from public.profiles p join auth.users u on u.id=p.id
    where lower(btrim(u.email))=lower(btrim(staff_email)) and u.email_confirmed_at is not null and p.role in ('editor','school_admin');
  if not found then raise exception 'No verified staff account matches this email; use the staff invitation flow for a new staff account'; end if;
  if target_user=auth.uid() then raise exception 'Ask another administrator to change your staff access'; end if;
  if exists(select 1 from public.memberships where school_id=target_school and user_id=target_user) then
    raise exception 'This staff member already has access';
  end if;
  insert into public.memberships(user_id,school_id,role) values(target_user,target_school,staff_role::public.account_role) returning id into membership_id;
  if staff_role='school_admin' then update public.profiles set role='school_admin' where id=target_user and role='editor'; end if;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'existing_staff_added','membership',membership_id);
end
$$;

create function public.my_school_enrollments() returns table(student_id uuid,school_name text,status text,accepted_at timestamptz)
language sql stable security definer set search_path='' as $$
  select e.student_id,s.name,e.status,e.accepted_at from public.school_enrollments e
  join public.schools s on s.id=e.school_id
  where e.student_id=auth.uid() or exists(select 1 from public.guardian_links gl where gl.parent_id=auth.uid() and gl.student_id=e.student_id)
  order by e.accepted_at desc
$$;

-- Only verified active learners count. Quiz activity is scoped to this school's
-- quizzes; topic counts cover its published topics, not the student's whole history.
create or replace function public.school_learning_summary(target_school uuid)
returns table(students bigint,published_content bigint,completed_topics bigint,quiz_attempts bigint)
language sql stable security definer set search_path='' as $$
  select
    (select count(*) from public.school_enrollments e join public.student_profiles sp on sp.user_id=e.student_id where e.school_id=target_school and e.status='active' and sp.approval_status='approved'),
    (select count(*) from public.content_items ci where ci.school_id=target_school and ci.status='published'),
    (select count(*) from public.topic_progress tp join public.school_enrollments e on e.student_id=tp.student_id where e.school_id=target_school and e.status='active' and exists(select 1 from public.content_items ci where ci.school_id=target_school and ci.status='published' and ci.topic_id=tp.topic_id)),
    (select count(*) from public.quiz_attempts qa join public.quizzes q on q.id=qa.quiz_id join public.school_enrollments e on e.student_id=qa.student_id where q.school_id=target_school and e.school_id=target_school and e.status='active')
  where target_school is not null and private.is_school_admin(target_school)
$$;

revoke all on function public.create_enrollment_invite(uuid,text),public.accept_enrollment_invite(text,uuid),public.revoke_school_enrollment(uuid,uuid),public.cancel_enrollment_invite(uuid,uuid),public.revoke_school_staff(uuid,uuid),public.add_existing_school_staff(uuid,text,text),public.school_enrollment_roster(uuid),public.my_school_enrollments() from public,anon;
grant execute on function public.create_enrollment_invite(uuid,text),public.accept_enrollment_invite(text,uuid),public.revoke_school_enrollment(uuid,uuid),public.cancel_enrollment_invite(uuid,uuid),public.revoke_school_staff(uuid,uuid),public.add_existing_school_staff(uuid,text,text),public.school_enrollment_roster(uuid),public.my_school_enrollments() to authenticated;

commit;
