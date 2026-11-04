import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let pg: PGlite
const parent='b0000000-0000-4000-8000-000000000001', other='b0000000-0000-4000-8000-000000000002', unverified='b0000000-0000-4000-8000-000000000003', second='b0000000-0000-4000-8000-000000000004'
const child='b0000000-0000-4000-8000-000000000005', legacy='b0000000-0000-4000-8000-000000000006', older='b0000000-0000-4000-8000-000000000007', staff='b0000000-0000-4000-8000-000000000008', platform='b0000000-0000-4000-8000-000000000009'
const school='c0000000-0000-4000-8000-000000000001', otherSchool='c0000000-0000-4000-8000-000000000002'
let topic:string, globalLesson:string, privatePdf:string, quiz:string, card:string
type Consent={status:string;consentVersion:number;changed:boolean}
async function as<T=Record<string,unknown>>(actor:string,sql:string,args:unknown[]=[],role='authenticated'){
  await pg.exec('savepoint consent_case')
  try{
    await pg.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);await pg.exec(`set local role ${role}`)
    const result=await pg.query<T>(sql,args)
    await pg.exec('reset role;release savepoint consent_case');return result.rows
  }catch(e){await pg.exec('rollback to savepoint consent_case;release savepoint consent_case');throw e}
}
async function change(status='withdrawn',version:number|null=1,actor=parent,target=child){
  return (await as<{value:Consent}>(actor,'select public.change_guardian_consent($1,$2,$3) as value',[target,status,version]))[0].value
}
async function states(target=child){return (await pg.query<{approval_status:string;consent_version:number;approved_at:Date|null;status:string;consented_at:Date|null}>(
  'select sp.approval_status,sp.consent_version,sp.approved_at,gl.status,gl.consented_at from public.student_profiles sp join public.guardian_links gl on gl.student_id=sp.user_id where sp.user_id=$1 and gl.parent_id=$2',[target,parent])).rows[0]}
async function records(){return (await pg.query<{value:unknown}>(`select jsonb_build_object(
  'progress',(select jsonb_agg(to_jsonb(t)) from public.topic_progress t where student_id=$1),
  'attempts',(select jsonb_agg(to_jsonb(t)) from public.quiz_attempts t where student_id=$1),
  'reviews',(select jsonb_agg(to_jsonb(t)) from public.flashcard_reviews t where student_id=$1),
  'plans',(select jsonb_agg(to_jsonb(t)) from public.plan_items t where student_id=$1),
  'maps',(select jsonb_agg(to_jsonb(t)) from public.mind_maps t where student_id=$1),
  'subjects',(select jsonb_agg(to_jsonb(t)) from public.student_subjects t where student_id=$1),
  'enrollments',(select jsonb_agg(to_jsonb(t)) from public.school_enrollments t where student_id=$1)
) as value`,[child])).rows[0].value}
beforeAll(async()=>{
  pg=new PGlite()
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon,service_role;`)
  const directory=new URL('../supabase/migrations/',import.meta.url)
  for(const file of (await readdir(directory)).filter(f=>f.endsWith('.sql')&&f<'202610220006_atomic_guardian_consent.sql').sort())await pg.exec((await readFile(new URL(file,directory),'utf8')).replace('create extension if not exists pgcrypto;',''))
  for(const id of [parent,other,unverified,second,child,legacy,older,staff,platform])await pg.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,case when $3 then null else now() end)',[id,`${id}@example.test`,id===unverified])
  await pg.query("update public.profiles set role='student' where id in ($1,$2,$3)",[child,legacy,older])
  await pg.query("update public.profiles set role='school_admin' where id=$1",[staff]);await pg.query("update public.profiles set role='platform_admin' where id=$1",[platform])
  await pg.query("insert into public.schools(id,name) values($1,'Consent School A'),($2,'Consent School B')",[school,otherSchool])
  await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'school_admin')",[staff,school])
  const subject=(await pg.query<{id:string;board_id:string;grade_id:string}>('select s.* from public.subjects s join public.grades g on g.id=s.grade_id where g.number=3 limit 1')).rows[0]
  const olderGrade=(await pg.query<{id:string}>('select id from public.grades where number=6')).rows[0].id
  for(const id of [child,legacy,older]){
    await pg.query("insert into public.student_profiles(user_id,school_id,board_id,grade_id,approval_status,approved_at) values($1,$2,$3,$4,'approved','2026-09-22')",[id,school,subject.board_id,id===older?olderGrade:subject.grade_id])
    await pg.query('insert into public.student_subjects values($1,$2)',[id,subject.id])
  }
  for(const [guardian,student] of [[parent,child],[second,child],[unverified,child],[staff,child],[parent,older]])await pg.query("insert into public.guardian_links(parent_id,student_id,status,consented_at) values($1,$2,'approved','2026-09-22')",[guardian,student])
  // Preserve a partial old write; only an explicit authorized decision repairs it.
  await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'withdrawn')",[parent,legacy])
  await pg.query('insert into public.school_enrollments(school_id,student_id) values($1,$2)',[school,child])
  const chapter=(await pg.query<{id:string}>("insert into public.chapters(subject_id,title) values($1,'Consent') returning id",[subject.id])).rows[0].id
  topic=(await pg.query<{id:string}>("insert into public.topics(chapter_id,title) values($1,'Consent') returning id",[chapter])).rows[0].id
  globalLesson=(await pg.query<{id:string}>("insert into public.content_items(topic_id,kind,title,body_md,status) values($1,'lesson','Global consent lesson','Body','published') returning id",[topic])).rows[0].id
  privatePdf=(await pg.query<{id:string}>("insert into public.content_items(topic_id,school_id,kind,title,object_key,asset_bytes,pdf_text,status) values($1,$2,'pdf','Private consent PDF','consent.pdf',50,'Text','published') returning id",[topic,school])).rows[0].id
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[platform])
  quiz=(await pg.query<{value:{id:string}}>("select public.save_assessment('quiz',$1,$2,$3,null,null,true) as value",[topic,school,JSON.stringify({title:'Consent quiz',questions:[{prompt:'One?',options:['1','2'],correctIndex:0,explanation:'One.'}]})])).rows[0].value.id
  card=(await pg.query<{value:{id:string}}>("select public.save_assessment('flashcard',$1,$2,$3,null,null,true) as value",[topic,school,JSON.stringify({front:'One?',back:'1'})])).rows[0].value.id
  await pg.query('insert into public.topic_progress(student_id,topic_id) values($1,$2)',[child,topic])
  await pg.query("insert into public.quiz_attempts(student_id,quiz_id,answers,score) values($1,$2,'[0]',1)",[child,quiz])
  await pg.query("insert into public.flashcard_reviews(student_id,flashcard_id,rating,due_at) values($1,$2,3,now())",[child,card])
  await pg.query("insert into public.plan_items(student_id,title,due_date) values($1,'Retain plan',current_date)",[child])
  await pg.query('insert into public.mind_maps(student_id) values($1)',[child])
  await pg.exec(await readFile(new URL('202610220006_atomic_guardian_consent.sql',directory),'utf8'))
},60000)
beforeEach(async()=>{await pg.exec('begin')})
afterEach(async()=>{await pg.exec('rollback')})
afterAll(async()=>{await pg?.close()})

describe('atomic guardian consent and protected learning access',()=>{
  it('upgrades without changing legacy decisions/history and exposes versions only through existing view permissions',async()=>{
    expect(await states()).toMatchObject({approval_status:'approved',status:'approved',consent_version:1})
    expect(await states(legacy)).toMatchObject({approval_status:'approved',status:'withdrawn',consent_version:1})
    expect(await as(parent,'select student_id,consent_version from public.parent_children_overview')).toHaveLength(3)
    expect(await as(other,'select * from public.parent_children_overview')).toEqual([])
    expect((await as(child,'select * from public.topic_progress')).length).toBe(1)
  })
  it('withdraws both statuses/timestamps and audits once without touching learning records',async()=>{
    const before=await records()
    expect(await change()).toEqual({status:'withdrawn',consentVersion:2,changed:true})
    expect(await states()).toMatchObject({approval_status:'withdrawn',status:'withdrawn',approved_at:null,consented_at:null,consent_version:2})
    expect(await records()).toEqual(before)
    expect((await pg.query('select actor_id,action,target_id from public.audit_events where action like $1',['consent_%'])).rows).toEqual([{actor_id:parent,action:'consent_withdrawn',target_id:child}])
  })
  it('blocks new lessons/PDF pointers, search, quiz grading, reviews and progress writes while paused',async()=>{
    expect(await as(child,'select object_key from public.content_items where id=$1',[privatePdf])).toHaveLength(1)
    expect(await as(child,'select * from public.search_lessons($1)', ['consent'])).not.toHaveLength(0)
    await change()
    expect(await as(child,'select id from public.content_items')).toEqual([])
    expect(await as(child,'select id from public.quizzes')).toEqual([])
    expect(await as(child,'select id from public.flashcards')).toEqual([])
    expect(await as(child,'select * from public.search_lessons($1)', ['consent'])).toEqual([])
    await expect(as(child,'select public.submit_quiz($1,$2,1)',[quiz,'[0]'])).rejects.toThrow('Quiz unavailable')
    await expect(as(child,'update public.flashcard_reviews set rating=4 where flashcard_id=$1',[card])).rejects.toThrow('row-level security')
    await expect(as(child,'update public.topic_progress set completed_at=now() where topic_id=$1',[topic])).rejects.toThrow('row-level security')
    // Withdrawal preserves access to personal history and guardian reporting.
    expect(await as(parent,'select * from public.quiz_attempts')).toHaveLength(1)
    expect(await as(child,'select * from public.topic_progress')).toHaveLength(1)
  })
  it('restores permitted learning and progress without restoring a revoked school membership',async()=>{
    await change();await pg.query("update public.school_enrollments set status='revoked',revoked_at=now() where student_id=$1",[child])
    const before=await records()
    expect(await change('approved',2)).toMatchObject({consentVersion:3,status:'approved'})
    const state=await states();expect(state.approved_at).toBeTruthy();expect(state.approved_at).toEqual(state.consented_at)
    expect(await records()).toEqual(before)
    expect(await as(child,'select id from public.content_items where id=$1',[globalLesson])).toHaveLength(1)
    expect(await as(child,'select id from public.content_items where id=$1',[privatePdf])).toEqual([])
    expect(await as(child,'select * from public.quiz_attempts')).toHaveLength(1)
  })
  it('restores grading, flashcard reviews and progress writes when enrollment remains active',async()=>{
    await change();await change('approved',2)
    expect(await as(child,'select object_key from public.content_items where id=$1',[privatePdf])).toEqual([{object_key:'consent.pdf'}])
    const result=await as<{value:{score:number}}>(child,'select public.submit_quiz($1,$2,1) as value',[quiz,'[0]'])
    expect(result[0].value.score).toBe(1)
    expect(await as(child,'update public.flashcard_reviews set rating=4 where flashcard_id=$1 returning rating',[card])).toEqual([{rating:4}])
    expect(await as(child,'update public.topic_progress set completed_at=now() where topic_id=$1 returning topic_id',[topic])).toEqual([{topic_id:topic}])
  })
  it('denies unrelated, unverified, student, staff and platform callers',async()=>{
    for(const actor of [other,unverified,child,staff,platform])await expect(change('withdrawn',1,actor)).rejects.toThrow(/linked|Verified parent/)
    expect((await states()).consent_version).toBe(1)
  })
  it('preserves independent Standard 6-10 accounts even if a historical guardian link exists',async()=>{
    await expect(change('withdrawn',1,parent,older)).rejects.toThrow('Standards 1-5')
    expect(await states(older)).toMatchObject({approval_status:'approved',consent_version:1})
  })
  it('rejects invalid decisions and missing/stale versions without writes',async()=>{
    for(const status of ['pending','other',''])await expect(change(status)).rejects.toThrow('Invalid consent status')
    for(const version of [0,-1,null])await expect(change('withdrawn',version)).rejects.toThrow('Reload My children')
    await change()
    await expect(change('approved',1)).rejects.toThrow('Approval changed')
    expect(await change('withdrawn',2)).toEqual({status:'withdrawn',consentVersion:2,changed:false})
    expect((await pg.query("select count(*)::int as n from public.audit_events where action like 'consent_%'")).rows[0].n).toBe(1)
  })
  it('rolls back the guardian write if the student status write fails',async()=>{
    await pg.exec("create function public.fail_consent_student() returns trigger language plpgsql as $$ begin raise exception 'Injected student failure'; end $$;create trigger z_fail_consent before update on public.student_profiles for each row execute function public.fail_consent_student()")
    const before=await states()
    await expect(change()).rejects.toThrow('Injected student failure')
    expect(await states()).toEqual(before)
    expect((await pg.query("select * from public.audit_events where action like 'consent_%'")).rows).toEqual([])
  })
  it('rolls back both status writes if audit insertion fails',async()=>{
    await pg.exec("create function public.fail_consent_audit() returns trigger language plpgsql as $$ begin if new.action like 'consent_%' then raise exception 'Injected audit failure'; end if;return new;end $$;create trigger fail_consent before insert on public.audit_events for each row execute function public.fail_consent_audit()")
    const before=await states()
    await expect(change()).rejects.toThrow('Injected audit failure')
    expect(await states()).toEqual(before)
  })
  it('shares a version across linked guardians and rejects their out-of-date decisions',async()=>{
    await change()
    await expect(change('approved',1,second)).rejects.toThrow('Approval changed')
    expect(await change('approved',2,second)).toMatchObject({consentVersion:3,status:'approved'})
    // Preserve the existing linked-guardian behavior; no new consensus policy.
    expect((await states()).status).toBe('withdrawn')
    expect((await states()).approval_status).toBe('approved')
  })
  it('repairs a partial legacy decision only after an explicit authorized request',async()=>{
    expect(await change('approved',1,parent,legacy)).toMatchObject({changed:true,consentVersion:2})
    expect(await states(legacy)).toMatchObject({approval_status:'approved',status:'approved'})
  })
  it('denies anonymous/service RPCs and raw client/legacy service writes',async()=>{
    for(const role of ['anon','service_role'])await expect(as(parent,'select public.change_guardian_consent($1,$2,1)',[child,'withdrawn'],role)).rejects.toThrow('permission denied')
    await expect(as(parent,"update public.guardian_links set status='withdrawn' where student_id=$1",[child])).rejects.toThrow('permission denied')
    await pg.exec('grant usage on schema public to service_role;grant update,select on public.guardian_links,public.student_profiles to service_role')
    await expect(as(parent,"update public.guardian_links set status='withdrawn' where student_id=$1",[child],'service_role')).rejects.toThrow('atomic guardian consent')
    await expect(as(parent,"update public.student_profiles set approval_status='withdrawn' where user_id=$1",[child],'service_role')).rejects.toThrow('atomic guardian consent')
    expect((await states()).consent_version).toBe(1)
  })
})
