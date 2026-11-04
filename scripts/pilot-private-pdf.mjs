// One-school, synthetic-only private PDF rehearsal after explicit inventory review.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { listStorageObjects, compareInventory } from './storage-inventory.mjs'

const base = '.local/pilot-auth', project = 'flsckscpvqqyyqvsyjwp'
const api = 'https://studysphere-api.satvikjee2526.workers.dev', origin = 'https://studysphere-app.satvikjee2526.workers.dev'
const report = { startedAt: new Date().toISOString(), checks: [], launchDecision: 'not_approved', finalUploadsPaused: false }
let service
async function ok(operation) { const r = await operation; if (r.error) throw Object.assign(new Error('Provider operation failed'), { code: r.error.code ?? r.error.status }); return r.data }
async function check(name, fn) {
  try { await fn(); report.checks.push({ name, status: 'passed' }); console.log(`PASS ${name}`) }
  catch (e) { report.checks.push({ name, status: 'failed', code: e.code ?? e.status ?? 'assertion_failed' }); throw new Error('Private PDF rehearsal failed') }
}
async function main() {
  if (!process.argv.includes('--execute-reviewed-inventory')) throw new Error('Reviewed, settled inventory approval is required.')
  loadEnvFile('.env.staging.local'); loadEnvFile(`${base}/operator.env`)
  assert.equal(process.env.TEST_SUPABASE_URL, `https://${project}.supabase.co`)
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } }
  service = createClient(process.env.TEST_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, options)
  const fixtures = JSON.parse(await readFile(`${base}/fixtures-private.json`, 'utf8'))
  assert.equal(fixtures.project, project); assert.equal(fixtures.singleSchoolOnly, true)
  const school = fixtures.schools.A.id, topic = fixtures.records.topic
  async function login(name) {
    const row = fixtures.accounts[name]; assert.equal(row.retired, undefined)
    const db = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_PUBLISHABLE_KEY, options)
    const signed = await ok(db.auth.signInWithPassword({ email: row.email, password: row.password })); assert.equal(signed.user.id, row.id)
    return { ...row, db, token: signed.session.access_token }
  }
  const staff = await login('teacherA'), student = await login('studentA'), administrator = await login('adminA')
  const bytes = await readFile('sample-assets/fractions-sample.pdf')
  assert.ok(bytes.length < 10000)
  const sha = value => createHash('sha256').update(value).digest('hex')
  async function request(actor, path, method = 'GET', body) {
    return fetch(api + path, { method, signal: AbortSignal.timeout(20000), headers: { Origin: origin, ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), ...(body ? { 'Content-Type': 'application/pdf' } : {}) }, body })
  }
  let content = fixtures.records.pdf
  if (!content) {
    content = (await ok(staff.db.from('content_items').insert({ topic_id: topic, school_id: school, kind: 'pdf', title: `Synthetic PDF ${fixtures.run}`, author_id: staff.id }).select('id').single())).id
    fixtures.records.pdf = content
    await writeFile(`${base}/fixtures-private.json`, JSON.stringify(fixtures, null, 2) + '\n', { mode: 0o600 })
  }
  await check('paused upload rejects a synthetic PDF without writing a file', async () => {
    const r = await request(staff, `/assets/upload/${content}`, 'PUT', bytes)
    assert.equal(r.status, 400)
    const body = await r.json(); assert.match(body.error, /paused/i)
  })
  let bucket
  await check('fresh settled provider inventory agrees with the ledger before review', async () => {
    const snapshot = await ok(service.rpc('pdf_asset_inventory'))
    bucket = snapshot.policy.bucket
    const metadata = await ok(service.storage.getBucket(bucket)); assert.equal(metadata.public, false)
    const objects = await listStorageObjects(service.storage.from(bucket)), ending = await ok(service.rpc('pdf_storage_state'))
    const comparison = compareInventory(snapshot, objects, ending)
    assert.equal(comparison.uploadsPaused, true); assert.equal(comparison.stableLedger, true)
    assert.equal(ending.reservedUploads, 0); assert.equal(ending.uncertainUploads, 0); assert.equal(ending.unverifiedObjects, 0)
    for (const key of ['unknownSizes', 'missingReferenced', 'untracked', 'sizeMismatches', 'absentLedgerObjects']) assert.equal(comparison[key].length, 0)
    report.review = { reviewedAt: new Date().toISOString(), revision: ending.revision, providerObjects: objects.length, comparison }
    await writeFile(`${base}/pdf-reviewed-inventory.json`, JSON.stringify({ review: report.review, snapshot, objects }, null, 2) + '\n')
    await ok(service.rpc('complete_pdf_storage_review', { acting_user: fixtures.accounts.platform.id, expected_revision: ending.revision, confirmed_settled: true }))
  })
  await check('deployed upload reserves and attaches the bounded synthetic PDF', async () => {
    const r = await request(staff, `/assets/upload/${content}`, 'PUT', bytes)
    assert.equal(r.status, 200); const body = await r.json(); assert.equal(body.ok, true)
    const changed = await ok(staff.db.from('content_items').update({ status: 'published', pdf_text: 'Synthetic fractions sample for acceptance only.' }).eq('id', content).eq('version', body.contentVersion).select('id'))
    assert.equal(changed.length, 1)
  })
  let objectKey
  await check('authorized private PDF bytes match and responses forbid caching', async () => {
    const r = await request(student, `/assets/${content}`)
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/pdf')
    assert.match(r.headers.get('cache-control'), /private/); assert.match(r.headers.get('cache-control'), /no-store/)
    assert.equal(sha(Buffer.from(await r.arrayBuffer())), sha(bytes))
    objectKey = (await ok(staff.db.from('content_items').select('object_key').eq('id', content).single())).object_key
  })
  await check('anonymous Worker and direct authenticated Storage reads are denied', async () => {
    assert.equal((await request(null, `/assets/${content}`)).status, 401)
    const storage = await student.db.storage.from(bucket).download(objectKey)
    assert.ok(storage.error); assert.equal(storage.data, null)
    const publicResponse = await fetch(`${process.env.TEST_SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectKey}`, { signal: AbortSignal.timeout(20000) })
    assert.equal(publicResponse.status, 400)
  })
  await check('malformed replacement fails without changing the published file', async () => {
    const r = await request(staff, `/assets/upload/${content}`, 'PUT', Buffer.from('not a PDF'))
    assert.equal(r.status, 400)
    const prior = await ok(staff.db.from('content_items').select('object_key,status').eq('id', content).single())
    assert.equal(prior.object_key, objectKey); assert.equal(prior.status, 'published')
    const original = await request(student, `/assets/${content}`); assert.equal(original.status, 200)
    assert.equal(sha(Buffer.from(await original.arrayBuffer())), sha(bytes))
  })
  await check('enrollment revocation immediately denies a new private PDF read', async () => {
    await ok(administrator.db.rpc('revoke_school_enrollment', { target_school: school, target_student: student.id }))
    const denied = await request(student, `/assets/${content}`); assert.equal(denied.status, 400)
    assert.equal((await denied.json()).error, 'PDF unavailable')
    const invite = await ok(administrator.db.rpc('create_enrollment_invite', { target_school: school, student_email: student.email }))
    await ok(student.db.rpc('accept_enrollment_invite', { invite_code: invite.code, target_student: student.id }))
    assert.equal((await request(student, `/assets/${content}`)).status, 200)
  })
  await check('stored private file and ledger agree after the rehearsal', async () => {
    const snapshot = await ok(service.rpc('pdf_asset_inventory')), objects = await listStorageObjects(service.storage.from(bucket))
    const ending = await ok(service.rpc('pdf_storage_state')), comparison = compareInventory(snapshot, objects, ending)
    for (const key of ['unknownSizes', 'missingReferenced', 'untracked', 'sizeMismatches', 'absentLedgerObjects']) assert.equal(comparison[key].length, 0)
    assert.equal(ending.accountedBytes, bytes.length); assert.equal(objects.length, 1); assert.equal(ending.reservedUploads, 0); assert.equal(ending.uncertainUploads, 0)
    report.retainedSyntheticFileBytes = bytes.length
  })
}

try { await main(); report.status = 'passed' }
catch (e) { report.status = 'failed'; report.failureCode = e.code ?? e.status ?? 'operator_or_assertion_failure'; process.exitCode = 1 }
finally {
  if (service) {
    try {
      const policy = await ok(service.from('pdf_storage_policy').select('revision').eq('singleton', true).single())
      await ok(service.from('pdf_storage_policy').update({ uploads_paused: true, revision: policy.revision + 1 }).eq('singleton', true).eq('revision', policy.revision))
      const verified = await ok(service.rpc('pdf_storage_state')); assert.equal(verified.uploadsPaused, true)
      report.finalUploadsPaused = true
    } catch { report.pauseFailure = true; process.exitCode = 1 }
  }
  report.completedAt = new Date().toISOString()
  await writeFile(`${base}/pdf-workflow-report.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(`Private PDF rehearsal: ${report.status}; final uploads paused: ${report.finalUploadsPaused}.`)
}
