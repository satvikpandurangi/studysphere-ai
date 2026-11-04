// Bounded one-school rehearsal. Uses existing synthetic identities only.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'

const base = '.local/pilot-auth'
const report = { startedAt: new Date().toISOString(), checks: [], capacityProven: false, uploadsChanged: false }
async function ok(operation) { const r = await operation; if (r.error) throw Object.assign(new Error('Provider operation failed'), { code: r.error.code ?? r.error.status }); return r.data }
async function check(name, fn) { await fn(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`) }
try {
  assert.ok(process.argv.includes('--execute'))
  loadEnvFile('.env.staging.local'); loadEnvFile(`${base}/operator.env`)
  assert.equal(process.env.TEST_SUPABASE_URL, 'https://flsckscpvqqyyqvsyjwp.supabase.co')
  const f = JSON.parse(await readFile(`${base}/fixtures-private.json`, 'utf8'))
  assert.equal(f.singleSchoolOnly, true)
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } }
  async function login(name) {
    const row = f.accounts[name]; assert.ok(!row.retired); assert.equal(row.email, `ss-pilot-${f.run}-${name.toLowerCase()}@example.test`)
    const db = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_PUBLISHABLE_KEY, options)
    const auth = await ok(db.auth.signInWithPassword({ email: row.email, password: row.password })); assert.equal(auth.user.id, row.id)
    return { id: row.id, db, token: auth.session.access_token }
  }
  const teacher = await login('teacherA'), student = await login('studentA'), parent = await login('parent'), child = await login('child')
  const school = f.schools.A.id, topic = f.records.topic
  const run = randomUUID().slice(0, 8)
  const state = { run, createdIds: [] }
  const save = () => writeFile(`${base}/school-journey-${run}.json`, JSON.stringify(state, null, 2) + '\n')
  await save()
  const rpc = (actor, name, args = {}) => ok(actor.db.rpc(name, args))
  const hidden = async (actor, table, id) => assert.deepEqual(await ok(actor.db.from(table).select('id').eq('id', id)), [])
  const worker = async (actor, path, data) => {
    const response = await fetch(`https://studysphere-api.satvikjee2526.workers.dev${path}`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { Origin: 'https://studysphere-app.satvikjee2526.workers.dev', Authorization: `Bearer ${actor.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    assert.equal(response.status, 200); return response.json()
  }
  await check('student and teacher receive the same single verified school identity', async () => {
    for (const actor of [teacher, student, child]) { const rows = await rpc(actor, 'institution_workspaces'); assert.equal(rows.length, 1); assert.equal(rows[0].id, school) }
  })
  let lesson, quiz, card, attempt
  await check('teacher publishes a lesson after the learner is denied its draft', async () => {
    lesson = await ok(teacher.db.from('content_items').insert({ topic_id: topic, school_id: school, author_id: teacher.id, kind: 'note', title: `Synthetic journey ${run}`, body_md: 'Two pairs contain four objects.', status: 'draft' }).select('id').single())
    state.createdIds.push(lesson.id); await save(); await hidden(student, 'content_items', lesson.id)
    await ok(teacher.db.from('content_items').update({ status: 'published' }).eq('id', lesson.id))
    assert.equal((await ok(student.db.from('content_items').select('body_md').eq('id', lesson.id).single())).body_md, 'Two pairs contain four objects.')
  })
  await check('teacher publishes a quiz while learner answer keys remain denied', async () => {
    quiz = await rpc(teacher, 'save_assessment', { assessment_kind: 'quiz', target_topic: topic, target_school: school, assessment_data: { title: `Synthetic journey ${run}`, questions: [{ prompt: 'Two pairs contain how many objects?', options: ['Three', 'Four'], correctIndex: 1, explanation: 'Two plus two equals four.' }] } })
    state.createdIds.push(quiz.id); await save(); await hidden(student, 'quizzes', quiz.id)
    quiz = await rpc(teacher, 'set_assessment_status', { assessment_kind: 'quiz', assessment_id: quiz.id, expected_edit: quiz.edit_version, publish: true })
    assert.equal((await ok(student.db.from('quiz_questions').select('id,prompt,options').eq('quiz_id', quiz.id))).length, 1)
    assert.ok((await student.db.from('quiz_questions').select('correct_index').eq('quiz_id', quiz.id)).error)
  })
  await check('real Worker grading persists the learner attempt and feedback', async () => {
    const result = await worker(student, '/quiz/grade', { studentId: student.id, quizId: quiz.id, version: quiz.version, answers: [1] })
    assert.equal(result.score, 1); attempt = await ok(student.db.from('quiz_attempts').select('id,score,total,quiz_title,quiz_version,feedback').eq('id', result.attemptId).single())
    assert.equal(attempt.total, 1); state.createdIds.push(attempt.id); await save()
  })
  await check('a teacher revision preserves the previously saved result', async () => {
    let revised = await rpc(teacher, 'copy_assessment_draft', { assessment_kind: 'quiz', assessment_id: quiz.id, expected_edit: quiz.edit_version })
    revised = await rpc(teacher, 'save_assessment', { assessment_kind: 'quiz', target_topic: topic, target_school: school, assessment_id: revised.id, expected_edit: revised.edit_version, assessment_data: { title: `Synthetic revised journey ${run}`, questions: [{ prompt: 'Two groups of three contain?', options: ['Six', 'Seven'], correctIndex: 0, explanation: 'Three plus three equals six.' }] } })
    state.createdIds.push(revised.id); await save()
    await rpc(teacher, 'set_assessment_status', { assessment_kind: 'quiz', assessment_id: revised.id, expected_edit: revised.edit_version, publish: true })
    assert.deepEqual(await ok(student.db.from('quiz_attempts').select('id,score,total,quiz_title,quiz_version,feedback').eq('id', attempt.id).single()), attempt)
  })
  await check('published flashcard and learner review persist', async () => {
    card = await rpc(teacher, 'save_assessment', { assessment_kind: 'flashcard', target_topic: topic, target_school: school, assessment_data: { front: `Synthetic journey ${run}: two pairs?`, back: 'Four.' } })
    state.createdIds.push(card.id); await save(); await hidden(student, 'flashcards', card.id)
    card = await rpc(teacher, 'set_assessment_status', { assessment_kind: 'flashcard', assessment_id: card.id, expected_edit: card.edit_version, publish: true })
    assert.equal((await ok(student.db.from('flashcards').select('back').eq('id', card.id).single())).back, 'Four.')
    await ok(student.db.from('flashcard_reviews').insert({ student_id: student.id, flashcard_id: card.id, rating: 3, due_at: new Date(Date.now() + 86400000).toISOString() }))
    assert.equal((await ok(student.db.from('flashcard_reviews').select('rating').eq('student_id', student.id).eq('flashcard_id', card.id).single())).rating, 3)
  })
  await check('guardian sees permitted child progress while unrelated older history stays private', async () => {
    const linked = await ok(parent.db.from('parent_children_overview').select('student_id,grade_number').eq('student_id', child.id).single()); assert.ok(linked.grade_number <= 5)
    assert.ok((await ok(parent.db.from('topic_progress').select('topic_id').eq('student_id', child.id))).length)
    assert.deepEqual(await ok(parent.db.from('quiz_attempts').select('id').eq('student_id', student.id)), [])
    assert.deepEqual(await ok(teacher.db.from('quiz_attempts').select('id').eq('student_id', student.id)), [])
  })
  report.complete = true
} catch (error) { report.error = error.code ?? 'assertion_or_provider_failure'; process.exitCode = 1 }
report.completedAt = new Date().toISOString()
await writeFile(`${base}/school-journey-report.json`, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report))
