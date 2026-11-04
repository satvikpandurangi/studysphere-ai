import { spawnSync } from 'node:child_process'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hostedBoundaryPassed, missingHostedInputs } from './hosted-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Optional ignored file; process environment takes precedence. Never print values.
try { loadEnvFile(path.join(root, '.env.staging.local')) } catch (e) { if (e.code !== 'ENOENT') throw new Error('Unable to load the local staging environment file.') }
const directory = path.join(root, '.local', 'hosted-validation')
await mkdir(directory, { recursive: true })
const testFile = path.join(directory, 'tests.json')
try { await unlink(testFile) } catch (e) { if (e.code !== 'ENOENT') throw e }
const startedAt = new Date().toISOString()
const missingInputs = missingHostedInputs(process.env)
let result = null, tests = null
if (!missingInputs.length) {
  result = spawnSync(process.execPath, [path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'tests/rls.integration.test.ts', '--configLoader', 'runner', '--reporter=default', '--reporter=json', `--outputFile=${testFile}`], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true })
  try { tests = JSON.parse(await readFile(testFile, 'utf8')) } catch { /* Missing evidence fails closed. */ }
}
const verified = !missingInputs.length && result?.status === 0 && !result?.error && hostedBoundaryPassed(tests)
await writeFile(path.join(directory, 'acceptance.json'), JSON.stringify({
  startedAt, completedAt: new Date().toISOString(), hostedVerified: verified, missingInputs,
  tests: tests ? { passed: tests.numPassedTests, failed: tests.numFailedTests, skipped: tests.numPendingTests } : null,
  launchDecision: 'pending_manual_acceptance',
  scope: 'Three read-only Auth/PostgREST tenant boundary cases with positive fixture controls; not complete pilot acceptance.',
}, null, 2) + '\n')
process.stdout.write(missingInputs.length ? `Hosted checks not run. Missing inputs: ${missingInputs.join(', ')}\n` : `Hosted boundaries: ${verified ? 'passed' : 'failed'}.\n`)
process.stdout.write('Evidence: .local/hosted-validation/acceptance.json. No deployment, fixture provisioning or database/Storage mutation is performed.\n')
process.exitCode = missingInputs.length ? 2 : verified ? 0 : 1
