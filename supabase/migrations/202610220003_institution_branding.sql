-- Institution presentation only; never an enrollment or content entitlement.
begin;

create table public.institution_branding (
  school_id uuid primary key references public.schools(id) on delete cascade,
  display_name text check (length(display_name) between 1 and 100),
  logo_data_url text check (length(logo_data_url) <= 131110 and logo_data_url ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$'),
  primary_color text not null default '#2167e9' check (primary_color ~ '^#[0-9a-f]{6}$'),
  accent_color text not null default '#15977e' check (accent_color ~ '^#[0-9a-f]{6}$'),
  support_email text check (length(support_email) <= 254 and support_email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'),
  support_phone text check (length(support_phone) between 3 and 40 and support_phone ~ '^[+0-9() .-]+$'),
  website text check (length(website) <= 500 and website ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?(/[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]*)?$'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.institution_branding enable row level security;
revoke all on public.institution_branding from public, anon, authenticated;

create function private.can_read_institution_branding(target_school uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    private.is_staff_for(target_school) or exists (
      select 1 from public.school_enrollments e
      join public.schools s on s.id=e.school_id and s.active
      join public.student_profiles sp on sp.user_id=e.student_id and sp.approval_status='approved'
      where e.school_id=target_school and e.status='active' and (
        e.student_id=auth.uid() or exists (
          select 1 from public.guardian_links gl where gl.parent_id=auth.uid()
            and gl.student_id=e.student_id and gl.status='approved'
        )
      )
    )
  )
$$;

create function private.brand_color_contrast(color text) returns double precision
language plpgsql immutable set search_path='' as $$
declare rgb bytea; channel double precision; luminance double precision := 0; i integer;
begin
  if color is null or color !~ '^#[0-9a-fA-F]{6}$' then return 0; end if;
  rgb := decode(substr(color,2),'hex');
  for i in 0..2 loop
    channel := get_byte(rgb,i)/255.0;
    channel := case when channel <= 0.04045 then channel/12.92 else power((channel+0.055)/1.055,2.4) end;
    luminance := luminance + channel * case i when 0 then 0.2126 when 1 then 0.7152 else 0.0722 end;
  end loop;
  return 1.05/(luminance+0.05);
end
$$;

create function public.institution_workspaces(known_versions jsonb default '{}'::jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,
    'can_manage',private.is_school_admin(s.id),'branding',case when known_versions->>s.id::text=b.version::text
      then to_jsonb(b)-'updated_by'-'logo_data_url' else to_jsonb(b)-'updated_by' end) order by s.name,s.id),'[]'::jsonb)
  from public.schools s left join public.institution_branding b on b.school_id=s.id
  where private.can_read_institution_branding(s.id)
$$;

create function public.save_institution_branding(target_school uuid, settings jsonb, expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_version integer; saved public.institution_branding; key text;
  primary_value text; accent_value text;
begin
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  -- The stable school row also serializes the first save when no branding row exists.
  perform 1 from public.schools where id=target_school for update;
  if not found then raise exception 'Institution unavailable'; end if;
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required'; end if;
  if jsonb_typeof(settings) is distinct from 'object' or length(settings::text)>140000 then
    raise exception 'Invalid branding settings';
  end if;
  for key in select jsonb_object_keys(settings) loop
    if key not in ('display_name','logo_data_url','primary_color','accent_color','support_email','support_phone','website')
      or jsonb_typeof(settings->key) not in ('string','null') then raise exception 'Invalid branding field'; end if;
  end loop;
  select version into previous_version from public.institution_branding where school_id=target_school;
  if expected_version is distinct from coalesce(previous_version,0) then
    raise exception 'Branding changed; reload the saved settings before saving again';
  end if;
  primary_value := lower(coalesce(settings->>'primary_color','#2167e9'));
  accent_value := lower(coalesce(settings->>'accent_color','#15977e'));
  if private.brand_color_contrast(primary_value)<4.5 then raise exception 'Primary color must have at least 4.5:1 contrast against white'; end if;
  if private.brand_color_contrast(accent_value)<3 then raise exception 'Accent color must have at least 3:1 contrast against white'; end if;
  insert into public.institution_branding(school_id,display_name,logo_data_url,primary_color,accent_color,support_email,support_phone,website,version,updated_by)
  values(target_school,nullif(btrim(settings->>'display_name'),''),nullif(settings->>'logo_data_url',''),primary_value,accent_value,
    nullif(btrim(settings->>'support_email'),''),nullif(btrim(settings->>'support_phone'),''),nullif(btrim(settings->>'website'),''),coalesce(previous_version,0)+1,auth.uid())
  on conflict(school_id) do update set display_name=excluded.display_name,logo_data_url=excluded.logo_data_url,
    primary_color=excluded.primary_color,accent_color=excluded.accent_color,support_email=excluded.support_email,
    support_phone=excluded.support_phone,website=excluded.website,version=excluded.version,updated_at=now(),updated_by=auth.uid()
  returning * into saved;
  insert into public.audit_events(actor_id,school_id,action,target_type,target_id)
    values(auth.uid(),target_school,'institution.branding_saved','school',target_school);
  return to_jsonb(saved)-'updated_by';
end
$$;

revoke all on function private.can_read_institution_branding(uuid),private.brand_color_contrast(text) from public,anon,authenticated;
revoke all on function public.institution_workspaces(jsonb),public.save_institution_branding(uuid,jsonb,integer) from public,anon;
grant execute on function public.institution_workspaces(jsonb),public.save_institution_branding(uuid,jsonb,integer) to authenticated;
commit;
