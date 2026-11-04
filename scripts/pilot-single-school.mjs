// Bounded concurrency checks using existing synthetic identities only.
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { loadEnvFile } from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'

const base = '.local/pilot-auth'
const report = { startedAt: new Date().toISOString(), checks: [], capacityTest: false, launchDecision: 'not_approved' }
async function ok(query) { const result = await query; if (result.error) throw Object.assign(new Error('Provider operation failed'), { code: result.error.code ?? result.error.status }); return result.data }
async function check(name, fn) {
  try { await fn(); report.checks.push({ name, status: 'passed' }); console.log(`PASS ${name}`) }
  catch (e) { report.checks.push({ name, status: 'failed', code: e.code ?? 'assertion_failure' }); throw new Error('Single-school check failed') }
}
try {
  if (!process.argv.includes('--execute')) throw new Error('Explicit synthetic rehearsal required')
  loadEnvFile('.env.staging.local'); loadEnvFile(`${base}/operator.env`)
  const fixturePath = `${base}/fixtures-private.json`, fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  assert.equal(fixtures.project, 'flsckscpvqqyyqvsyjwp'); assert.equal(fixtures.singleSchoolOnly, true)
  assert.equal(process.env.TEST_SUPABASE_URL, 'https://flsckscpvqqyyqvsyjwp.supabase.co')
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } }
  const service = createClient(process.env.TEST_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, options)
  async function login(name) {
    const row = fixtures.accounts[name]
    assert.equal(row.email, `ss-pilot-${fixtures.run}-${name.toLowerCase()}@example.test`); assert.equal(row.retired, undefined)
    const db = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_PUBLISHABLE_KEY, options)
    const signed = await ok(db.auth.signInWithPassword({ email: row.email, password: row.password })); assert.equal(signed.user.id, row.id)
    return { ...row, db }
  }
  const parent = await login('parent'), child = await login('child'), teacher = await login('teacherA'), student = await login('studentA')
  await check('only one synthetic school is active and retired fixture staff have no memberships', async () => {
    const schools = await ok(service.from('schools').select('id,active,name').in('id', [fixtures.schools.A.id, fixtures.schools.B.id]))
    assert.equal(schools.filter(s => s.active).length, 1); assert.equal(schools.find(s => s.active).id, fixtures.schools.A.id)
    assert.equal((await ok(service.from('memberships').select('id').eq('school_id', fixtures.schools.B.id))).length, 0)
    for (const name of ['adminB', 'teacherB', 'studentB']) { const result = await ok(service.auth.admin.getUserById(fixtures.accounts[name].id)); assert.ok(new Date(result.user.banned_until).getTime() > Date.now()) }
  })
  await check('concurrent teacher saves reject one stale edit rather than overwrite it', async () => {
    const args = { assessment_kind: 'quiz', target_topic: fixtures.records.topic, target_school: fixtures.schools.A.id }
    const data = { title: `Synthetic conflict ${fixtures.run}`, questions: [{ prompt: '1 + 1?', options: ['1', '2'], correctIndex: 1, explanation: 'One more is two.' }] }
    const draft = await ok(teacher.db.rpc('save_assessment', { ...args, assessment_data: data }))
    fixtures.records.conflictQuiz = draft.id; await writeFile(fixturePath, JSON.stringify(fixtures, null, 2) + '\n', { mode: 0o600 })
    const results = await Promise.all(['First', 'Second'].map(label => teacher.db.rpc('save_assessment', { ...args, assessment_id: draft.id, expected_edit: draft.edit_version, assessment_data: { ...data, title: `${label} synthetic conflict` } })))
    assert.equal(results.filter(r => !r.error).length, 1); assert.equal(results.filter(r => r.error?.message.includes('changed')).length, 1)
    const current = await ok(teacher.db.rpc('assessment_detail', { assessment_kind: 'quiz', assessment_id: draft.id }))
    assert.equal(current.edit_version, draft.edit_version + 1)
  })
  await check('competing guardian withdrawal requests commit once and preserve child history', async () => {
    const before = await ok(parent.db.from('student_profiles').select('consent_version,approval_status').eq('user_id', child.id).single())
    assert.equal(before.approval_status, 'approved')
    const progress = await ok(parent.db.from('topic_progress').select('topic_id,completed_at').eq('student_id', child.id))
    assert.ok(progress.length)
    try {
      const args = { target_student: child.id, new_status: 'withdrawn', expected_version: before.consent_version }
      const results = await Promise.all([parent.db.rpc('change_guardian_consent', args), parent.db.rpc('change_guardian_consent', args)])
      assert.equal(results.filter(r => !r.error).length, 1); assert.equal(results.filter(r => r.error?.message.includes('changed')).length, 1)
      const paused = await ok(parent.db.from('student_profiles').select('consent_version,approval_status').eq('user_id', child.id).single())
      assert.equal(paused.consent_version, before.consent_version + 1); assert.equal(paused.approval_status, 'withdrawn')
      assert.deepEqual(await ok(child.db.from('content_items').select('id').eq('id', fixtures.records.childLesson)), [])
    } finally {
      const current = await ok(parent.db.from('student_profiles').select('consent_version,approval_status').eq('user_id', child.id).single())
      if (current.approval_status === 'withdrawn') await ok(parent.db.rpc('change_guardian_consent', { target_student: child.id, new_status: 'approved', expected_version: current.consent_version }))
    }
    assert.deepEqual(await ok(parent.db.from('topic_progress').select('topic_id,completed_at').eq('student_id', child.id)), progress)
  })
  await check('staff and unrelated guardians cannot read the student full learning history', async () => {
    assert.ok((await ok(student.db.from('topic_progress').select('topic_id').eq('student_id', student.id))).length)
    for (const db of [teacher.db, parent.db]) for (const table of ['topic_progress', 'quiz_attempts', 'plan_items', 'mind_maps']) assert.deepEqual(await ok(db.from(table).select('student_id').eq('student_id', student.id)), [])
  })
  report.status = 'passed'
} catch { report.status = 'failed'; process.exitCode = 1 }
report.completedAt = new Date().toISOString()
await writeFile(`${base}/single-school-report.json`, JSON.stringify(report, null, 2) + '\n')
console.log(`Single-school checks: ${report.status}. Bounded correctness checks are not a 1500-user load test.`)
