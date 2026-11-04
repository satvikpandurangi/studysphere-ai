// Shared contract for the read-only synthetic staging boundary suite.
export const hostedInputNames = [
  'TEST_SUPABASE_URL', 'TEST_SUPABASE_PUBLISHABLE_KEY',
  'TEST_STUDENT_A_JWT', 'TEST_STUDENT_B_JWT', 'TEST_STUDENT_B_ID',
  'TEST_SCHOOL_A_EDITOR_JWT', 'TEST_SCHOOL_B_EDITOR_JWT',
  'TEST_SCHOOL_A_DRAFT_ID', 'TEST_SCHOOL_B_DRAFT_ID',
]
export const missingHostedInputs = (environment) => hostedInputNames.filter(name => !environment[name]?.trim())
export function hostedBoundaryPassed(report) {
  const files = (report?.testResults ?? []).filter(test => test.name.replaceAll('\\', '/').endsWith('/tests/rls.integration.test.ts'))
  const assertions = files.flatMap(test => test.assertionResults ?? [])
  return files.length === 1 && assertions.length === 3 && assertions.every(test => test.status === 'passed') && report.numFailedTests === 0
}
