-- Consent changes, learning status and audit history commit together.
begin;

alter table public.student_profiles add column consent_version integer not null default 1 check(consent_version>0);

create or replace view public.parent_children_overview with (security_invoker=true) as
select gl.parent_id, gl.student_id, p.full_name as name, sp.approval_status,
       s.name as school_name, b.name as board_name, g.number as grade_number,
       (select count(*) from public.topic_progress tp where tp.student_id=gl.student_id)::integer as completed,
       (select count(*) from public.quiz_attempts qa where qa.student_id=gl.student_id)::integer as quizzes,
       sp.consent_version
from public.guardian_links gl join public.student_profiles sp on sp.user_id=gl.student_id
join public.profiles p on p.id=gl.student_id join public.schools s on s.id=sp.school_id
join public.boards b on b.id=sp.board_id join public.grades g on g.id=sp.grade_id
where gl.parent_id=(select auth.uid());

-- Fail closed for older Worker code that attempts separate service-role writes.
-- Inserts for existing signup/provisioning flows remain unchanged. Trusted table
-- owner maintenance and the security-definer transaction can update these fields.
create function private.guard_consent_update() returns trigger
language plpgsql set search_path='' as $$
declare changed boolean;
begin
  if tg_table_name='student_profiles' then
    changed:=new.approval_status is distinct from old.approval_status
      or new.approved_at is distinct from old.approved_at
      or new.consent_version is distinct from old.consent_version;
  else
    changed:=new.status is distinct from old.status or new.consented_at is distinct from old.consented_at;
  end if;
  if changed and current_user<>(select pg_catalog.pg_get_userbyid(c.relowner) from pg_catalog.pg_class c where c.oid=tg_relid) then
    raise exception 'Use the atomic guardian consent operation';
  end if;
  return new;
end
$$;
create trigger student_consent_update_guard before update on public.student_profiles
for each row execute function private.guard_consent_update();
create trigger guardian_consent_update_guard before update on public.guardian_links
for each row execute function private.guard_consent_update();

create function public.change_guardian_consent(target_student uuid,new_status text,expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare learner public.student_profiles; guardian public.guardian_links; changed_at timestamptz;
begin
  if private.current_role() is distinct from 'parent' or not exists(
    select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null
  ) then raise exception 'Verified parent account required'; end if;
  if new_status is null or new_status not in ('approved','withdrawn') then raise exception 'Invalid consent status'; end if;
  if expected_version is null or expected_version<1 then raise exception 'Reload My children before changing approval'; end if;
  -- Check the relationship before acquiring a lock on a possibly unrelated child.
  if not exists(select 1 from public.guardian_links where parent_id=auth.uid() and student_id=target_student) then
    raise exception 'Student is not linked to this parent';
  end if;
  -- All guardians for this student serialize on the same student row, then their
  -- link. Recheck relationship, stage and version while holding those locks.
  select * into learner from public.student_profiles where user_id=target_student for update;
  if not found then raise exception 'Linked student unavailable'; end if;
  select * into guardian from public.guardian_links where parent_id=auth.uid() and student_id=target_student for update;
  if not found then raise exception 'Student is not linked to this parent'; end if;
  if not exists(select 1 from public.profiles where id=target_student and role='student')
    or not exists(select 1 from public.grades where id=learner.grade_id and number between 1 and 5) then
    raise exception 'Guardian approval changes are available only for Standards 1-5';
  end if;
  if learner.consent_version<>expected_version then raise exception 'Approval changed; reload My children and try again'; end if;
  if learner.approval_status::text=new_status and guardian.status::text=new_status
    and ((new_status='withdrawn' and learner.approved_at is null and guardian.consented_at is null)
      or (new_status='approved' and learner.approved_at is not null and guardian.consented_at is not null)) then
    return jsonb_build_object('status',new_status,'consentVersion',learner.consent_version,'changed',false);
  end if;
  changed_at:=clock_timestamp();
  update public.guardian_links set status=new_status::public.approval_state,
    consented_at=case when new_status='approved' then changed_at else null end
    where parent_id=auth.uid() and student_id=target_student;
  update public.student_profiles set approval_status=new_status::public.approval_state,
    approved_at=case when new_status='approved' then changed_at else null end,
    consent_version=consent_version+1 where user_id=target_student
    returning * into learner;
  insert into public.audit_events(actor_id,action,target_type,target_id)
    values(auth.uid(),'consent_'||new_status,'student',target_student);
  return jsonb_build_object('status',new_status,'consentVersion',learner.consent_version,'changed',true);
end
$$;

revoke all on function private.guard_consent_update() from public,anon,authenticated,service_role;
revoke all on function public.change_guardian_consent(uuid,text,integer) from public,anon,service_role;
grant execute on function public.change_guardian_consent(uuid,text,integer) to authenticated;
commit;
