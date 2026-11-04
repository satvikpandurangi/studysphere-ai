// Mutating, operator-only rehearsal. Never imported by the application or npm test.
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { listStorageObjects, compareInventory } from './storage-inventory.mjs'

const project = 'flsckscpvqqyyqvsyjwp'
const api = 'https://studysphere-api.satvikjee2526.workers.dev'
const origin = 'https://studysphere-app.satvikjee2526.workers.dev'
const directory = '.local/pilot-auth'
const statePath = `${directory}/fixtures-private.json`
const reportPath = `${directory}/workflow-report.json`
let state, report

async function main() {
  if (!process.argv.includes('--execute')) throw new Error('Use --execute only for the owner-authorized synthetic pilot rehearsal.')
  loadEnvFile('.env.staging.local')
  loadEnvFile(`${directory}/operator.env`)
  const url = process.env.TEST_SUPABASE_URL, key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY
  assert.equal(url, `https://${project}.supabase.co`, 'Wrong pilot project')
  assert.ok(process.env.SUPABASE_SECRET_KEY, 'Missing local operator credential')
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } }
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options)
  const browser = () => createClient(url, key, options)
  await mkdir(directory, { recursive: true })
  try { state = JSON.parse(await readFile(statePath, 'utf8')) } catch (e) {
    if (e.code !== 'ENOENT') throw e
    state = { project, run: randomUUID().slice(0, 8), accounts: {}, schools: {}, records: {} }
  }
  assert.equal(state.project, project)
  // The owner subsequently selected one active school. Do not silently recreate
  // or restore the retired isolation fixture when rerunning historical tests.
  if (state.singleSchoolOnly) throw new Error('The second school fixture is retired. Use the recorded evidence; this two-school rehearsal is no longer authorized.')
  report = { startedAt: new Date().toISOString(), project, run: state.run, checks: [], pending: ['Actual invitation/recovery email delivery and reset-link browser journey', 'Private PDF upload/read/revocation after inventory approval', 'Real-device/manual UX and full recovery', '1500-concurrent-user capacity'], launchDecision: 'not_approved' }
  const save = () => writeFile(statePath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
  const evidence = () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
  async function check(name, fn) {
    const start = performance.now()
    try { await fn(); report.checks.push({ name, status: 'passed', milliseconds: Math.round(performance.now() - start) }) }
    catch (e) { report.checks.push({ name, status: 'failed', code: e.code ?? e.status ?? 'assertion_or_provider_failure' }); await evidence(); throw new Error(`Pilot check failed: ${name}`) }
    await evidence()
    console.log(`PASS ${name}`)
  }
  async function ok(operation) { const r = await operation; if (r.error) throw Object.assign(new Error('Provider operation failed'), { code: r.error.code ?? r.error.status }); return r.data }
  const rpc = (db, name, args = {}) => ok(db.rpc(name, args))
  async function denied(operation, code) { const r = await operation; assert.ok(r.error, 'Expected a permission failure'); if (code) assert.equal(r.error.code, code) }
  async function hidden(db, table, id) { assert.deepEqual(await ok(db.from(table).select('id').eq('id', id)), []) }
  async function worker(account, path, data, method = 'POST') {
    const r = await fetch(api + path, { method, signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${account.token}`, Origin: origin, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: data === undefined ? undefined : JSON.stringify(data) })
    const body = await r.json()
    if (!r.ok) throw Object.assign(new Error('Worker operation failed'), { status: r.status, code: body.error?.includes('quota') ? 'quota' : r.status })
    return body
  }
  async function account(name, role, metadata = {}) {
    let item = state.accounts[name]
    if (!item) { item = state.accounts[name] = { email: `ss-pilot-${state.run}-${name.toLowerCase()}@example.test`, password: randomBytes(24).toString('base64url') + '!aA2' }; await save() }
    if (!item.id) {
      const created = await ok(admin.auth.admin.createUser({ email: item.email, password: item.password, email_confirm: true, user_metadata: { full_name: `Synthetic pilot ${name}`, pilot_run: state.run, ...metadata } }))
      item.id = created.user.id; await save()
      // Only these newly recorded synthetic IDs are ever granted bootstrap roles.
      if (role !== 'student' && role !== 'parent') await ok(admin.from('profiles').update({ role }).eq('id', item.id))
    }
    const db = browser(), signed = await ok(db.auth.signInWithPassword({ email: item.email, password: item.password }))
    assert.equal(signed.user.id, item.id)
    assert.ok(signed.user.email_confirmed_at)
    item.token = signed.session.access_token; await save()
    const profile = await ok(db.from('profiles').select('role').eq('id', item.id).single())
    assert.equal(profile.role, role)
    return { ...item, db }
  }
  const catalog = await ok(admin.from('subjects').select('id,board_id,grade_id,name,boards(code),grades(number)'))
  const subject = catalog.find(s => s.grades.number === 6 && s.boards.code === 'CBSE')
  const childSubject = catalog.find(s => s.grades.number === 5 && s.boards.code === 'CBSE')
  assert.ok(subject && childSubject, 'CBSE synthetic curriculum fixtures unavailable')
  const actors = {}
  await check('synthetic platform administrator signs in', async () => { actors.platform = await account('platform', 'platform_admin') })
  for (const school of ['A', 'B']) {
    await check(`school ${school} administrator and teacher sign in`, async () => {
      if (!state.schools[school]) { const row = await ok(admin.from('schools').insert({ name: `Synthetic Pilot ${state.run} School ${school}` }).select('id,name').single()); state.schools[school] = row; await save() }
      actors[`admin${school}`] = await account(`admin${school}`, 'school_admin')
      actors[`teacher${school}`] = await account(`teacher${school}`, 'editor')
      for (const kind of ['admin', 'teacher']) {
        const actor = actors[`${kind}${school}`]
        await ok(admin.from('memberships').upsert({ user_id: actor.id, school_id: state.schools[school].id, role: kind === 'admin' ? 'school_admin' : 'editor' }, { onConflict: 'user_id,school_id' }))
      }
    })
    await check(`school ${school} independent student signs in without inferred enrollment`, async () => {
      actors[`student${school}`] = await account(`student${school}`, 'student', { account_type: 'student', school_name: state.schools[school].name, board_id: subject.board_id, grade_id: subject.grade_id, subject_ids: [subject.id] })
    })
  }
  await check('synthetic guardian signs in', async () => { actors.parent = await account('parent', 'parent') })
  const { platform, adminA, adminB, teacherA, teacherB, studentA, studentB, parent } = actors
  const schoolA = state.schools.A.id, schoolB = state.schools.B.id
  async function topicFor(name, selected) {
    if (!state.records[name]) {
      if (!state.records[`${name}Chapter`]) {
        const chapter = await worker(platform, '/catalog/chapter', { subjectId: selected.id, title: `Synthetic pilot ${state.run}` })
        state.records[`${name}Chapter`] = chapter.id; await save()
      }
      const topic = await worker(platform, '/catalog/topic', { chapterId: state.records[`${name}Chapter`], title: `Synthetic acceptance ${state.run}` })
      state.records[name] = topic.id; await save()
    }
    return state.records[name]
  }
  const topic = await topicFor('topic', subject), childTopic = await topicFor('childTopic', childSubject)
  async function lessonFor(name, staff, school, targetTopic = topic, status = 'published') {
    if (!state.records[name]) {
      const row = await ok(staff.db.from('content_items').insert({ topic_id: targetTopic, school_id: school, kind: 'lesson', title: `Synthetic ${name} ${state.run}`, body_md: `Pilot ${state.run}: two plus two is four.`, status, author_id: staff.id }).select('id').single())
      state.records[name] = row.id; await save()
    }
    return state.records[name]
  }
  const lessonA = await lessonFor('lessonA', teacherA, schoolA), lessonB = await lessonFor('lessonB', teacherB, schoolB)
  const draftA = await lessonFor('draftA', teacherA, schoolA, topic, 'draft'), draftB = await lessonFor('draftB', teacherB, schoolB, topic, 'draft')
  await check('typed school labels do not grant private lesson access', async () => {
    // This gate is intentionally before the initial enrollment; reruns revoke first.
    for (const [actor, administrator, school, lesson] of [[studentA, adminA, schoolA, lessonA], [studentB, adminB, schoolB, lessonB]]) {
      const enrolled = await ok(actor.db.from('school_enrollments').select('status').eq('school_id', school).eq('student_id', actor.id).maybeSingle())
      if (enrolled?.status === 'active') await rpc(administrator.db, 'revoke_school_enrollment', { target_school: school, target_student: actor.id })
      await hidden(actor.db, 'content_items', lesson)
    }
  })
  async function enroll(administrator, school, actor, accepting = actor) {
    const invite = await rpc(administrator.db, 'create_enrollment_invite', { target_school: school, student_email: actor.email })
    return { invite, accepted: await rpc(accepting.db, 'accept_enrollment_invite', { invite_code: invite.code, target_student: actor.id }) }
  }
  await check('wrong student cannot consume an email-bound invitation', async () => {
    const invite = await rpc(adminA.db, 'create_enrollment_invite', { target_school: schoolA, student_email: studentA.email })
    await denied(studentB.db.rpc('accept_enrollment_invite', { invite_code: invite.code, target_student: studentB.id }))
    await rpc(studentA.db, 'accept_enrollment_invite', { invite_code: invite.code, target_student: studentA.id })
    await denied(studentA.db.rpc('accept_enrollment_invite', { invite_code: invite.code, target_student: studentA.id }))
  })
  await check('second school enrollment and permitted reads work', async () => {
    await enroll(adminB, schoolB, studentB)
    for (const [actor, id] of [[studentA, lessonA], [studentB, lessonB]]) assert.equal((await ok(actor.db.from('content_items').select('id').eq('id', id).single())).id, id)
  })
  await check('school lessons, drafts and authoring RPCs remain isolated', async () => {
    for (const [actor, id] of [[studentA, lessonB], [studentB, lessonA], [teacherA, draftB], [teacherB, draftA], [studentA, draftA], [studentB, draftB]]) await hidden(actor.db, 'content_items', id)
    await denied(teacherA.db.rpc('assessment_list', { target_topic: topic, target_school: schoolB }))
    await denied(adminA.db.rpc('school_enrollment_roster', { target_school: schoolB }))
  })
  await check('lesson edit and unpublish affect new learner reads', async () => {
    await ok(teacherA.db.from('content_items').update({ status: 'draft', body_md: 'Synthetic revised approved lesson.' }).eq('id', lessonA))
    await hidden(studentA.db, 'content_items', lessonA)
    await ok(teacherA.db.from('content_items').update({ status: 'published' }).eq('id', lessonA))
    assert.equal((await ok(studentA.db.from('content_items').select('body_md').eq('id', lessonA).single())).body_md, 'Synthetic revised approved lesson.')
  })
  await check('each student persists progress, a plan and a map through its own session', async () => {
    for (const actor of [studentA, studentB]) {
      await ok(actor.db.from('topic_progress').upsert({ student_id: actor.id, topic_id: topic }, { onConflict: 'student_id,topic_id' }))
      const plans = await ok(actor.db.from('plan_items').select('id').eq('student_id', actor.id).eq('title', `Synthetic pilot ${state.run}`))
      if (!plans.length) await ok(actor.db.from('plan_items').insert({ student_id: actor.id, subject_id: subject.id, title: `Synthetic pilot ${state.run}`, due_date: new Date().toISOString().slice(0, 10) }))
      await ok(actor.db.from('mind_maps').upsert({ student_id: actor.id, topic_id: null, graph: { nodes: [], edges: [] } }, { onConflict: 'student_id,topic_id' }))
    }
  })
  const assessment = async (kind, staff, school, data, record = null) => rpc(staff.db, 'save_assessment', { assessment_kind: kind, target_topic: topic, target_school: school, assessment_data: data, assessment_id: record?.id ?? null, expected_edit: record?.edit_version ?? null })
  const publish = (kind, staff, record, value = true) => rpc(staff.db, 'set_assessment_status', { assessment_kind: kind, assessment_id: record.id, expected_edit: record.edit_version, publish: value })
  let quiz, card, result, oldAttempt
  await check('teacher creates and edits quiz draft before publishing', async () => {
    quiz = await assessment('quiz', teacherA, schoolA, { title: `Synthetic quiz ${state.run}`, questions: [{ prompt: '2 + 2?', options: ['3', '4'], correctIndex: 1, explanation: 'Two pairs make four.' }] })
    await hidden(studentA.db, 'quizzes', quiz.id)
    quiz = await assessment('quiz', teacherA, schoolA, { title: `Synthetic edited quiz ${state.run}`, questions: [{ prompt: '2 + 2 equals?', options: ['3', '4'], correctIndex: 1, explanation: 'Two pairs make four.' }] }, quiz)
    quiz = await publish('quiz', teacherA, quiz)
    state.records.quiz = quiz.id; await save()
  })
  await check('students can read allowed questions but cannot retrieve answer keys', async () => {
    assert.equal((await ok(studentA.db.from('quiz_questions').select('id,prompt,options').eq('quiz_id', quiz.id))).length, 1)
    for (const col of ['correct_index', 'explanation']) await denied(studentA.db.from('quiz_questions').select(col).eq('quiz_id', quiz.id), '42501')
    await hidden(studentB.db, 'quizzes', quiz.id)
    await denied(studentA.db.rpc('assessment_detail', { assessment_kind: 'quiz', assessment_id: quiz.id }))
  })
  await check('deployed Worker grades the authenticated caller and saves feedback', async () => {
    result = await worker(studentA, '/quiz/grade', { studentId: studentA.id, quizId: quiz.id, version: quiz.version, answers: [1] })
    assert.equal(result.score, 1); assert.equal(result.total, 1); assert.equal(result.feedback[0].correctIndex, 1)
    oldAttempt = await ok(studentA.db.from('quiz_attempts').select('id,score,quiz_title,quiz_version,total,feedback').eq('id', result.attemptId).single())
  })
  await check('published questions reject mutation and revised answers preserve history', async () => {
    const question = (await ok(studentA.db.from('quiz_questions').select('id').eq('quiz_id', quiz.id)))[0]
    await denied(teacherA.db.from('quiz_questions').update({ correct_index: 0 }).eq('id', question.id))
    let revised = await rpc(teacherA.db, 'copy_assessment_draft', { assessment_kind: 'quiz', assessment_id: quiz.id, expected_edit: quiz.edit_version })
    revised = await assessment('quiz', teacherA, schoolA, { title: `Synthetic revision ${state.run}`, questions: [{ prompt: '3 + 3 equals?', options: ['6', '7'], correctIndex: 0, explanation: 'Two threes make six.' }] }, revised)
    revised = await publish('quiz', teacherA, revised)
    assert.deepEqual(await ok(studentA.db.from('quiz_attempts').select('id,score,quiz_title,quiz_version,total,feedback').eq('id', result.attemptId).single()), oldAttempt)
    await hidden(studentA.db, 'quizzes', quiz.id)
    quiz = revised; state.records.quiz = quiz.id; await save()
  })
  await check('quiz unpublish hides questions and republish restores permitted access', async () => {
    quiz = await publish('quiz', teacherA, quiz, false)
    await hidden(studentA.db, 'quizzes', quiz.id)
    assert.deepEqual(await ok(studentA.db.from('quiz_questions').select('id').eq('quiz_id', quiz.id)), [])
    quiz = await publish('quiz', teacherA, quiz)
  })
  await check('flashcard editing, publishing and learner review persist', async () => {
    card = await assessment('flashcard', teacherA, schoolA, { front: 'Synthetic pair of pairs?', back: 'Four.' })
    await hidden(studentA.db, 'flashcards', card.id)
    card = await assessment('flashcard', teacherA, schoolA, { front: 'Synthetic 2 + 2?', back: 'Four.' }, card)
    card = await publish('flashcard', teacherA, card)
    assert.equal((await ok(studentA.db.from('flashcards').select('back').eq('id', card.id).single())).back, 'Four.')
    await ok(studentA.db.from('flashcard_reviews').upsert({ student_id: studentA.id, flashcard_id: card.id, rating: 3, due_at: new Date(Date.now() + 86400000).toISOString() }, { onConflict: 'student_id,flashcard_id' }))
    const review = await ok(studentA.db.from('flashcard_reviews').select('*').eq('student_id', studentA.id).eq('flashcard_id', card.id).single())
    let revised = await rpc(teacherA.db, 'copy_assessment_draft', { assessment_kind: 'flashcard', assessment_id: card.id, expected_edit: card.edit_version })
    revised = await assessment('flashcard', teacherA, schoolA, { front: 'Synthetic 3 + 3?', back: 'Six.' }, revised)
    await publish('flashcard', teacherA, revised)
    assert.deepEqual(await ok(studentA.db.from('flashcard_reviews').select('*').eq('student_id', studentA.id).eq('flashcard_id', card.id).single()), review)
    await hidden(studentB.db, 'flashcards', revised.id)
  })
  await check('revocation blocks new private reads with an already-issued student token', async () => {
    const originalToken = studentA.token
    await rpc(adminA.db, 'revoke_school_enrollment', { target_school: schoolA, target_student: studentA.id })
    await hidden(studentA.db, 'content_items', lessonA); await hidden(studentA.db, 'quizzes', quiz.id)
    await denied(studentA.db.rpc('submit_quiz', { target_quiz: quiz.id, submitted_answers: [0], expected_version: quiz.version }))
    assert.equal(studentA.token, originalToken)
    assert.deepEqual(await ok(studentA.db.from('quiz_attempts').select('id,score,quiz_title,quiz_version,total,feedback').eq('id', result.attemptId).single()), oldAttempt)
    const search = await rpc(studentA.db, 'search_lessons', { query: 'Synthetic', max_results: 20 })
    assert.ok(!search.some(row => row.content_id === lessonA))
    await enroll(adminA, schoolA, studentA)
    assert.equal((await ok(studentA.db.from('content_items').select('id').eq('id', lessonA).single())).id, lessonA)
  })
  await check('staff removal revokes only its school and restoration uses verified existing account', async () => {
    await rpc(adminA.db, 'revoke_school_staff', { target_school: schoolA, target_user: teacherA.id })
    await hidden(teacherA.db, 'content_items', draftA)
    await denied(teacherA.db.rpc('assessment_list', { target_topic: topic, target_school: schoolA }))
    await rpc(adminA.db, 'add_existing_school_staff', { target_school: schoolA, staff_email: teacherA.email, staff_role: 'editor' })
    assert.equal((await ok(teacherA.db.from('content_items').select('id').eq('id', draftA).single())).id, draftA)
  })
  let child
  await check('deployed Worker provisions a guardian-managed Standard 5 child', async () => {
    if (!state.accounts.child) { state.accounts.child = { email: `ss-pilot-${state.run}-child@example.test`, password: randomBytes(24).toString('base64url') + '!aA2' }; await save() }
    const item = state.accounts.child
    if (!item.id) { const created = await worker(parent, '/students/create', { name: 'Synthetic pilot child', email: item.email, password: item.password, schoolName: state.schools.A.name, boardId: childSubject.board_id, gradeId: childSubject.grade_id, subjectIds: [childSubject.id], guardianConsent: true }); item.id = created.studentId; await save() }
    child = await account('child', 'student')
    await enroll(adminA, schoolA, child, parent)
  })
  const childLesson = await lessonFor('childLesson', teacherA, schoolA, childTopic)
  await check('guardian withdrawal, stale decisions and restoration preserve history', async () => {
    await ok(child.db.from('topic_progress').upsert({ student_id: child.id, topic_id: childTopic }, { onConflict: 'student_id,topic_id' }))
    const profile = await ok(parent.db.from('student_profiles').select('consent_version').eq('user_id', child.id).single())
    const withdrawn = await worker(parent, '/students/consent', { studentId: child.id, status: 'withdrawn', expectedVersion: profile.consent_version })
    await hidden(child.db, 'content_items', childLesson)
    await denied(parent.db.rpc('change_guardian_consent', { target_student: child.id, new_status: 'approved', expected_version: profile.consent_version }))
    await worker(parent, '/students/consent', { studentId: child.id, status: 'approved', expectedVersion: withdrawn.consentVersion })
    assert.equal((await ok(child.db.from('content_items').select('id').eq('id', childLesson).single())).id, childLesson)
    assert.equal((await ok(child.db.from('topic_progress').select('topic_id').eq('student_id', child.id).eq('topic_id', childTopic))).length, 1)
  })
  await check('synthetic recovery token is single-use and password change permits sign-in', async () => {
    const link = await ok(admin.auth.admin.generateLink({ type: 'recovery', email: studentB.email, options: { redirectTo: `${origin}/reset-password` } }))
    const recoveryClient = browser()
    const recovered = await ok(recoveryClient.auth.verifyOtp({ type: 'recovery', token_hash: link.properties.hashed_token }))
    assert.equal(recovered.user.id, studentB.id)
    const nextPassword = randomBytes(24).toString('base64url') + '!aA2'
    await ok(recoveryClient.auth.updateUser({ password: nextPassword }))
    state.accounts.studentB.password = nextPassword; await save()
    await denied(browser().auth.verifyOtp({ type: 'recovery', token_hash: link.properties.hashed_token }))
    actors.studentB = await account('studentB', 'student')
  })
  await check('private PDF provider inventory is complete while uploads remain paused', async () => {
    const snapshot = await rpc(admin, 'pdf_asset_inventory')
    const objects = await listStorageObjects(admin.storage.from(snapshot.policy.bucket))
    const ending = await rpc(admin, 'pdf_storage_state')
    const comparison = compareInventory(snapshot, objects, ending)
    await writeFile(`${directory}/pdf-inventory.json`, JSON.stringify({ observedAt: new Date().toISOString(), comparison, snapshot, objects }, null, 2) + '\n')
    assert.ok(comparison.stableLedger && comparison.uploadsPaused)
    for (const key of ['unknownSizes', 'missingReferenced', 'untracked', 'sizeMismatches', 'absentLedgerObjects']) assert.equal(comparison[key].length, 0)
    assert.equal(comparison.reservedUploads, 0)
    const limits = await worker(teacherA, '/assets/limits', undefined, 'GET')
    assert.equal(limits.uploadsPaused, true)
  })
  await check('authenticated platform monitoring and school-scoped roster respond', async () => {
    await worker(platform, '/pilot/usage', undefined, 'GET')
    const roster = await rpc(adminA.db, 'school_enrollment_roster', { target_school: schoolA })
    assert.ok(roster.enrollments.some(row => row.student_id === studentA.id || row.studentId === studentA.id))
  })
  // Export only caller tokens/fixture IDs to the existing ignored read-only suite config.
  const replacements = { TEST_STUDENT_A_JWT: state.accounts.studentA.token, TEST_STUDENT_B_JWT: state.accounts.studentB.token, TEST_STUDENT_B_ID: studentB.id, TEST_SCHOOL_A_EDITOR_JWT: state.accounts.teacherA.token, TEST_SCHOOL_B_EDITOR_JWT: state.accounts.teacherB.token, TEST_SCHOOL_A_DRAFT_ID: draftA, TEST_SCHOOL_B_DRAFT_ID: draftB }
  let environment = await readFile('.env.staging.local', 'utf8')
  for (const [name, value] of Object.entries(replacements)) {
    const expression = new RegExp(`^${name}=.*$`, 'm')
    environment = expression.test(environment) ? environment.replace(expression, `${name}=${value}`) : environment + `\n${name}=${value}\n`
  }
  await writeFile('.env.staging.local', environment, { mode: 0o600 })
  report.completedAt = new Date().toISOString(); report.status = 'workflow_checks_passed_with_pending_gates'; await evidence()
  console.log(`${report.checks.length} authenticated checks passed; remaining gates are recorded. No production readiness or capacity claim.`)
}

main().catch(async (error) => {
  if (report) { report.completedAt = new Date().toISOString(); report.status = 'failed'; report.failure = { code: error.code ?? 'operator_or_setup_failure', location: error.stack?.split('\n').filter(line => line.includes('pilot-authenticated.mjs')).slice(0, 3) }; await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n') }
  // Never dump provider responses, credentials or assertion values to the console.
  console.error('Authenticated rehearsal stopped. Inspect the ignored workflow report; no cleanup or retry of failed writes was performed.')
  process.exitCode = 1
})
