-- Students and parents enter a school name directly. Matching names reuse one
-- school record, while new names are created immediately without an approval queue.

alter table public.schools
  add column if not exists normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  ) stored;

create unique index if not exists schools_normalized_name_unique
  on public.schools(normalized_name);

create or replace function private.create_profile()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  chosen_school uuid;
  chosen_school_name text;
  chosen_board uuid;
  chosen_grade uuid;
  grade_number integer;
  requested_subjects integer;
  valid_subjects integer;
begin
  if coalesce(new.raw_user_meta_data->>'account_type','parent')='student' then
    chosen_school_name := regexp_replace(btrim(coalesce(new.raw_user_meta_data->>'school_name','')), '[[:space:]]+', ' ', 'g');
    if char_length(chosen_school_name) < 3 or char_length(chosen_school_name) > 160 then
      raise exception 'Enter a valid school name';
    end if;

    insert into public.schools(name)
    values(chosen_school_name)
    on conflict (normalized_name) do update set name=public.schools.name
    returning id into chosen_school;

    chosen_board := (new.raw_user_meta_data->>'board_id')::uuid;
    chosen_grade := (new.raw_user_meta_data->>'grade_id')::uuid;

    select g.number into grade_number from public.grades g where g.id=chosen_grade;
    if grade_number is null or grade_number < 6 or grade_number > 10 then
      raise exception 'Independent student registration is available only for Standards 6-10';
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

comment on column public.schools.normalized_name is
  'Case-insensitive, whitespace-normalized key used to match typed school names.';
