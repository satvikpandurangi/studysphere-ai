import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Real PostgreSQL policies/functions, with a minimal local Auth schema. No remote
// service, production credentials or paid database is used by this suite.
let pg: PGlite
const ids = {
  student: '00000000-0000-4000-8000-000000000001',
  impostor: '00000000-0000-4000-8000-000000000002',
  adminA: '00000000-0000-4000-8000-000000000003',
  adminB: '00000000-0000-4000-8000-000000000004',
  editor: '00000000-0000-4000-8000-000000000005',
  parent: '00000000-0000-4000-8000-000000000006',
  child: '00000000-0000-4000-8000-000000000007',
  unverified: '00000000-0000-4000-8000-000000000008',
  otherParent: '00000000-0000-4000-8000-000000000009',
}
const schoolA = '10000000-0000-4000-8000-000000000001'
const schoolB = '10000000-0000-4000-8000-000000000002'
let topic: string
let contentA: string
let contentB: string
let globalContent: string
let childContent: string

async function as<T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) {
  await pg.exec('savepoint access_test')
  try {
    await pg.query("select set_config('request.jwt.claim.sub',$1,true)", [user])
    await pg.exec('set local role authenticated')
    const result = await pg.query<T>(sql, params)
    await pg.exec('reset role; release savepoint access_test')
    return result.rows
  } catch (error) {
    await pg.exec('rollback to savepoint access_test; release savepoint access_test')
    throw error
  }
}
async function invite(email = 'student@example.test', school = schoolA, admin = ids.adminA) {
  const rows = await as<{ value: { id: string; code: string } }>(admin, 'select public.create_enrollment_invite($1,$2) as value', [school, email])
  return rows[0].value
}
async function accept(code: string, student: string = ids.student, actor: string = student) {
  return as(actor, 'select public.accept_enrollment_invite($1,$2)', [code, student])
}
async function visible(user = ids.student) {
  const rows = await as<{ id: string }>(user, 'select id from public.content_items order by id')
  return rows.map(row => row.id)
}

beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
  `)
  for (const migration of ['202609220001_initial.sql', '20260925005545_move_lesson_assets_to_supabase_storage.sql', '20260925013000_typed_school_signup.sql']) {
    let sql = await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8')
    // PGlite doesn't need pgcrypto for core PostgreSQL gen_random_uuid().
    sql = sql.replace('create extension if not exists pgcrypto;', '')
    await pg.exec(sql)
  }
  for (const [name, id] of Object.entries(ids)) {
    await pg.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,case when $3 then null else now() end,jsonb_build_object('full_name',$4::text))", [id, `${name.toLowerCase()}@example.test`, name === 'unverified', name])
  }
  await pg.query('insert into public.schools(id,name) values($1,$2),($3,$4)', [schoolA, 'School A', schoolB, 'School B'])
  const { rows: subjects } = await pg.query<{ id: string; board_id: string; grade_id: string }>('select s.* from public.subjects s join public.grades g on g.id=s.grade_id where g.number=6 limit 1')
  const subject = subjects[0]
  for (const name of ['student', 'impostor', 'child', 'unverified'] as const) {
    const assigned = name === 'child' ? (await pg.query<typeof subject>('select s.* from public.subjects s join public.grades g on g.id=s.grade_id where g.number=5 limit 1')).rows[0] : subject
    await pg.query("update public.profiles set role='student' where id=$1", [ids[name]])
    await pg.query("insert into public.student_profiles(user_id,school_id,board_id,grade_id,approval_status) values($1,$2,$3,$4,'approved')", [ids[name], schoolA, assigned.board_id, assigned.grade_id])
    await pg.query('insert into public.student_subjects values($1,$2)', [ids[name], assigned.id])
  }
  await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'approved')", [ids.parent, ids.child])
  await pg.query("update public.profiles set role='school_admin' where id in ($1,$2)", [ids.adminA, ids.adminB])
  await pg.query("update public.profiles set role='editor' where id=$1", [ids.editor])
  await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'school_admin'),($3,$4,'school_admin'),($5,$2,'editor')", [ids.adminA, schoolA, ids.adminB, schoolB, ids.editor])
  const chapter = (await pg.query<{ id: string }>("insert into public.chapters(subject_id,title) values($1,'Test chapter') returning id", [subject.id])).rows[0].id
  topic = (await pg.query<{ id: string }>("insert into public.topics(chapter_id,title) values($1,'Test topic') returning id", [chapter])).rows[0].id
  async function content(school: string | null, title: string, topicId = topic) {
    return (await pg.query<{ id: string }>("insert into public.content_items(topic_id,school_id,kind,title,status,author_id) values($1,$2,'lesson',$3,'published',$4) returning id", [topicId, school, title, ids.adminA])).rows[0].id
  }
  contentA = await content(schoolA, 'Private A'); contentB = await content(schoolB, 'Private B'); globalContent = await content(null, 'Global')
  const childSubject = (await pg.query<{ subject_id: string }>('select subject_id from public.student_subjects where student_id=$1', [ids.child])).rows[0].subject_id
  const childChapter = (await pg.query<{ id: string }>("insert into public.chapters(subject_id,title) values($1,'Child chapter') returning id", [childSubject])).rows[0].id
  const childTopic = (await pg.query<{ id: string }>("insert into public.topics(chapter_id,title) values($1,'Child topic') returning id", [childChapter])).rows[0].id
  childContent = await content(schoolA, 'Private child lesson', childTopic)
  await pg.query('insert into public.topic_progress(student_id,topic_id) values($1,$2)', [ids.student, topic])
  // Apply forward migration to a populated prior schema, not only an empty DB.
  await pg.exec(await readFile(new URL('../supabase/migrations/202610220001_verified_enrollment.sql', import.meta.url), 'utf8'))
}, 60000)
beforeEach(async () => { await pg.exec('begin') })
afterEach(async () => { await pg.exec('rollback') })
afterAll(async () => { await pg?.close() })

describe('verified institutional enrollment in PostgreSQL', () => {
  it('saves ordered practice hints with revision history and published enrollment access', async () => {
    const original = ['Find a **common denominator**.', 'Rewrite both fractions.']
    const revised = ['Rewrite both fractions.', 'Add the numerators.']
    const [{ id }] = await as<{ id: string }>(ids.editor,
      "insert into public.content_items(topic_id,school_id,kind,title,hints,answer_md,author_id) values($1,$2,'problem','Fractions',$3::jsonb,'Worked solution',$4) returning id",
      [topic, schoolA, JSON.stringify(original), ids.editor])
    await accept((await invite()).code)
    expect(await as(ids.student, 'select hints from public.content_items where id=$1', [id])).toEqual([])
    expect(await as(ids.adminB, 'update public.content_items set hints=$2::jsonb where id=$1 returning id', [id, '[]'])).toEqual([])
    await as(ids.editor, "update public.content_items set hints=$2::jsonb,status='published' where id=$1", [id, JSON.stringify(revised)])
    expect(await as(ids.student, 'select hints,answer_md from public.content_items where id=$1', [id])).toEqual([{ hints: revised, answer_md: 'Worked solution' }])
    expect(await as(ids.impostor, 'select hints from public.content_items where id=$1', [id])).toEqual([])
    expect(await as(ids.editor, "select snapshot->'hints' as hints from public.content_revisions where content_id=$1", [id])).toEqual([{ hints: original }])
    expect(await as(ids.student, 'update public.content_items set hints=$2::jsonb where id=$1 returning id', [id, '[]'])).toEqual([])
  })
  it('preserves accounts/progress/global content without trusting old school labels', async () => {
    expect(await visible()).toEqual([globalContent])
    expect(await visible(ids.impostor)).toEqual([globalContent])
    expect((await as(ids.student, 'select * from public.topic_progress')).length).toBe(1)
    expect((await pg.query('select * from public.school_enrollments')).rows).toEqual([])
  })
  it('grants only the invited school and assigned subjects, with single-use redemption', async () => {
    const invitation = await invite()
    await accept(invitation.code)
    expect(await visible()).toContain(contentA)
    expect(await visible()).not.toContain(contentB)
    expect(await visible(ids.impostor)).not.toContain(contentA)
    await expect(accept(invitation.code)).rejects.toThrow('unavailable or expired')
    await pg.query('delete from public.student_subjects where student_id=$1', [ids.student])
    expect(await visible()).not.toContain(contentA)
  })
  it('rejects mismatched emails and unverified accounts without consuming invitations', async () => {
    const invitation = await invite()
    await expect(accept(invitation.code, ids.impostor)).rejects.toThrow('does not match')
    await accept(invitation.code)
    const other = await invite('unverified@example.test')
    await expect(accept(other.code, ids.unverified)).rejects.toThrow('Verify your account email')
  })
  it('does not allow another school admin, editor or student to manage school A', async () => {
    for (const user of [ids.adminB, ids.editor, ids.student]) {
      await expect(invite('student@example.test', schoolA, user)).rejects.toThrow('administrator access')
      await expect(as(user, 'select public.school_enrollment_roster($1)', [schoolA])).rejects.toThrow('administrator access')
      await expect(as(user, 'select public.revoke_school_enrollment($1,$2)', [schoolA, ids.student])).rejects.toThrow('administrator access')
    }
  })
  it('keeps invite hashes and table writes unavailable to authenticated clients', async () => {
    await invite()
    await expect(as(ids.adminA, 'select token_hash from public.school_enrollment_invites')).rejects.toThrow('permission denied')
    await expect(as(ids.student, "insert into public.school_enrollments(school_id,student_id) values($1,$2)", [schoolA, ids.student])).rejects.toThrow('permission denied')
    const roster = await as<{ value: { invitations: Record<string, unknown>[] } }>(ids.adminA, 'select public.school_enrollment_roster($1) as value', [schoolA])
    expect(roster[0].value.invitations).toHaveLength(1)
    expect(roster[0].value.invitations[0]).not.toHaveProperty('token_hash')
  })
  it('invalidates replaced, cancelled and expired invitations', async () => {
    const first = await invite(); const replacement = await invite()
    await expect(accept(first.code)).rejects.toThrow('unavailable or expired')
    await as(ids.adminA, 'select public.cancel_enrollment_invite($1,$2)', [schoolA, replacement.id])
    await expect(accept(replacement.code)).rejects.toThrow('unavailable or expired')
    const expired = await invite()
    await pg.query("update public.school_enrollment_invites set expires_at=now()-interval '1 second' where id=$1", [expired.id])
    await expect(accept(expired.code)).rejects.toThrow('unavailable or expired')
  })
  it('revokes content, quiz and flashcard reads and prevents use of outstanding invites', async () => {
    const invitation = await invite(); await accept(invitation.code)
    await pg.query("insert into public.quizzes(topic_id,school_id,title,status) values($1,$2,'Quiz','published')", [topic, schoolA])
    await pg.query("insert into public.flashcards(topic_id,school_id,front,back,status) values($1,$2,'Front','Back','published')", [topic, schoolA])
    expect(await as(ids.student, 'select id from public.quizzes')).toHaveLength(1)
    const outstanding = await invite()
    await as(ids.adminA, 'select public.revoke_school_enrollment($1,$2)', [schoolA, ids.student])
    expect(await visible()).toEqual([globalContent])
    expect(await as(ids.student, 'select id from public.quizzes')).toEqual([])
    expect(await as(ids.student, 'select id from public.flashcards')).toEqual([])
    await expect(accept(outstanding.code)).rejects.toThrow('unavailable or expired')
    expect(await as(ids.student, 'select * from public.topic_progress')).toHaveLength(1)
    const renewed = await invite(); await accept(renewed.code)
    expect(await visible()).toContain(contentA)
    expect((await pg.query('select * from public.school_enrollments')).rows).toHaveLength(1)
  })
  it('requires an approved linked guardian for young learners and respects withdrawn consent', async () => {
    const invitation = await invite('child@example.test')
    await expect(accept(invitation.code, ids.child)).rejects.toThrow('guardian')
    await expect(accept(invitation.code, ids.child, ids.otherParent)).rejects.toThrow('linked child')
    await accept(invitation.code, ids.child, ids.parent)
    expect(await visible(ids.child)).toContain(childContent)
    expect(await visible(ids.child)).not.toContain(contentA)
    await pg.query("update public.student_profiles set approval_status='withdrawn' where user_id=$1", [ids.child])
    expect(await visible(ids.child)).toEqual([])
    const second = await invite('child@example.test')
    await expect(accept(second.code, ids.child, ids.parent)).rejects.toThrow('paused')
  })
  it('keeps institution roster access separate from private cross-institution learning history', async () => {
    await accept((await invite()).code)
    const roster = await as<{ value: { enrollments: unknown[] } }>(ids.adminA, 'select public.school_enrollment_roster($1) as value', [schoolA])
    expect(roster[0].value.enrollments).toHaveLength(1)
    expect(await as(ids.adminA, 'select * from public.topic_progress where student_id=$1', [ids.student])).toEqual([])
    expect(await as(ids.adminA, 'select * from public.student_profiles where user_id=$1', [ids.impostor])).toEqual([])
    expect(await as(ids.student, 'select * from public.school_enrollments where student_id=$1', [ids.child])).toEqual([])
  })
  it('blocks inactive schools and supports memberships independent of the signup label', async () => {
    const invitation = await invite('student@example.test', schoolB, ids.adminB)
    await accept(invitation.code)
    expect(await visible()).toContain(contentB)
    expect(await visible()).not.toContain(contentA)
    await pg.query('update public.schools set active=false where id=$1', [schoolB])
    expect(await visible()).not.toContain(contentB)
    await expect(invite('student@example.test', schoolB, ids.adminB)).rejects.toThrow('School unavailable')
  })
  it('preserves independent signup after upgrade without granting verified access', async () => {
    const newId = '00000000-0000-4000-8000-000000000010'
    await pg.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
      select $1,'new@example.test',now(),jsonb_build_object('account_type','student','full_name','New learner','school_name','School A',
        'board_id',s.board_id,'grade_id',s.grade_id,'subject_ids',jsonb_build_array(s.id))
      from public.subjects s join public.chapters c on c.subject_id=s.id join public.topics t on t.chapter_id=c.id where t.id=$2`, [newId, topic])
    expect(await visible(newId)).toEqual([globalContent])
    expect(await as(newId, 'select * from public.school_enrollments')).toEqual([])
    expect((await as(newId, 'select approval_status from public.student_profiles'))[0].approval_status).toBe('approved')
  })
  it('retains draft and quiz answer protection after verified enrollment', async () => {
    await accept((await invite()).code)
    const quiz = (await pg.query<{ id: string }>("insert into public.quizzes(topic_id,school_id,title,status) values($1,$2,'Quiz','published') returning id", [topic, schoolA])).rows[0].id
    await pg.query("insert into public.quiz_questions(quiz_id,prompt,options,correct_index) values($1,'Question',jsonb_build_array('A','B'),0)", [quiz])
    expect(await as(ids.student, 'select prompt,options from public.quiz_questions')).toHaveLength(1)
    await expect(as(ids.student, 'select correct_index from public.quiz_questions')).rejects.toThrow('permission denied')
    await pg.query("update public.content_items set status='draft' where id=$1", [contentA])
    expect(await visible()).not.toContain(contentA)
    expect(await visible(ids.editor)).toContain(contentA)
  })
  it('keeps anonymous users out of enrollment functions and data', async () => {
    await pg.exec('savepoint anon_check; set local role anon')
    await expect(pg.query('select public.school_enrollment_roster($1)', [schoolA])).rejects.toThrow('permission denied')
    await pg.exec('rollback to savepoint anon_check; release savepoint anon_check')
    await pg.exec('savepoint anon_check; set local role anon')
    await expect(pg.query('select * from public.school_enrollments')).rejects.toThrow('permission denied')
    await pg.exec('rollback to savepoint anon_check; release savepoint anon_check')
  })
  it('revokes staff access for just one school without deleting accounts or content', async () => {
    await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'editor')", [ids.editor, schoolB])
    expect(await visible(ids.editor)).toContain(contentA)
    expect(await visible(ids.editor)).toContain(contentB)
    await expect(as(ids.adminB, 'select public.revoke_school_staff($1,$2)', [schoolA, ids.editor])).rejects.toThrow('administrator access')
    await expect(as(ids.editor, 'select public.revoke_school_staff($1,$2)', [schoolA, ids.adminA])).rejects.toThrow('administrator access')
    await expect(as(ids.adminA, 'select public.revoke_school_staff($1,$2)', [schoolA, ids.adminA])).rejects.toThrow('another administrator')
    await as(ids.adminA, 'select public.revoke_school_staff($1,$2)', [schoolA, ids.editor])
    expect(await visible(ids.editor)).not.toContain(contentA)
    expect(await visible(ids.editor)).toContain(contentB)
    expect((await pg.query('select * from public.profiles where id=$1', [ids.editor])).rows).toHaveLength(1)
    await expect(as(ids.editor, "insert into public.content_items(topic_id,school_id,kind,title,status,author_id) values($1,$2,'lesson','Blocked','draft',$3)", [topic, schoolA, ids.editor])).rejects.toThrow('row-level security')
    await as(ids.adminA, 'select public.add_existing_school_staff($1,$2,$3)', [schoolA, 'editor@example.test', 'editor'])
    expect(await visible(ids.editor)).toContain(contentA)
  })
  it('requires school admin authority and an existing verified staff identity to grant staff access', async () => {
    for (const email of ['student@example.test', 'parent@example.test', 'unknown@example.test']) {
      await expect(as(ids.adminA, 'select public.add_existing_school_staff($1,$2,$3)', [schoolA, email, 'editor'])).rejects.toThrow('No verified staff account')
    }
    await expect(as(ids.adminB, 'select public.add_existing_school_staff($1,$2,$3)', [schoolA, 'editor@example.test', 'editor'])).rejects.toThrow('administrator access')
    await expect(as(ids.adminA, 'select public.add_existing_school_staff($1,$2,$3)', [schoolA, 'editor@example.test', 'platform_admin'])).rejects.toThrow('Invalid staff role')
    await expect(as(ids.adminA, 'select public.add_existing_school_staff($1,$2,$3)', [schoolA, 'editor@example.test', 'editor'])).rejects.toThrow('already has access')
    await as(ids.adminB, 'select public.add_existing_school_staff($1,$2,$3)', [schoolB, 'editor@example.test', 'school_admin'])
    expect((await pg.query('select role from public.memberships where school_id=$1 and user_id=$2', [schoolA, ids.editor])).rows[0].role).toBe('editor')
    expect((await pg.query('select role from public.profiles where id=$1', [ids.editor])).rows[0].role).toBe('school_admin')
    expect(await as(ids.editor, 'select public.school_enrollment_roster($1)', [schoolB])).toHaveLength(1)
    await expect(as(ids.editor, 'select public.school_enrollment_roster($1)', [schoolA])).rejects.toThrow('administrator access')
  })
})
