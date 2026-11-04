-- StudySphere AI initial schema. Apply to a fresh Supabase project.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.account_role as enum ('parent','student','editor','school_admin','platform_admin');
create type public.approval_state as enum ('pending','approved','withdrawn');
create type public.content_kind as enum ('lesson','note','example','problem','pdf','video');
create type public.publication_state as enum ('draft','published');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.account_role not null default 'parent',
  created_at timestamptz not null default now(),
  constraint full_name_length check (length(full_name) <= 120)
);
create table public.schools (
  id uuid primary key default gen_random_uuid(), name text not null, city text, state text,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.school_requests (
  id uuid primary key default gen_random_uuid(), parent_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null check(length(school_name) between 3 and 160), city text, state text,
  status text not null default 'pending' check(status in ('pending','approved','declined')),
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create unique index school_requests_one_pending on public.school_requests(parent_id,lower(school_name)) where status='pending';
create table public.memberships (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  role public.account_role not null check (role in ('editor','school_admin')),
  created_at timestamptz not null default now(), unique(user_id,school_id)
);
create table public.boards (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null);
create table public.grades (id uuid primary key default gen_random_uuid(), number integer not null unique check (number between 1 and 10));
create table public.subjects (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.boards(id),
  grade_id uuid not null references public.grades(id), name text not null, position integer not null default 0,
  unique(board_id,grade_id,name)
);
create table public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id), board_id uuid not null references public.boards(id),
  grade_id uuid not null references public.grades(id), approval_status public.approval_state not null default 'pending',
  approved_at timestamptz, created_at timestamptz not null default now()
);
create table public.student_subjects (
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key(student_id,subject_id)
);
create table public.guardian_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  status public.approval_state not null default 'pending', consented_at timestamptz,
  created_at timestamptz not null default now(), primary key(parent_id,student_id)
);
create table public.chapters (
  id uuid primary key default gen_random_uuid(), subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null, position integer not null default 0
);
create table public.topics (
  id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null, position integer not null default 0
);
create table public.content_items (
  id uuid primary key default gen_random_uuid(), topic_id uuid not null references public.topics(id) on delete cascade,
  school_id uuid references public.schools(id), kind public.content_kind not null, title text not null,
  body_md text, answer_md text, hints jsonb not null default '[]'::jsonb, video_id text, attribution text,
  language text not null default 'en' check(language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'), object_key text,
  pdf_text text, status public.publication_state not null default 'draft', position integer not null default 0,
  version integer not null default 1, author_id uuid references public.profiles(id), updated_at timestamptz not null default now(),
  constraint video_id_format check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$')
);
create table public.content_revisions (
  id bigint generated always as identity primary key, content_id uuid not null references public.content_items(id) on delete cascade,
  snapshot jsonb not null, changed_by uuid references public.profiles(id), changed_at timestamptz not null default now()
);
create table public.flashcards (
  id uuid primary key default gen_random_uuid(), topic_id uuid not null references public.topics(id) on delete cascade,
  school_id uuid references public.schools(id), front text not null, back text not null, position integer not null default 0,
  status public.publication_state not null default 'draft'
);
create table public.flashcard_reviews (
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  rating integer not null check(rating between 1 and 4), due_at timestamptz not null,
  reviewed_at timestamptz not null default now(), primary key(student_id,flashcard_id)
);
create table public.quizzes (
  id uuid primary key default gen_random_uuid(), topic_id uuid not null references public.topics(id) on delete cascade,
  school_id uuid references public.schools(id), title text not null,
  status public.publication_state not null default 'draft'
);
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(), quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null, options jsonb not null, correct_index integer not null check(correct_index between 0 and 9),
  explanation text not null default '', position integer not null default 0,
  constraint options_array check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 10)
);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id), answers jsonb not null, score integer not null,
  created_at timestamptz not null default now()
);
create table public.topic_progress (
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  completed_at timestamptz not null default now(), primary key(student_id,topic_id)
);
create table public.plan_items (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  subject_id uuid references public.subjects(id), title text not null check(length(title) between 1 and 150),
  due_date date not null, completed_at timestamptz, created_at timestamptz not null default now()
);
create table public.mind_maps (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  topic_id uuid references public.topics(id), graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  updated_at timestamptz not null default now(), unique nulls not distinct(student_id,topic_id)
);
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  topic_id uuid references public.topics(id), created_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check(role in ('user','assistant')), content text not null,
  citations jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table public.ai_usage (
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  usage_day date not null, requests integer not null default 0, input_tokens integer not null default 0,
  output_tokens integer not null default 0, primary key(student_id,usage_day)
);
create table public.ai_platform_daily (
  usage_day date primary key, requests integer not null default 0
);
create table public.ai_school_daily (
  school_id uuid not null references public.schools(id) on delete cascade,
  usage_day date not null, requests integer not null default 0, primary key(school_id,usage_day)
);
create table public.api_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_day date not null, requests integer not null default 0, primary key(user_id,usage_day)
);
create table public.api_platform_daily (
  usage_day date primary key, requests integer not null default 0
);
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('export','delete')), status text not null default 'pending' check(status in ('pending','in_review','fulfilled')),
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  school_id uuid references public.schools(id), action text not null, target_type text not null,
  target_id text not null, created_at timestamptz not null default now()
);

create index on public.memberships(school_id,user_id);
create index on public.student_profiles(school_id,approval_status);
create index on public.student_subjects(subject_id,student_id);
create index on public.chapters(subject_id,position);
create index on public.topics(chapter_id,position);
create index on public.content_items(topic_id,status,school_id,position);
create index on public.content_items using gin(to_tsvector('english', coalesce(title,'')||' '||coalesce(body_md,'')||' '||coalesce(pdf_text,'')));
create index on public.plan_items(student_id,due_date);
create index on public.quiz_attempts(student_id,created_at);

create function private.current_role() returns public.account_role language sql stable security definer set search_path='' as $$
  select role from public.profiles where id=(select auth.uid())
$$;
create function private.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and coalesce((select private.current_role())='platform_admin',false)
$$;
create function private.is_staff_for(target_school uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (private.is_platform_admin() or exists(
    select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.school_id=target_school
  ))
$$;
create function private.can_edit_school(target_school uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (private.is_platform_admin() or (target_school is not null and exists(
    select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.school_id=target_school and m.role in ('editor','school_admin')
  )))
$$;
create function private.can_access_student(target_student uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (
    target_student=(select auth.uid()) or private.is_platform_admin() or
    exists(select 1 from public.guardian_links gl where gl.student_id=target_student and gl.parent_id=(select auth.uid())) or
    exists(select 1 from public.student_profiles sp join public.memberships m on m.school_id=sp.school_id where sp.user_id=target_student and m.user_id=(select auth.uid()) and m.role='school_admin')
  )
$$;
create function private.can_read_topic(target_topic uuid, target_school uuid) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and (
    private.is_platform_admin() or
    (target_school is not null and private.is_staff_for(target_school)) or
    (target_school is null and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()))) or
    exists(
      select 1 from public.student_profiles sp
      join public.student_subjects ss on ss.student_id=sp.user_id
      join public.subjects s on s.id=ss.subject_id
      join public.chapters c on c.subject_id=s.id
      join public.topics t on t.chapter_id=c.id
      where sp.user_id=(select auth.uid()) and sp.approval_status='approved'
        and t.id=target_topic and (target_school is null or target_school=sp.school_id)
    )
  )
$$;
revoke all on all functions in schema private from public;
grant execute on function private.current_role(), private.is_platform_admin(), private.is_staff_for(uuid), private.can_edit_school(uuid), private.can_access_student(uuid), private.can_read_topic(uuid,uuid) to authenticated;

create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare
  chosen_school uuid;
  chosen_board uuid;
  chosen_grade uuid;
  grade_number integer;
  requested_subjects integer;
  valid_subjects integer;
begin
  if coalesce(new.raw_user_meta_data->>'account_type','parent')='student' then
    chosen_school := (new.raw_user_meta_data->>'school_id')::uuid;
    chosen_board := (new.raw_user_meta_data->>'board_id')::uuid;
    chosen_grade := (new.raw_user_meta_data->>'grade_id')::uuid;

    select g.number into grade_number from public.grades g where g.id=chosen_grade;
    if grade_number is null or grade_number < 6 or grade_number > 10 then
      raise exception 'Independent student registration is available only for Standards 6-10';
    end if;
    if not exists(select 1 from public.schools s where s.id=chosen_school and s.active) then
      raise exception 'Choose an active school';
    end if;
    if not exists(select 1 from public.boards b where b.id=chosen_board) then
      raise exception 'Choose a valid board';
    end if;
    if jsonb_typeof(new.raw_user_meta_data->'subject_ids') is distinct from 'array' then
      raise exception 'Choose at least one subject';
    end if;

    requested_subjects := jsonb_array_length(new.raw_user_meta_data->'subject_ids');
    select count(distinct s.id) into valid_subjects
    from public.subjects s
    where s.board_id=chosen_board and s.grade_id=chosen_grade
      and s.id in (select value::uuid from jsonb_array_elements_text(new.raw_user_meta_data->'subject_ids'));
    if requested_subjects < 1 or requested_subjects > 15 or valid_subjects <> requested_subjects then
      raise exception 'Choose valid subjects for the selected board and standard';
    end if;

    insert into public.profiles(id,full_name,role)
    values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120),'student');
    insert into public.student_profiles(user_id,school_id,board_id,grade_id,approval_status,approved_at)
    values(new.id,chosen_school,chosen_board,chosen_grade,'approved',now());
    insert into public.student_subjects(student_id,subject_id)
    select new.id,s.id from public.subjects s
    where s.board_id=chosen_board and s.grade_id=chosen_grade
      and s.id in (select value::uuid from jsonb_array_elements_text(new.raw_user_meta_data->'subject_ids'));
  else
    insert into public.profiles(id,full_name,role)
    values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120),'parent');
  end if;
  return new;
end
$$;
revoke all on function private.create_profile() from public;
create trigger auth_user_profile after insert on auth.users for each row execute function private.create_profile();

create function private.record_content_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.content_revisions(content_id,snapshot,changed_by) values(old.id,to_jsonb(old),(select auth.uid()));
  new.version:=old.version+1; new.updated_at:=now();
  return new;
end
$$;
revoke all on function private.record_content_revision() from public;
create trigger content_revision before update on public.content_items for each row execute function private.record_content_revision();

-- Data API grants and RLS. Secret/service roles retain their native access.
do $$ declare t text; begin
  foreach t in array array['profiles','schools','school_requests','memberships','boards','grades','subjects','student_profiles','student_subjects','guardian_links','chapters','topics','content_items','content_revisions','flashcards','flashcard_reviews','quizzes','quiz_questions','quiz_attempts','topic_progress','plan_items','mind_maps','ai_conversations','ai_messages','ai_usage','ai_platform_daily','ai_school_daily','api_usage','api_platform_daily','privacy_requests','audit_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;
grant select on public.profiles,public.schools,public.school_requests,public.memberships,public.boards,public.grades,public.subjects,public.student_profiles,public.student_subjects,public.guardian_links,public.chapters,public.topics,public.content_items,public.content_revisions,public.flashcards,public.flashcard_reviews,public.quizzes,public.quiz_attempts,public.topic_progress,public.plan_items,public.mind_maps,public.ai_conversations,public.ai_messages,public.ai_usage,public.privacy_requests to authenticated;
grant select on public.schools,public.boards,public.grades,public.subjects to anon;
grant update(full_name) on public.profiles to authenticated;
grant insert,update on public.plan_items,public.mind_maps,public.flashcard_reviews,public.topic_progress to authenticated;
grant insert(id,topic_id,school_id,kind,title,body_md,answer_md,hints,video_id,attribution,language,pdf_text,status,position,author_id) on public.content_items to authenticated;
grant update(topic_id,school_id,kind,title,body_md,answer_md,hints,video_id,attribution,language,pdf_text,status,position,author_id) on public.content_items to authenticated;
grant delete on public.plan_items,public.mind_maps to authenticated;
grant select(id,quiz_id,prompt,options,position) on public.quiz_questions to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (
  id=(select auth.uid()) or private.can_access_student(id) or private.is_platform_admin()
);
create policy profiles_update_name on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy schools_read on public.schools for select to authenticated using(active or private.is_platform_admin() or private.is_staff_for(id));
create policy schools_public_catalog on public.schools for select to anon using(active);
create policy school_requests_read on public.school_requests for select to authenticated using(parent_id=(select auth.uid()) or private.is_platform_admin());
create policy memberships_read on public.memberships for select to authenticated using(user_id=(select auth.uid()) or private.is_staff_for(school_id));
create policy boards_read on public.boards for select to anon, authenticated using(true);
create policy grades_read on public.grades for select to anon, authenticated using(true);
create policy subjects_read on public.subjects for select to anon, authenticated using(true);
create policy chapters_read on public.chapters for select to authenticated using(true);
create policy topics_read on public.topics for select to authenticated using(true);
create policy student_profiles_read on public.student_profiles for select to authenticated using(private.can_access_student(user_id));
create policy student_subjects_read on public.student_subjects for select to authenticated using(private.can_access_student(student_id));
create policy guardian_links_read on public.guardian_links for select to authenticated using(parent_id=(select auth.uid()) or student_id=(select auth.uid()));
create policy content_read on public.content_items for select to authenticated using(
  (status='published' and private.can_read_topic(topic_id,school_id)) or private.can_edit_school(school_id)
);
create policy content_insert on public.content_items for insert to authenticated with check(private.can_edit_school(school_id) and author_id=(select auth.uid()));
create policy content_update on public.content_items for update to authenticated using(private.can_edit_school(school_id)) with check(private.can_edit_school(school_id) and author_id=(select auth.uid()));
create policy revisions_read on public.content_revisions for select to authenticated using(exists(select 1 from public.content_items c where c.id=content_id and private.can_edit_school(c.school_id)));
create policy flashcards_read on public.flashcards for select to authenticated using((status='published' and private.can_read_topic(topic_id,school_id)) or private.can_edit_school(school_id));
create policy reviews_read on public.flashcard_reviews for select to authenticated using(private.can_access_student(student_id));
create policy reviews_insert on public.flashcard_reviews for insert to authenticated with check(student_id=(select auth.uid()) and exists(select 1 from public.flashcards f where f.id=flashcard_id and f.status='published' and private.can_read_topic(f.topic_id,f.school_id)));
create policy reviews_update on public.flashcard_reviews for update to authenticated using(student_id=(select auth.uid())) with check(student_id=(select auth.uid()) and exists(select 1 from public.flashcards f where f.id=flashcard_id and f.status='published' and private.can_read_topic(f.topic_id,f.school_id)));
create policy quizzes_read on public.quizzes for select to authenticated using((status='published' and private.can_read_topic(topic_id,school_id)) or private.can_edit_school(school_id));
create policy questions_read on public.quiz_questions for select to authenticated using(exists(select 1 from public.quizzes q where q.id=quiz_id and q.status='published' and private.can_read_topic(q.topic_id,q.school_id)));
create policy attempts_read on public.quiz_attempts for select to authenticated using(private.can_access_student(student_id));
create policy progress_read on public.topic_progress for select to authenticated using(private.can_access_student(student_id));
create policy progress_insert on public.topic_progress for insert to authenticated with check(student_id=(select auth.uid()) and private.can_read_topic(topic_id,null));
create policy progress_update on public.topic_progress for update to authenticated using(student_id=(select auth.uid())) with check(student_id=(select auth.uid()) and private.can_read_topic(topic_id,null));
create policy plan_read on public.plan_items for select to authenticated using(private.can_access_student(student_id));
create policy plan_insert on public.plan_items for insert to authenticated with check(student_id=(select auth.uid()));
create policy plan_update on public.plan_items for update to authenticated using(student_id=(select auth.uid())) with check(student_id=(select auth.uid()));
create policy plan_delete on public.plan_items for delete to authenticated using(student_id=(select auth.uid()));
create policy maps_read on public.mind_maps for select to authenticated using(private.can_access_student(student_id));
create policy maps_insert on public.mind_maps for insert to authenticated with check(student_id=(select auth.uid()));
create policy maps_update on public.mind_maps for update to authenticated using(student_id=(select auth.uid())) with check(student_id=(select auth.uid()));
create policy maps_delete on public.mind_maps for delete to authenticated using(student_id=(select auth.uid()));
create policy conversations_read on public.ai_conversations for select to authenticated using(student_id=(select auth.uid()));
create policy messages_read on public.ai_messages for select to authenticated using(exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.student_id=(select auth.uid())));
create policy usage_read on public.ai_usage for select to authenticated using(student_id=(select auth.uid()) or private.is_platform_admin());
create policy privacy_requests_read on public.privacy_requests for select to authenticated using(user_id=(select auth.uid()) or private.is_platform_admin());

create function public.search_lessons(query text, max_results integer default 5)
returns table(content_id uuid, title text, excerpt text, topic_id uuid, chapter_id uuid, subject_id uuid)
language sql stable security invoker set search_path='' as $$
  select ci.id,ci.title,left(coalesce(ci.body_md,ci.pdf_text,''),2000),t.id,c.id,s.id
  from public.content_items ci join public.topics t on t.id=ci.topic_id
  join public.chapters c on c.id=t.chapter_id join public.subjects s on s.id=c.subject_id
  where ci.status='published' and ci.kind in ('lesson','note','example','pdf')
    and to_tsvector('english',coalesce(ci.title,'')||' '||coalesce(ci.body_md,'')||' '||coalesce(ci.pdf_text,'')) @@ plainto_tsquery('english',left(query,300))
  order by ts_rank(to_tsvector('english',coalesce(ci.title,'')||' '||coalesce(ci.body_md,'')||' '||coalesce(ci.pdf_text,'')),plainto_tsquery('english',left(query,300))) desc
  limit least(greatest(max_results,1),8)
$$;
revoke all on function public.search_lessons(text,integer) from public;
grant execute on function public.search_lessons(text,integer) to authenticated;

create function public.reserve_ai_request(target_student uuid, student_limit integer, school_limit integer, platform_limit integer)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare student_count integer; school_count integer; platform_count integer; target_school uuid;
begin
  select school_id into target_school from public.student_profiles where user_id=target_student and approval_status='approved';
  if target_school is null then return false; end if;
  insert into public.ai_usage(student_id,usage_day,requests) values(target_student,current_date,1)
  on conflict(student_id,usage_day) do update set requests=public.ai_usage.requests+1
  where public.ai_usage.requests < student_limit returning requests into student_count;
  if student_count is null then return false; end if;
  insert into public.ai_school_daily(school_id,usage_day,requests) values(target_school,current_date,1)
  on conflict(school_id,usage_day) do update set requests=public.ai_school_daily.requests+1
  where public.ai_school_daily.requests < school_limit returning requests into school_count;
  if school_count is null then raise exception 'School AI limit reached'; end if;
  insert into public.ai_platform_daily(usage_day,requests) values(current_date,1)
  on conflict(usage_day) do update set requests=public.ai_platform_daily.requests+1
  where public.ai_platform_daily.requests < platform_limit returning requests into platform_count;
  if platform_count is null then raise exception 'Platform AI limit reached'; end if;
  return true;
end
$$;
revoke all on function public.reserve_ai_request(uuid,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid,integer,integer,integer) to service_role;

create function public.reserve_api_request(target_user uuid, request_limit integer, platform_limit integer)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare user_count integer; platform_count integer;
begin
  if target_user is null or request_limit < 1 or platform_limit < 1 then return false; end if;
  insert into public.api_platform_daily(usage_day,requests) values(current_date,1)
  on conflict(usage_day) do update set requests=public.api_platform_daily.requests+1
  where public.api_platform_daily.requests < platform_limit returning requests into platform_count;
  if platform_count is null then return false; end if;
  insert into public.api_usage(user_id,usage_day,requests) values(target_user,current_date,1)
  on conflict(user_id,usage_day) do update set requests=public.api_usage.requests+1
  where public.api_usage.requests < request_limit returning requests into user_count;
  return user_count is not null;
end
$$;
revoke all on function public.reserve_api_request(uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.reserve_api_request(uuid,integer,integer) to service_role;

create function public.database_size_bytes()
returns bigint language sql stable security definer set search_path='' as $$
  select pg_database_size(current_database())
$$;
revoke all on function public.database_size_bytes() from public, anon, authenticated;
grant execute on function public.database_size_bytes() to service_role;

create function public.school_ai_usage(target_school uuid, since_day date default current_date - 30)
returns table(usage_day date, requests bigint, input_tokens bigint, output_tokens bigint)
language sql stable security definer set search_path='' as $$
  select u.usage_day,sum(u.requests),sum(u.input_tokens),sum(u.output_tokens)
  from public.ai_usage u join public.student_profiles sp on sp.user_id=u.student_id
  where u.usage_day>=since_day and (target_school is null or sp.school_id=target_school)
    and (private.is_platform_admin() or (target_school is not null and exists(
      select 1 from public.memberships m where m.school_id=target_school and m.user_id=(select auth.uid()) and m.role='school_admin'
    )))
  group by u.usage_day order by u.usage_day desc
$$;
revoke all on function public.school_ai_usage(uuid,date) from public, anon;
grant execute on function public.school_ai_usage(uuid,date) to authenticated;

create function public.school_learning_summary(target_school uuid)
returns table(students bigint, published_content bigint, completed_topics bigint, quiz_attempts bigint)
language sql stable security definer set search_path='' as $$
  select
    (select count(*) from public.student_profiles sp where sp.school_id=target_school and sp.approval_status='approved'),
    (select count(*) from public.content_items ci where ci.school_id=target_school and ci.status='published'),
    (select count(*) from public.topic_progress tp join public.student_profiles sp on sp.user_id=tp.student_id where sp.school_id=target_school),
    (select count(*) from public.quiz_attempts qa join public.student_profiles sp on sp.user_id=qa.student_id where sp.school_id=target_school)
  where target_school is not null and (private.is_platform_admin() or exists(
    select 1 from public.memberships m where m.school_id=target_school and m.user_id=(select auth.uid()) and m.role='school_admin'
  ))
$$;
revoke all on function public.school_learning_summary(uuid) from public, anon;
grant execute on function public.school_learning_summary(uuid) to authenticated;

create view public.parent_children_overview with (security_invoker=true) as
select gl.parent_id, gl.student_id, p.full_name as name, sp.approval_status,
       s.name as school_name, b.name as board_name, g.number as grade_number,
       (select count(*) from public.topic_progress tp where tp.student_id=gl.student_id)::integer as completed,
       (select count(*) from public.quiz_attempts qa where qa.student_id=gl.student_id)::integer as quizzes
from public.guardian_links gl join public.student_profiles sp on sp.user_id=gl.student_id
join public.profiles p on p.id=gl.student_id join public.schools s on s.id=sp.school_id
join public.boards b on b.id=sp.board_id join public.grades g on g.id=sp.grade_id
where gl.parent_id=(select auth.uid());
grant select on public.parent_children_overview to authenticated;

insert into public.boards(code,name) values ('CBSE','CBSE'),('KSEAB','Karnataka State Board'),('ICSE','ICSE');
insert into public.grades(number) select generate_series(1,10);
insert into public.subjects(board_id,grade_id,name,position)
select b.id,g.id,s.name,s.position from public.boards b cross join public.grades g cross join
(values ('Mathematics',1),('Science',2),('English',3),('Social Studies',4)) s(name,position);
