import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
let pg: PGlite
const admin = '80000000-0000-4000-8000-000000000001', student = '80000000-0000-4000-8000-000000000002', parent = '80000000-0000-4000-8000-000000000003', child = '80000000-0000-4000-8000-000000000004', other = '80000000-0000-4000-8000-000000000005', editor = '80000000-0000-4000-8000-000000000006', platform = '80000000-0000-4000-8000-000000000007'
const school = '90000000-0000-4000-8000-000000000001', otherSchool = '90000000-0000-4000-8000-000000000002'
let subject: { id: string; board_id: string; grade_id: string }; let topic: string
async function as<T>(actor: string, sql: string, args: unknown[] = []) {
  await pg.exec('savepoint operations_case')
  try {
    await pg.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]); await pg.exec('set local role authenticated')
    const result = await pg.query<T>(sql, args)
    await pg.exec('reset role;release savepoint operations_case'); return result.rows
  } catch (e) { await pg.exec('rollback to savepoint operations_case;release savepoint operations_case'); throw e }
}
async function rpc<T = Record<string, unknown>>(actor: string, sql: string, args: unknown[] = []) { return (await as<{ value: T }>(actor, `select ${sql} as value`, args))[0].value }
async function request(actor = student, kind = 'export', target: string | null = null) { return rpc<{ id: string; existing: boolean }>(actor, 'public.request_account_privacy($1,$2)', [kind, target]) }
async function review(id: string, status = 'in_review', delivered = false, actor = platform) { return rpc(actor, 'public.review_account_privacy($1,$2,$3)', [id, status, delivered]) }
beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;`)
  const directory = new URL('../supabase/migrations/', import.meta.url)
  for (const file of (await readdir(directory)).filter(file => file.endsWith('.sql') && file < '202610220004_account_operations.sql').sort()) await pg.exec((await readFile(new URL(file, directory), 'utf8')).replace('create extension if not exists pgcrypto;', ''))
  for (const id of [admin, student, parent, child, other, editor, platform]) await pg.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, `${id}@example.test`])
  await pg.query("update public.profiles set role='school_admin' where id=$1", [admin])
  await pg.query("update public.profiles set role='student' where id in ($1,$2,$3)", [student, child, other])
  await pg.query("update public.profiles set role='editor' where id=$1", [editor])
  await pg.query("update public.profiles set role='platform_admin' where id=$1", [platform])
  await pg.query("insert into public.schools(id,name) values($1,'Operations A'),($2,'Operations B')", [school, otherSchool])
  await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'school_admin'),($3,$2,'editor')", [admin, school, editor])
  subject = (await pg.query<typeof subject>('select s.* from public.subjects s join public.grades g on g.id=s.grade_id where g.number=6 limit 1')).rows[0]
  const youngerGrade = (await pg.query<{ id: string }>('select id from public.grades where number=3')).rows[0].id
  for (const id of [student, child, other]) await pg.query("insert into public.student_profiles(user_id,school_id,board_id,grade_id,approval_status) values($1,$2,$3,$4,'approved')", [id, school, subject.board_id, id === child ? youngerGrade : subject.grade_id])
  await pg.query('insert into public.school_enrollments(school_id,student_id) values($1,$2),($3,$4)', [school, student, otherSchool, other])
  await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'withdrawn')", [parent, child])
  const chapter = (await pg.query<{ id: string }>("insert into public.chapters(subject_id,title) values($1,'Operations') returning id", [subject.id])).rows[0].id
  topic = (await pg.query<{ id: string }>("insert into public.topics(chapter_id,title) values($1,'Operations') returning id", [chapter])).rows[0].id
  await pg.query("insert into public.privacy_requests(user_id,kind) values($1,'export'),($1,'export')", [other])
  await pg.exec(await readFile(new URL('202610220004_account_operations.sql', directory), 'utf8'))
}, 60000)
beforeEach(async () => { await pg.exec('begin') })
afterEach(async () => { await pg.exec('rollback') })
afterAll(async () => { await pg?.close() })

describe('account controls, privacy and operational boundaries', () => {
  it('preserves duplicate legacy requests while backfilling requester attribution', async () => {
    const rows = await as<{ requested_by: string }>(other, 'select requested_by from public.privacy_requests')
    expect(rows).toHaveLength(2); expect(rows.every(row => row.requested_by === other)).toBe(true)
    expect((await request(other)).existing).toBe(true)
  })
  it('accepts verified independent self requests, deduplicates open kinds and denies impersonation', async () => {
    const first = await request(); expect(first.existing).toBe(false)
    expect(await request()).toEqual({ id: first.id, existing: true, status: 'pending' })
    expect((await request(student, 'delete')).id).not.toBe(first.id)
    for (const actor of [other, admin, platform]) await expect(request(actor, 'export', student)).rejects.toThrow('account holder or linked guardian')
    await expect(request(student, 'invalid')).rejects.toThrow('Invalid privacy')
  })
  it('preserves guardian-managed 1–5 requests even after consent withdrawal and keeps older learners independent', async () => {
    const result = await request(parent, 'delete', child)
    expect(result.existing).toBe(false)
    await expect(request(child)).rejects.toThrow('account holder or linked guardian')
    await expect(request(parent, 'export', student)).rejects.toThrow('account holder or linked guardian')
    await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'approved')", [parent, student])
    await expect(request(parent, 'export', student)).rejects.toThrow('account holder or linked guardian')
    const overview = await rpc<{ children: { id: string }[]; requests: { user_id: string }[] }>(parent, 'public.account_privacy_overview()')
    expect(overview.children.map(row => row.id)).toEqual([child]); expect(overview.requests[0].user_id).toBe(child)
    expect(await as(child, 'select id from public.privacy_requests')).toHaveLength(1)
    expect(await as(editor, 'select id from public.privacy_requests')).toEqual([])
    await pg.query("update public.profiles set role='parent' where id=$1", [editor])
    await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'approved')", [editor, child])
    const separate = await request(editor, 'delete', child)
    expect(separate.id).not.toBe(result.id)
    expect(await as(editor, 'select id from public.privacy_requests')).toEqual([{ id: separate.id }])
  })
  it('requires verified email but allows paused learners to request their records', async () => {
    await pg.query("update public.student_profiles set approval_status='withdrawn' where user_id=$1", [student])
    await request()
    await pg.query('update auth.users set email_confirmed_at=null where id=$1', [student])
    await expect(request(student, 'delete')).rejects.toThrow('Verified account')
    expect((await rpc<{ can_request_self: boolean }>(student, 'public.account_privacy_overview()')).can_request_self).toBe(false)
  })
  it('protects direct writes and exposes only own or submitted requests', async () => {
    await request()
    expect(await as(other, 'select id from public.privacy_requests where user_id=$1', [student])).toEqual([])
    await expect(as(student, "insert into public.privacy_requests(user_id,kind) values($1,'delete')", [other])).rejects.toThrow('permission denied')
    await expect(as(student, "update public.privacy_requests set status='fulfilled'")).rejects.toThrow('permission denied')
  })
  it('reviews atomically, requires delivered in-review exports and never marks deletion fulfilled', async () => {
    const exported = await request()
    await expect(review(exported.id, 'in_review', false, admin)).rejects.toThrow('Platform administrator')
    await expect(review(exported.id, 'fulfilled', true)).rejects.toThrow('in-review export')
    await review(exported.id)
    await expect(review(exported.id, 'fulfilled')).rejects.toThrow('in-review export')
    await review(exported.id, 'fulfilled', true)
    expect((await request()).existing).toBe(false)
    const deleted = await request(student, 'delete'); await review(deleted.id)
    await expect(review(deleted.id, 'fulfilled', true)).rejects.toThrow('in-review export')
    expect((await as<{ status: string; reviewed_at: unknown }>(student, 'select status,reviewed_at from public.privacy_requests where id=$1', [deleted.id]))[0]).toMatchObject({ status: 'in_review', reviewed_at: expect.anything() })
  })
  it('returns only institution-owned aggregate material/storage and verified enrollment totals', async () => {
    await pg.query("insert into public.content_items(topic_id,school_id,kind,title,object_key,asset_bytes,status) values($1,$2,'pdf','A','a.pdf',123,'draft'),($1,$3,'pdf','B','b.pdf',999,'published')", [topic, school, otherSchool])
    const data = await rpc(admin, 'public.institution_usage($1)', [school])
    expect(data).toMatchObject({ activeStudents: 1, staff: 2, trackedPdfBytes: 123, draftMaterials: 1, publishedMaterials: 0 })
    for (const actor of [editor, student, parent, other]) await expect(rpc(actor, 'public.institution_usage($1)', [school])).rejects.toThrow('administrator access')
    await expect(rpc(admin, 'public.institution_usage($1)', [otherSchool])).rejects.toThrow('administrator access')
    await pg.query("update public.school_enrollments set status='revoked' where school_id=$1", [school])
    expect((await rpc(admin, 'public.institution_usage($1)', [school])).activeStudents).toBe(0)
    await pg.query('delete from public.memberships where user_id=$1', [admin])
    await expect(rpc(admin, 'public.institution_usage($1)', [school])).rejects.toThrow('administrator access')
  })
  it('aggregates platform counters in SQL beyond Data API default row limits', async () => {
    await pg.exec("insert into auth.users(id,email) select gen_random_uuid(),'aggregate-'||n||'@example.test' from generate_series(1,1100) n")
    await pg.query("insert into public.student_profiles(user_id,school_id,board_id,grade_id) select id,$1,$2,$3 from auth.users where email like 'aggregate-%'", [school, subject.board_id, subject.grade_id])
    await pg.exec("insert into public.ai_usage(student_id,usage_day,requests,input_tokens,output_tokens) select user_id,(now() at time zone 'UTC')::date,1,2,3 from public.student_profiles where user_id not in (select id from auth.users where email not like 'aggregate-%')")
    await pg.exec("insert into public.ai_platform_daily(usage_day,requests) values((now() at time zone 'UTC')::date,1234)")
    const data = await rpc(platform, 'public.platform_usage_snapshot()')
    expect(data).toMatchObject({ aiRequestsToday: 1234, aiTokensToday: 5500, students: 1103, openPrivacyRequests: 2 })
    for (const actor of [admin, editor, student, parent]) await expect(rpc(actor, 'public.platform_usage_snapshot()')).rejects.toThrow('Platform administrator')
  })
  it('retains authored institution content and audit records when an operator deletes a staff account', async () => {
    const content = (await pg.query<{ id: string }>("insert into public.content_items(topic_id,school_id,kind,title,author_id) values($1,$2,'lesson','Retained',$3) returning id", [topic, school, admin])).rows[0].id
    await pg.query("update public.content_items set title='Revised' where id=$1", [content])
    const revision = (await pg.query<{ id: string }>('insert into public.content_revisions(content_id,snapshot,changed_by) values($1,$2,$3) returning id', [content, '{}', admin])).rows[0].id
    await pg.query("insert into public.school_requests(parent_id,school_name,reviewed_by) values($1,'Historical label',$2)", [parent, admin])
    await pg.query("insert into public.audit_events(actor_id,action,target_type,target_id) values($1,'test','content',$2)", [admin, content])
    const preflight = await rpc(platform, 'public.account_deletion_preflight($1)', [admin])
    expect(preflight).toMatchObject({ linkedChildren: 0, staffMemberships: 1, authoredItems: 1, revisionAttributions: 1, auditAttributions: 1 })
    await pg.query('delete from auth.users where id=$1', [admin])
    expect((await pg.query('select author_id,title from public.content_items where id=$1', [content])).rows[0]).toEqual({ author_id: null, title: 'Revised' })
    expect((await pg.query("select actor_id from public.audit_events where action='test'")).rows[0].actor_id).toBeNull()
    expect((await pg.query('select changed_by from public.content_revisions where id=$1', [revision])).rows[0].changed_by).toBeNull()
    expect((await pg.query('select reviewed_by from public.school_requests')).rows[0].reviewed_by).toBeNull()
    expect((await pg.query('select * from public.memberships where user_id=$1', [admin])).rows).toEqual([])
  })
  it('blocks guardian deletion until linked children are resolved, then cascades personal records', async () => {
    await request(parent, 'delete', child)
    await pg.query("insert into public.plan_items(student_id,title,due_date) values($1,'Personal task',current_date)", [child])
    await pg.exec('savepoint guardian_delete')
    await expect(pg.query('delete from auth.users where id=$1', [parent])).rejects.toThrow('Resolve linked child')
    await pg.exec('rollback to savepoint guardian_delete;release savepoint guardian_delete')
    await pg.query('delete from auth.users where id=$1', [child])
    expect((await pg.query('select id from public.plan_items where student_id=$1', [child])).rows).toEqual([])
    expect((await pg.query('select id from public.privacy_requests where user_id=$1', [child])).rows).toEqual([])
    await pg.query('delete from auth.users where id=$1', [parent])
    expect((await pg.query('select id from public.profiles where id=$1', [parent])).rows).toEqual([])
  })
  it('restricts deletion preflight to platform administrators and denies anonymous RPC execution', async () => {
    for (const actor of [admin, student, parent]) await expect(rpc(actor, 'public.account_deletion_preflight($1)', [student])).rejects.toThrow('Platform administrator')
    expect((await rpc(platform, 'public.account_deletion_preflight($1)', [parent])).linkedChildren).toBe(1)
    for (const call of ['public.account_privacy_overview()', "public.request_account_privacy('export')", `public.institution_usage('${school}')`, 'public.platform_usage_snapshot()']) {
      await pg.exec('savepoint anon_case;set local role anon'); await expect(pg.query(`select ${call}`)).rejects.toThrow('permission denied'); await pg.exec('rollback to savepoint anon_case;release savepoint anon_case')
    }
  })
})
