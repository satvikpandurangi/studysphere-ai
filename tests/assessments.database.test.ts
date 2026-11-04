import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let pg: PGlite
const teacher = '20000000-0000-4000-8000-000000000001'
const otherTeacher = '20000000-0000-4000-8000-000000000002'
const student = '20000000-0000-4000-8000-000000000003'
const otherStudent = '20000000-0000-4000-8000-000000000004'
const impostor = '20000000-0000-4000-8000-000000000005'
const parent = '20000000-0000-4000-8000-000000000006'
const platform = '20000000-0000-4000-8000-000000000007'
const school = '30000000-0000-4000-8000-000000000001'
const otherSchool = '30000000-0000-4000-8000-000000000002'
let topic: string; let legacyQuiz: string; let legacyCard: string
type RecordRow = { id: string; version: number; edit_version: number; status: string; series_id: string; published_at: string | null; questions: unknown[]; front?: string; back?: string }
const payload = (prompt = 'Two plus two?', correctIndex = 1) => ({ title: 'Numbers', questions: [{ prompt, options: ['3', '4'], correctIndex, explanation: 'Add two and two.' }] })

async function as<T = Record<string, unknown>>(actor: string, sql: string, args: unknown[] = []) {
  await pg.exec('savepoint assessment_case')
  try {
    await pg.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]); await pg.exec('set local role authenticated')
    const result = await pg.query<T>(sql, args)
    await pg.exec('reset role; release savepoint assessment_case'); return result.rows
  } catch (error) { await pg.exec('rollback to savepoint assessment_case; release savepoint assessment_case'); throw error }
}
async function rpc<T>(actor: string, sql: string, args: unknown[] = []) { return (await as<{ value: T }>(actor, `select ${sql} as value`, args))[0].value }
async function save(kind = 'quiz', data: object = payload(), record: RecordRow | null = null, actor = teacher, scope: string | null = school, publish = false) {
  return rpc<RecordRow>(actor, 'public.save_assessment($1,$2,$3,$4,$5,$6,$7)', [kind, topic, scope, JSON.stringify(data), record?.id ?? null, record?.edit_version ?? null, publish])
}
async function status(kind: string, record: RecordRow, publish: boolean, actor = teacher) {
  return rpc<RecordRow>(actor, 'public.set_assessment_status($1,$2,$3,$4)', [kind, record.id, record.edit_version, publish])
}
async function revise(kind: string, record: RecordRow) { return rpc<RecordRow>(teacher, 'public.copy_assessment_draft($1,$2,$3)', [kind, record.id, record.edit_version]) }
async function submit(record: RecordRow, answers: unknown[] = [1], actor = student) {
  return rpc<{ score: number; total: number; quizVersion: number; feedback: { prompt: string; correctIndex: number }[] }>(actor, 'public.submit_quiz($1,$2,$3)', [record.id, JSON.stringify(answers), record.version])
}

beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;`)
  for (const file of ['202609220001_initial.sql', '20260925005545_move_lesson_assets_to_supabase_storage.sql', '20260925013000_typed_school_signup.sql', '202610220001_verified_enrollment.sql']) {
    await pg.exec((await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')).replace('create extension if not exists pgcrypto;', ''))
  }
  for (const id of [teacher, otherTeacher, student, otherStudent, impostor, parent, platform]) {
    await pg.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, `${id}@example.test`])
  }
  await pg.query("update public.profiles set role='editor' where id in ($1,$2)", [teacher, otherTeacher])
  await pg.query("update public.profiles set role='student' where id in ($1,$2,$3)", [student, otherStudent, impostor])
  await pg.query("update public.profiles set role='platform_admin' where id=$1", [platform])
  await pg.query("insert into public.schools(id,name) values($1,'Assessment School A'),($2,'Assessment School B')", [school, otherSchool])
  await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'editor'),($3,$4,'editor')", [teacher, school, otherTeacher, otherSchool])
  const subject = (await pg.query<{ id: string; board_id: string; grade_id: string }>('select s.* from public.subjects s join public.grades g on g.id=s.grade_id where g.number=6 limit 1')).rows[0]
  for (const id of [student, otherStudent, impostor]) {
    await pg.query("insert into public.student_profiles(user_id,school_id,board_id,grade_id,approval_status) values($1,$2,$3,$4,'approved')", [id, school, subject.board_id, subject.grade_id])
    await pg.query('insert into public.student_subjects values($1,$2)', [id, subject.id])
  }
  await pg.query('insert into public.school_enrollments(school_id,student_id) values($1,$2),($3,$4)', [school, student, otherSchool, otherStudent])
  await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'approved')", [parent, student])
  const chapter = (await pg.query<{ id: string }>("insert into public.chapters(subject_id,title) values($1,'Numbers') returning id", [subject.id])).rows[0].id
  topic = (await pg.query<{ id: string }>("insert into public.topics(chapter_id,title) values($1,'Addition') returning id", [chapter])).rows[0].id
  legacyQuiz = (await pg.query<{ id: string }>("insert into public.quizzes(topic_id,school_id,title,status) values($1,$2,'Original quiz','published') returning id", [topic, school])).rows[0].id
  await pg.query("insert into public.quiz_questions(quiz_id,prompt,options,correct_index) values($1,'Original question',jsonb_build_array('A','B'),1)", [legacyQuiz])
  await pg.query("insert into public.quiz_attempts(student_id,quiz_id,answers,score) values($1,$2,'[1]'::jsonb,1)", [student, legacyQuiz])
  legacyCard = (await pg.query<{ id: string }>("insert into public.flashcards(topic_id,school_id,front,back,status) values($1,$2,'Original front','Original back','published') returning id", [topic, school])).rows[0].id
  await pg.query("insert into public.flashcard_reviews(student_id,flashcard_id,rating,due_at) values($1,$2,3,now()+interval '7 days')", [student, legacyCard])
  await pg.exec(await readFile(new URL('../supabase/migrations/202610220002_assessment_lifecycle.sql', import.meta.url), 'utf8'))
}, 60000)
beforeEach(async () => { await pg.exec('begin') })
afterEach(async () => { await pg.exec('rollback') })
afterAll(async () => { await pg?.close() })

describe('assessment editions, grading and tenant access in PostgreSQL', () => {
  it('upgrades old attempts/reviews without losing scores or inventing feedback', async () => {
    const rows = await as(student, 'select quiz_title,quiz_version,score,total,feedback from public.quiz_attempts')
    expect(rows).toEqual([{ quiz_title: 'Original quiz', quiz_version: 1, score: 1, total: 1, feedback: null }])
    expect(await as(student, 'select * from public.flashcard_reviews')).toHaveLength(1)
    expect((await pg.query('select published_at from public.quizzes where id=$1', [legacyQuiz])).rows[0].published_at).toBeTruthy()
  })
  it('creates/edits drafts and rejects stale saves without losing newer work', async () => {
    const first = await save(); const second = await save('quiz', payload('Updated prompt'), first)
    expect(second.id).toBe(first.id); expect(second.edit_version).toBe(first.edit_version + 1)
    await expect(save('quiz', payload('Stale prompt'), first)).rejects.toThrow('changed; reload')
    const detail = await rpc<RecordRow>(teacher, 'public.assessment_detail($1,$2)', ['quiz', first.id])
    expect(detail.questions).toEqual([expect.objectContaining({ prompt: 'Updated prompt' })])
    expect(await as(student, 'select id from public.quizzes where id=$1', [first.id])).toEqual([])
  })
  it('lists only the requested school/topic and protects authoring RPCs', async () => {
    await save()
    const list = await rpc<{ quizzes: unknown[] }>(teacher, 'public.assessment_list($1,$2)', [topic, school])
    expect(list.quizzes).toHaveLength(2)
    for (const actor of [otherTeacher, student, parent]) {
      await expect(rpc(actor, 'public.assessment_list($1,$2)', [topic, school])).rejects.toThrow('Staff access')
      await expect(rpc(actor, 'public.assessment_detail($1,$2)', ['quiz', legacyQuiz])).rejects.toThrow('unavailable')
      await expect(save('quiz', payload(), null, actor)).rejects.toThrow('Staff access')
    }
    await expect(save('quiz', payload(), null, teacher, null)).rejects.toThrow('Staff access')
    expect((await save('quiz', payload(), null, platform, null)).status).toBe('draft')
  })
  it('publishes complete quizzes for permitted learners without exposing answer columns', async () => {
    const draft = await save(); const published = await status('quiz', draft, true)
    expect(published.published_at).toBeTruthy()
    expect(await as(student, 'select id from public.quizzes where id=$1', [draft.id])).toHaveLength(1)
    for (const actor of [otherStudent, impostor]) expect(await as(actor, 'select id from public.quizzes where id=$1', [draft.id])).toEqual([])
    expect(await as(student, 'select prompt,options from public.quiz_questions where quiz_id=$1', [draft.id])).toHaveLength(1)
    for (const column of ['correct_index', 'explanation']) await expect(as(student, `select ${column} from public.quiz_questions where quiz_id=$1`, [draft.id])).rejects.toThrow('permission denied')
    expect((await submit(published)).score).toBe(1)
  })
  it('allows incomplete drafts, validates publication and rolls failures back atomically', async () => {
    const draft = await save('quiz', payload(''))
    await expect(status('quiz', draft, true)).rejects.toThrow('Complete every question')
    expect((await pg.query('select status,published_at from public.quizzes where id=$1', [draft.id])).rows[0]).toEqual({ status: 'draft', published_at: null })
    const before = (await pg.query('select count(*)::integer as count from public.quizzes')).rows[0].count
    await expect(save('quiz', payload(''), null, teacher, school, true)).rejects.toThrow('Complete every question')
    expect((await pg.query('select count(*)::integer as count from public.quizzes')).rows[0].count).toBe(before)
    const card = await save('flashcard', { front: 'Front', back: '' })
    await expect(status('flashcard', card, true)).rejects.toThrow('Complete both sides')
  })
  it('keeps prior questions/results immutable when a revised edition replaces publication', async () => {
    const original = await save('quiz', payload(), null, teacher, school, true)
    const result = await submit(original)
    expect(result.total).toBe(1); expect(result.feedback[0].prompt).toBe('Two plus two?')
    let revision = await revise('quiz', original)
    expect(revision.id).not.toBe(original.id); expect(revision.version).toBe(2)
    expect(await as(student, 'select id from public.quizzes where id=$1', [original.id])).toHaveLength(1)
    revision = await save('quiz', { ...payload('New question', 0), title: 'Revised title' }, revision)
    const published = await status('quiz', revision, true)
    expect(await as(student, 'select id from public.quizzes where id=$1', [original.id])).toEqual([])
    await expect(submit(original)).rejects.toThrow('Quiz unavailable')
    expect((await submit(published, [0])).score).toBe(1)
    const history = await as(student, 'select quiz_title,quiz_version,score,total,feedback from public.quiz_attempts where quiz_id=$1', [original.id])
    expect(history[0]).toMatchObject({ quiz_title: 'Numbers', quiz_version: 1, score: 1, total: 1, feedback: [expect.objectContaining({ prompt: 'Two plus two?', correctIndex: 1 })] })
    await expect(save('quiz', payload(), original)).rejects.toThrow('revised draft')
  })
  it('blocks privileged in-place changes to published content even after unpublishing', async () => {
    const quiz = await save('quiz', payload(), null, teacher, school, true)
    await status('quiz', quiz, false)
    for (const statement of ["update public.quizzes set title='Changed' where id=$1", "update public.quiz_questions set correct_index=0 where quiz_id=$1", 'delete from public.quiz_questions where quiz_id=$1']) {
      await pg.exec('savepoint privileged_case')
      await expect(pg.query(statement, [quiz.id])).rejects.toThrow(/revised draft|immutable/)
      await pg.exec('rollback to savepoint privileged_case; release savepoint privileged_case')
    }
  })
  it('validates every submitted answer and prevents forged scores or other-student reads', async () => {
    const quiz = await save('quiz', payload(), null, teacher, school, true)
    for (const answers of [[], [2], [-1], [0.5], ['1'], [null], [1, 1]]) await expect(submit(quiz, answers)).rejects.toThrow()
    await expect(submit(quiz, [1], otherStudent)).rejects.toThrow('Quiz unavailable')
    await expect(submit(quiz, [1], parent)).rejects.toThrow('Student account')
    await expect(submit({ ...quiz, version: 99 })).rejects.toThrow('edition changed')
    await expect(as(student, "insert into public.quiz_attempts(student_id,quiz_id,answers,score) values($1,$2,'[0]'::jsonb,99)", [student, quiz.id])).rejects.toThrow('permission denied')
    await submit(quiz)
    expect(await as(otherStudent, 'select * from public.quiz_attempts where student_id=$1', [student])).toEqual([])
    expect(await as(parent, 'select * from public.quiz_attempts where student_id=$1', [student])).toHaveLength(2)
  })
  it('denies grading after unpublication, enrollment revocation or account pause', async () => {
    let quiz = await save('quiz', payload(), null, teacher, school, true)
    quiz = await status('quiz', quiz, false); await expect(submit(quiz)).rejects.toThrow('unavailable')
    quiz = await status('quiz', quiz, true)
    await pg.query("update public.school_enrollments set status='revoked' where student_id=$1", [student])
    await expect(submit(quiz)).rejects.toThrow('unavailable')
    await pg.query("update public.school_enrollments set status='active' where student_id=$1", [student])
    await pg.query("update public.student_profiles set approval_status='withdrawn' where user_id=$1", [student])
    await expect(submit(quiz)).rejects.toThrow('unavailable')
  })
  it('preserves old card/review identity while revised cards become fresh reviews', async () => {
    const original = await rpc<RecordRow>(teacher, 'public.assessment_detail($1,$2)', ['flashcard', legacyCard])
    let revised = await revise('flashcard', original)
    revised = await save('flashcard', { front: 'Corrected front', back: 'Corrected back' }, revised)
    await status('flashcard', revised, true)
    expect(await as(student, 'select id from public.flashcards where id=$1', [legacyCard])).toEqual([])
    expect(await as(student, 'select front,back from public.flashcards where id=$1', [revised.id])).toEqual([{ front: 'Corrected front', back: 'Corrected back' }])
    expect(await as(student, 'select flashcard_id from public.flashcard_reviews')).toEqual([{ flashcard_id: legacyCard }])
    await expect(as(student, "update public.flashcard_reviews set rating=4 where flashcard_id=$1", [legacyCard])).rejects.toThrow('row-level security')
    await as(student, "insert into public.flashcard_reviews(student_id,flashcard_id,rating,due_at) values($1,$2,3,now()+interval '7 days')", [student, revised.id])
    expect(await as(student, 'select * from public.flashcard_reviews')).toHaveLength(2)
  })
  it('leaves the active edition published when a revised draft fails validation', async () => {
    const original = await save('quiz', payload(), null, teacher, school, true)
    let revised = await revise('quiz', original)
    revised = await save('quiz', payload(''), revised)
    await expect(status('quiz', revised, true)).rejects.toThrow('Complete every question')
    expect(await as(student, 'select id from public.quizzes where series_id=$1', [original.series_id])).toEqual([{ id: original.id }])
    expect((await submit(original)).score).toBe(1)
  })
  it('edits card drafts with conflict protection and denies anonymous authoring RPCs', async () => {
    const card = await save('flashcard', { front: 'Prompt', back: '' })
    const edited = await save('flashcard', { front: 'Edited prompt', back: 'Answer' }, card)
    await expect(status('flashcard', card, true)).rejects.toThrow('changed; reload')
    const published = await status('flashcard', edited, true)
    expect(published.id).toBe(card.id)
    expect(await as(otherStudent, 'select id from public.flashcards where id=$1', [card.id])).toEqual([])
    await pg.exec('savepoint anonymous_case; set local role anon')
    await expect(pg.query('select public.assessment_detail($1,$2)', ['flashcard', card.id])).rejects.toThrow('permission denied')
    await pg.exec('rollback to savepoint anonymous_case; release savepoint anonymous_case')
  })
})
