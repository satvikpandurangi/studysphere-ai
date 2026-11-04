import { describe, expect, it } from 'vitest'
// @ts-expect-error Shared Node validation script has no separate declaration.
import { hostedBoundaryPassed, hostedInputNames, missingHostedInputs } from '../scripts/hosted-config.mjs'

const report=(statuses=['passed','passed','passed'])=>({numFailedTests:0,testResults:[{name:'C:\\workspace\\tests\\rls.integration.test.ts',assertionResults:statuses.map(status=>({status}))}]})
describe('hosted evidence gate',()=>{
  it('requires all nine inputs including positive-control accounts and rejects blank values',()=>{
    const environment=Object.fromEntries(hostedInputNames.map((name:string)=>[name,'synthetic']))
    expect(missingHostedInputs(environment)).toEqual([])
    delete environment.TEST_STUDENT_B_JWT;environment.TEST_SCHOOL_B_EDITOR_JWT='  '
    expect(missingHostedInputs(environment)).toEqual(['TEST_STUDENT_B_JWT','TEST_SCHOOL_B_EDITOR_JWT'])
  })
  it('accepts only the exact hosted suite with three completed passes',()=>{
    expect(hostedBoundaryPassed(report())).toBe(true)
    for(const statuses of [[],['passed'],['passed','passed','pending'],['passed','passed','failed'],['passed','passed','passed','passed']])expect(hostedBoundaryPassed(report(statuses))).toBe(false)
  })
  it('rejects missing, unrelated, duplicate or failed report evidence',()=>{
    expect(hostedBoundaryPassed(null)).toBe(false)
    expect(hostedBoundaryPassed({numFailedTests:0,testResults:[]})).toBe(false)
    const unrelated=report();unrelated.testResults[0].name='tests/local.test.ts'
    expect(hostedBoundaryPassed(unrelated)).toBe(false)
    const duplicate=report();duplicate.testResults.push(duplicate.testResults[0])
    expect(hostedBoundaryPassed(duplicate)).toBe(false)
    expect(hostedBoundaryPassed({...report(),numFailedTests:1})).toBe(false)
  })
})
