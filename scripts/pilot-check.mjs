import { spawnSync } from 'node:child_process'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadEnvFile } from 'node:process'
import { hostedBoundaryPassed, missingHostedInputs as findMissingHostedInputs } from './hosted-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try { loadEnvFile(path.join(root, '.env.staging.local')) } catch (e) { if (e.code !== 'ENOENT') throw new Error('Unable to load the local staging environment file.') }
const directory = path.join(root, '.local', 'pilot-validation')
await mkdir(directory, { recursive: true })
const testFile = path.join(directory, 'tests.json')
try { await unlink(testFile) } catch (e) { if (e.code !== 'ENOENT') throw e }
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this tool with npm run pilot:check from the repository root.')
const startedAt = new Date().toISOString()
const commands = []
for (const [name, args] of [
  ['build', ['run', 'build']], ['lint', ['run', 'lint']], ['check:worker', ['run', 'check:worker']],
  ['worker:bundle', ['run', 'worker:bundle']],
  ['test', ['test', '--', '--reporter=default', '--reporter=json', `--outputFile=${testFile}`]],
  ['docs:check', ['run', 'docs:check']],
]) {
  process.stdout.write(`\nPilot check: ${name}\n`)
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true })
  commands.push({ name, passed: result.status === 0 && !result.error, exitCode: result.status, ...(result.error ? { error: result.error.message } : {}) })
}
let tests = null
try { tests = JSON.parse(await readFile(testFile, 'utf8')) } catch { /* Missing output is reported as a failed evidence gate below. */ }
const missingHostedInputs = findMissingHostedInputs(process.env)
const hostedVerified = missingHostedInputs.length === 0 && hostedBoundaryPassed(tests)
const localChecksPassed = commands.every(command => command.passed) && tests?.numFailedTests === 0 && tests?.numPassedTests > 0
const report = {
  startedAt, completedAt: new Date().toISOString(), localChecksPassed, commands,
  tests: tests ? { passed: tests.numPassedTests, failed: tests.numFailedTests, skipped: tests.numPendingTests } : null,
  hostedVerified, missingHostedInputs,
  launchDecision: 'pending_manual_acceptance',
  requiredEvidence: [
    ...(!hostedVerified ? ['Hosted migrations and tenant boundary tests'] : []),
    'Actual single-school partnership, approved material, ownership and zero-cash limits',
    'Real Auth/email/guardian/revocation/PDF/assessment/branding/account journeys',
    'Privacy retention/fulfillment, backup restore and release/rollback rehearsal',
    'Support owner, approved policies, target devices and measured 1500-user capacity/provider usage',
  ],
}
await writeFile(path.join(directory, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n')
process.stdout.write(`\nLocal checks: ${localChecksPassed ? 'passed' : 'failed'}. Hosted boundaries: ${hostedVerified ? 'passed' : 'pending'}.\nEvidence: .local/pilot-validation/acceptance.json\nLaunch acceptance requires the manual evidence in docs/launch/pilot-acceptance.md.\n`)
if (!localChecksPassed || (process.argv.includes('--require-hosted') && !hostedVerified)) process.exitCode = 1
