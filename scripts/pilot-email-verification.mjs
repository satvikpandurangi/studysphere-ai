// Operator-only: two explicitly approved Gmail aliases; never run by npm test.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'

const directory = '.local/pilot-auth'
const statePath = `${directory}/email-fixtures-private.json`
const reportPath = `${directory}/email-verification-report.json`
const approval = JSON.parse(await readFile(`${directory}/email-approval.json`, 'utf8'))
const aliases = approval.aliases
assert.ok(aliases.student && aliases.parent && aliases.student !== aliases.parent)
assert.equal(approval.approvedRequests, 6)
let phase = 'status'
const report = { checkedAt: new Date().toISOString(), checks: [], complete: false }
const record = (name, passed) => { assert.ok(passed, name); report.checks.push({ name, passed: true }) }
try {
  assert.ok(process.argv.includes('--execute'), 'Explicit operator execution required')
  loadEnvFile('.env.staging.local'); loadEnvFile(`${directory}/operator.env`)
  assert.equal(process.env.TEST_SUPABASE_URL, 'https://flsckscpvqqyyqvsyjwp.supabase.co')
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } }
  const client = () => createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_PUBLISHABLE_KEY, options)
  const admin = createClient(process.env.TEST_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, options)
  const fixtures = JSON.parse(await readFile(`${directory}/fixtures-private.json`, 'utf8'))
  assert.equal(fixtures.singleSchoolOnly, true)
  let state
  try { state = JSON.parse(await readFile(statePath, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e; state = { project: 'flsckscpvqqyyqvsyjwp', accounts: {}, emailsRequested: 0 } }
  assert.equal(state.project, 'flsckscpvqqyyqvsyjwp')
  const save = () => writeFile(statePath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
  const mode = phase = process.argv.find(arg => ['start', 'status', 'resend'].includes(arg)) ?? 'status'
  const school = await admin.from('schools').select('name,active').eq('id', fixtures.schools.A.id).single()
  assert.ifError(school.error); assert.equal(school.data.active, true)
  const grade = await admin.from('grades').select('id').eq('number', 6).single(); assert.ifError(grade.error)
  const board = await admin.from('boards').select('id').eq('code', 'CBSE').single(); assert.ifError(board.error)
  const subjects = await admin.from('subjects').select('id').eq('board_id', board.data.id).eq('grade_id', grade.data.id); assert.ifError(subjects.error); assert.ok(subjects.data.length)
  for (const [role, email] of Object.entries(aliases)) {
    if (mode === 'start' && !state.accounts[role]) {
      assert.ok(state.emailsRequested < approval.approvedRequests)
      const account = { email, password: randomBytes(24).toString('base64url') + '!aA2', signupRequested: false }
      state.accounts[role] = account; await save()
      // Persist intent before the side effect. An interrupted signup is not retried.
      state.emailsRequested++; account.signupRequested = true; await save()
      const metadata = role === 'student'
        ? { full_name: 'Synthetic Email Student', account_type: role, school_name: school.data.name, board_id: board.data.id, grade_id: grade.data.id, subject_ids: subjects.data.map(row => row.id) }
        : { full_name: 'Synthetic Email Parent', account_type: role }
      const result = await client().auth.signUp({ email, password: account.password, options: { data: metadata, emailRedirectTo: 'http://127.0.0.1:5173/verify-email' } })
      assert.ifError(result.error); assert.ok(result.data.user?.id); assert.equal(result.data.session, null)
      account.id = result.data.user.id; await save()
      record(`${role} signup requires email confirmation`, !result.data.user.email_confirmed_at)
    }
    const account = state.accounts[role]
    assert.equal(account?.email, email); assert.ok(account.id, 'Inspect interrupted signup before continuing')
    const current = await admin.auth.admin.getUserById(account.id); assert.ifError(current.error); assert.equal(current.data.user.email, email)
    const confirmed = Boolean(current.data.user.email_confirmed_at)
    if (mode === 'resend' && !confirmed) {
      assert.ok(state.emailsRequested < approval.approvedRequests, 'Approved email limit reached')
      state.emailsRequested++; await save()
      const resent = await client().auth.resend({ type: 'signup', email, options: { emailRedirectTo: 'http://127.0.0.1:5173/verify-email' } }); assert.ifError(resent.error)
      record(`${role} resend accepted`, true)
    }
    const sessionClient = client()
    const signed = await sessionClient.auth.signInWithPassword({ email, password: account.password })
    if (!confirmed) { record(`${role} unverified sign-in denied`, signed.error?.code === 'email_not_confirmed'); continue }
    assert.ifError(signed.error); assert.equal(signed.data.user.id, account.id)
    record(`${role} confirmed sign-in succeeds`, true)
    const profile = await sessionClient.from('profiles').select('role').eq('id', account.id).single(); assert.ifError(profile.error)
    record(`${role} retains signup role`, profile.data.role === role)
    const schools = await sessionClient.rpc('institution_workspaces'); assert.ifError(schools.error)
    record(`${role} cannot acquire school identity from typed label`, schools.data.length === 0)
    if (role === 'student') {
      const enrollment = await sessionClient.from('school_enrollments').select('id').eq('student_id', account.id); assert.ifError(enrollment.error)
      record('new student has no automatic verified enrollment', enrollment.data.length === 0)
    }
    await sessionClient.auth.signOut({ scope: 'local' })
  }
  report.emailsRequested = state.emailsRequested
  report.complete = report.checks.some(c => c.name === 'student confirmed sign-in succeeds') && report.checks.some(c => c.name === 'parent confirmed sign-in succeeds')
} catch (error) { report.error = error.code ?? 'operator_or_assertion_failure'; process.exitCode = 1 }
await writeFile(`${directory}/email-verification-${phase}-report.json`, JSON.stringify(report, null, 2) + '\n')
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report))
