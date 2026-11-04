-- Forward-only assessment editions. Published content is immutable; status can
-- change without rewriting a learner's historical questions/results.
begin;

alter table public.quizzes
  add column series_id uuid not null default gen_random_uuid(),
  add column version integer not null default 1 check(version>0),
  add column edit_version integer not null default 1,
  add column published_at timestamptz,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();
alter table public.flashcards
  add column series_id uuid not null default gen_random_uuid(),
  add column version integer not null default 1 check(version>0),
  add column edit_version integer not null default 1,
  add column published_at timestamptz,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();
update public.quizzes q set published_at=coalesce((select min(a.created_at) from public.quiz_attempts a where a.quiz_id=q.id),now())
  where status='published' or exists(select 1 from public.quiz_attempts a where a.quiz_id=q.id);
update public.flashcards f set published_at=coalesce((select min(r.reviewed_at) from public.flashcard_reviews r where r.flashcard_id=f.id),now())
  where status='published' or exists(select 1 from public.flashcard_reviews r where r.flashcard_id=f.id);
create unique index quizzes_series_version on public.quizzes(series_id,version);
create unique index flashcards_series_version on public.flashcards(series_id,version);
create unique index quizzes_one_published on public.quizzes(series_id) where status='published';
create unique index flashcards_one_published on public.flashcards(series_id) where status='published';

alter table public.quiz_attempts add column quiz_title text,add column quiz_version integer,add column total integer,add column feedback jsonb;
update public.quiz_attempts a set quiz_title=q.title,quiz_version=q.version,
  total=case when jsonb_typeof(a.answers)='array' then jsonb_array_length(a.answers) else 0 end
  from public.quizzes q where q.id=a.quiz_id;
-- Historical feedback is unknown. Do not manufacture it from current answers.

create function private.validate_quiz(target_quiz uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.quizzes where id=target_quiz and length(btrim(title)) between 1 and 180) then raise exception 'Enter a quiz title'; end if;
  if (select count(*) from public.quiz_questions where quiz_id=target_quiz) not between 1 and 20 then raise exception 'Add 1–20 questions'; end if;
  if exists(select 1 from public.quiz_questions q where q.quiz_id=target_quiz and (
    length(btrim(q.prompt)) not between 1 and 1000 or length(q.explanation)>1500 or
    jsonb_array_length(q.options) not between 2 and 10 or q.correct_index>=jsonb_array_length(q.options) or
    exists(select 1 from jsonb_array_elements(q.options) o where jsonb_typeof(o)<>'string' or length(btrim(o #>> '{}')) not between 1 and 300)
  )) then raise exception 'Complete every question, option and correct answer before publishing'; end if;
end
$$;

create function private.assessment_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.published_at is not null then raise exception 'Published editions must be retained; unpublish instead'; end if;
    return old;
  end if;
  if tg_op='UPDATE' then
    if new.id<>old.id or new.series_id<>old.series_id or new.version<>old.version or new.topic_id<>old.topic_id or new.school_id is distinct from old.school_id then
      raise exception 'Assessment identity and scope cannot be changed';
    end if;
    if old.published_at is not null then
      if tg_table_name='quizzes' then
        if new.title is distinct from old.title then raise exception 'Create a revised draft to change a published quiz'; end if;
      else
        if new.front is distinct from old.front or new.back is distinct from old.back then raise exception 'Create a revised draft to change a published card'; end if;
      end if;
    end if;
    new.published_at:=old.published_at;
    new.edit_version:=old.edit_version+1;
    new.created_at:=old.created_at;
  else
    new.edit_version:=1;
    new.published_at:=null;
  end if;
  if new.status='published' then
    if tg_table_name='quizzes' then
      if length(btrim(new.title)) not between 1 and 180 then raise exception 'Enter a quiz title up to 180 characters'; end if;
      perform private.validate_quiz(new.id);
    elsif length(btrim(new.front)) not between 1 and 1000 or length(btrim(new.back)) not between 1 and 2000 then
      raise exception 'Complete both sides of the card before publishing';
    end if;
    new.published_at:=coalesce(new.published_at,now());
  end if;
  new.updated_at:=now();
  return new;
end
$$;
create trigger quizzes_edition_guard before insert or update or delete on public.quizzes for each row execute function private.assessment_guard();
create trigger flashcards_edition_guard before insert or update or delete on public.flashcards for each row execute function private.assessment_guard();

create function private.quiz_question_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare target_quiz uuid;
begin
  target_quiz:=case when tg_op='DELETE' then old.quiz_id else new.quiz_id end;
  perform 1 from public.quizzes where id=target_quiz for update;
  if tg_op='UPDATE' and (new.id<>old.id or new.quiz_id<>old.quiz_id) then raise exception 'Question identity cannot be changed'; end if;
  if exists(select 1 from public.quizzes where id=target_quiz and published_at is not null) then
    raise exception 'Published quiz questions are immutable; create a revised draft';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end
$$;
create trigger quiz_questions_edition_guard before insert or update or delete on public.quiz_questions for each row execute function private.quiz_question_guard();

-- Always acquire the first edition's lock before an edition-specific lock. This
-- serializes publication, draft saves/clones and grading across the same series.
create function private.lock_assessment(assessment_kind text,assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare scope uuid; series uuid;
begin
  if assessment_kind='quiz' then
    select school_id,series_id into scope,series from public.quizzes where id=assessment_id;
  elsif assessment_kind='flashcard' then
    select school_id,series_id into scope,series from public.flashcards where id=assessment_id;
  else raise exception 'Invalid assessment type'; end if;
  if series is null then raise exception 'Assessment unavailable'; end if;
  if not private.can_edit_school(scope) then raise exception 'Staff access required'; end if;
  if assessment_kind='quiz' then
    perform 1 from public.quizzes where series_id=series order by version limit 1 for update;
  else perform 1 from public.flashcards where series_id=series order by version limit 1 for update; end if;
end
$$;

create function public.assessment_list(target_topic uuid,target_school uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.can_edit_school(target_school) then raise exception 'Staff access required'; end if;
  return jsonb_build_object(
    'quizzes',coalesce((select jsonb_agg(to_jsonb(r)) from (
      select id,topic_id,school_id,title,status,version,series_id,edit_version,published_at,updated_at
      from public.quizzes where topic_id=target_topic and school_id is not distinct from target_school order by updated_at desc,id limit 200
    ) r),'[]'::jsonb),
    'flashcards',coalesce((select jsonb_agg(to_jsonb(r)) from (
      select id,topic_id,school_id,left(front,120) as title,status,version,series_id,edit_version,published_at,updated_at
      from public.flashcards where topic_id=target_topic and school_id is not distinct from target_school order by updated_at desc,id limit 200
    ) r),'[]'::jsonb)
  );
end
$$;

create function public.assessment_detail(assessment_kind text,assessment_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; scope uuid;
begin
  if assessment_kind='quiz' then
    select to_jsonb(q),q.school_id into result,scope from public.quizzes q where id=assessment_id;
  elsif assessment_kind='flashcard' then
    select to_jsonb(f),f.school_id into result,scope from public.flashcards f where id=assessment_id;
  else raise exception 'Invalid assessment type'; end if;
  if result is null or not private.can_edit_school(scope) then raise exception 'Assessment unavailable'; end if;
  if assessment_kind='quiz' then
    result:=result||jsonb_build_object('questions',coalesce((select jsonb_agg(jsonb_build_object(
      'prompt',prompt,'options',options,'correctIndex',correct_index,'explanation',explanation
    ) order by position,id) from public.quiz_questions where quiz_id=assessment_id),'[]'::jsonb));
  else
    result:=result||jsonb_build_object('title',left(result->>'front',120));
  end if;
  return result;
end
$$;

create function public.save_assessment(assessment_kind text,target_topic uuid,target_school uuid,assessment_data jsonb,assessment_id uuid default null,expected_edit integer default null,publish_now boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved_id uuid; current_row jsonb; question jsonb; opt jsonb; n integer:=0; correct integer; label text; card_back text;
begin
  if assessment_kind not in ('quiz','flashcard') or assessment_kind is null then raise exception 'Invalid assessment type'; end if;
  if not private.can_edit_school(target_school) then raise exception 'Staff access required'; end if;
  if not exists(select 1 from public.topics where id=target_topic) then raise exception 'Choose a valid topic'; end if;
  if assessment_data is null or jsonb_typeof(assessment_data)<>'object' or length(assessment_data::text)>150000 then raise exception 'Invalid assessment data'; end if;
  if assessment_id is not null then
    perform private.lock_assessment(assessment_kind,assessment_id);
    current_row:=public.assessment_detail(assessment_kind,assessment_id);
    if current_row->>'published_at' is not null then raise exception 'Create a revised draft to edit this edition'; end if;
    if expected_edit is null or expected_edit<>(current_row->>'edit_version')::integer then raise exception 'This assessment changed; reload before saving'; end if;
    if (current_row->>'topic_id')::uuid<>target_topic or (current_row->>'school_id')::uuid is distinct from target_school then raise exception 'Assessment scope cannot be changed'; end if;
  end if;
  saved_id:=coalesce(assessment_id,gen_random_uuid());
  if assessment_kind='flashcard' then
    label:=btrim(assessment_data->>'front'); card_back:=btrim(coalesce(assessment_data->>'back',''));
    if label is null or length(label) not between 1 and 1000 or length(card_back)>2000 then raise exception 'Enter a front up to 1000 characters and a back up to 2000 characters'; end if;
    if assessment_id is null then
      insert into public.flashcards(id,topic_id,school_id,front,back) values(saved_id,target_topic,target_school,label,card_back);
    else update public.flashcards set front=label,back=card_back where id=saved_id; end if;
  else
    label:=btrim(assessment_data->>'title');
    if label is null or length(label) not between 1 and 180 then raise exception 'Enter a quiz title up to 180 characters'; end if;
    if jsonb_typeof(assessment_data->'questions') is distinct from 'array' or jsonb_array_length(assessment_data->'questions') not between 1 and 20 then raise exception 'Add 1–20 questions'; end if;
    if assessment_id is null then
      insert into public.quizzes(id,topic_id,school_id,title) values(saved_id,target_topic,target_school,label);
    else
      update public.quizzes set title=label where id=saved_id;
      delete from public.quiz_questions where quiz_id=saved_id;
    end if;
    for question in select value from jsonb_array_elements(assessment_data->'questions') loop
      if jsonb_typeof(question)<>'object' or jsonb_typeof(question->'prompt') is distinct from 'string' or length(question->>'prompt')>1000
        or jsonb_typeof(question->'options') is distinct from 'array' then raise exception 'Invalid question'; end if;
      if jsonb_array_length(question->'options') not between 2 and 10 then raise exception 'Each question needs 2–10 options'; end if;
      for opt in select value from jsonb_array_elements(question->'options') loop
        if jsonb_typeof(opt)<>'string' or length(opt #>> '{}')>300 then raise exception 'Invalid answer option'; end if;
      end loop;
      if jsonb_typeof(question->'correctIndex') is distinct from 'number' or (question->>'correctIndex') !~ '^[0-9]+$' then raise exception 'Choose a correct option'; end if;
      correct:=(question->>'correctIndex')::integer;
      if correct<0 or correct>=jsonb_array_length(question->'options') then raise exception 'Choose a correct option'; end if;
      if question ? 'explanation' and (jsonb_typeof(question->'explanation')<>'string' or length(question->>'explanation')>1500) then raise exception 'Invalid explanation'; end if;
      insert into public.quiz_questions(quiz_id,prompt,options,correct_index,explanation,position)
        values(saved_id,btrim(question->>'prompt'),question->'options',correct,coalesce(question->>'explanation',''),n);
      n:=n+1;
    end loop;
  end if;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'assessment_draft_saved',assessment_kind,saved_id);
  if publish_now then
    return public.set_assessment_status(assessment_kind,saved_id,(public.assessment_detail(assessment_kind,saved_id)->>'edit_version')::integer,true);
  end if;
  return public.assessment_detail(assessment_kind,saved_id);
end
$$;

create function public.copy_assessment_draft(assessment_kind text,assessment_id uuid,expected_edit integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare source jsonb; new_id uuid:=gen_random_uuid(); next_version integer;
begin
  perform private.lock_assessment(assessment_kind,assessment_id);
  source:=public.assessment_detail(assessment_kind,assessment_id);
  if expected_edit is null or expected_edit<>(source->>'edit_version')::integer then raise exception 'This assessment changed; reload before editing'; end if;
  if source->>'published_at' is null then raise exception 'Edit this draft directly'; end if;
  if assessment_kind='quiz' then
    select max(version)+1 into next_version from public.quizzes where series_id=(source->>'series_id')::uuid;
    insert into public.quizzes(id,topic_id,school_id,title,series_id,version)
      values(new_id,(source->>'topic_id')::uuid,(source->>'school_id')::uuid,source->>'title',(source->>'series_id')::uuid,next_version);
    insert into public.quiz_questions(quiz_id,prompt,options,correct_index,explanation,position)
      select new_id,prompt,options,correct_index,explanation,position from public.quiz_questions where quiz_id=assessment_id;
  else
    select max(version)+1 into next_version from public.flashcards where series_id=(source->>'series_id')::uuid;
    insert into public.flashcards(id,topic_id,school_id,front,back,series_id,version)
      values(new_id,(source->>'topic_id')::uuid,(source->>'school_id')::uuid,source->>'front',source->>'back',(source->>'series_id')::uuid,next_version);
  end if;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),(source->>'school_id')::uuid,'assessment_revision_created',assessment_kind,new_id);
  return public.assessment_detail(assessment_kind,new_id);
end
$$;

create function public.set_assessment_status(assessment_kind text,assessment_id uuid,expected_edit integer,publish boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare source jsonb;
begin
  perform private.lock_assessment(assessment_kind,assessment_id);
  source:=public.assessment_detail(assessment_kind,assessment_id);
  if expected_edit is null or expected_edit<>(source->>'edit_version')::integer then raise exception 'This assessment changed; reload before publishing'; end if;
  if publish is null then raise exception 'Choose a publication state'; end if;
  if assessment_kind='quiz' then
    if publish then update public.quizzes set status='draft' where series_id=(source->>'series_id')::uuid and id<>assessment_id and status='published'; end if;
    update public.quizzes set status=case when publish then 'published'::public.publication_state else 'draft'::public.publication_state end where id=assessment_id;
  else
    if publish then update public.flashcards set status='draft' where series_id=(source->>'series_id')::uuid and id<>assessment_id and status='published'; end if;
    update public.flashcards set status=case when publish then 'published'::public.publication_state else 'draft'::public.publication_state end where id=assessment_id;
  end if;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),(source->>'school_id')::uuid,case when publish then 'assessment_published' else 'assessment_unpublished' end,assessment_kind,assessment_id);
  return public.assessment_detail(assessment_kind,assessment_id);
end
$$;

create function public.submit_quiz(target_quiz uuid,submitted_answers jsonb,expected_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare quiz public.quizzes; question public.quiz_questions; result jsonb:='[]'::jsonb; points integer:=0; n integer:=0; chosen integer; attempt_id uuid;
begin
  if private.current_role() is distinct from 'student' then raise exception 'Student account required'; end if;
  select * into quiz from public.quizzes where id=target_quiz;
  if not found then raise exception 'Quiz unavailable'; end if;
  perform 1 from public.quizzes where series_id=quiz.series_id order by version limit 1 for update;
  select * into quiz from public.quizzes where id=target_quiz for update;
  if quiz.status<>'published' or not private.can_read_topic(quiz.topic_id,quiz.school_id) then raise exception 'Quiz unavailable'; end if;
  if expected_version is not null and expected_version<>quiz.version then raise exception 'Quiz edition changed; reopen it'; end if;
  if jsonb_typeof(submitted_answers) is distinct from 'array' then raise exception 'Answer every question'; end if;
  if jsonb_array_length(submitted_answers)<>(select count(*) from public.quiz_questions where quiz_id=target_quiz) then raise exception 'Answer every question'; end if;
  if jsonb_array_length(submitted_answers) not between 1 and 20 then raise exception 'Quiz unavailable'; end if;
  for question in select * from public.quiz_questions where quiz_id=target_quiz order by position,id loop
    if jsonb_typeof(submitted_answers->n) is distinct from 'number' or (submitted_answers->>n) !~ '^[0-9]+$' then raise exception 'Choose a valid answer for every question'; end if;
    chosen:=(submitted_answers->>n)::integer;
    if chosen<0 or chosen>=jsonb_array_length(question.options) then raise exception 'Choose a valid answer for every question'; end if;
    if chosen=question.correct_index then points:=points+1; end if;
    result:=result||jsonb_build_array(jsonb_build_object('questionId',question.id,'prompt',question.prompt,'options',question.options,'selectedIndex',chosen,'correctIndex',question.correct_index,'explanation',question.explanation));
    n:=n+1;
  end loop;
  insert into public.quiz_attempts(student_id,quiz_id,answers,score,quiz_title,quiz_version,total,feedback)
    values(auth.uid(),target_quiz,submitted_answers,points,quiz.title,quiz.version,n,result) returning id into attempt_id;
  return jsonb_build_object('attemptId',attempt_id,'score',points,'total',n,'feedback',result,'quizTitle',quiz.title,'quizVersion',quiz.version);
end
$$;

revoke all on function private.validate_quiz(uuid),private.assessment_guard(),private.quiz_question_guard(),private.lock_assessment(text,uuid) from public,anon,authenticated;
revoke all on function public.assessment_list(uuid,uuid),public.assessment_detail(text,uuid),public.save_assessment(text,uuid,uuid,jsonb,uuid,integer,boolean),public.copy_assessment_draft(text,uuid,integer),public.set_assessment_status(text,uuid,integer,boolean),public.submit_quiz(uuid,jsonb,integer) from public,anon;
grant execute on function public.assessment_list(uuid,uuid),public.assessment_detail(text,uuid),public.save_assessment(text,uuid,uuid,jsonb,uuid,integer,boolean),public.copy_assessment_draft(text,uuid,integer),public.set_assessment_status(text,uuid,integer,boolean),public.submit_quiz(uuid,jsonb,integer) to authenticated;

commit;
