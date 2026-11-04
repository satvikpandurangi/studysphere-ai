import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ResetPasswordPage } from '../src/pages/ResetPasswordPage'
import { readRecoveryLink, createRecoveryIntent } from '../src/lib/passwordRecovery'
import { shouldDetectSessionInUrl } from '../src/lib/emailVerification'
vi.mock('../src/lib/supabase',()=>({requireSupabase:()=>({auth:{}}),createRecoveryClient:()=>({auth:{}}),getRecoveryUserId:()=>null}))
const token='a'.repeat(64)
describe('password recovery boundaries',()=>{
 it('does not offer password submission on the reported expired callback or a plain visit',()=>{
  for(const route of ['/reset-password#error=access_denied&error_code=otp_expired&error_description=PRIVATE','/reset-password']){
   const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[route]},createElement(ResetPasswordPage)))
   expect(html).not.toMatch(/autocomplete="new-password"/i)
   expect(html).not.toContain('PRIVATE')
  }
 })
 it('accepts recovery-only fragments and rejects misplaced, mixed or duplicate credentials',()=>{
  expect(readRecoveryLink(`#recovery_token_hash=${token}&recovery_type=recovery`)).toEqual({tokenHash:token,invalid:false})
  for(const hash of [`#recovery_token_hash=${token}&recovery_type=signup`,`#recovery_token_hash=${token}&recovery_type=recovery&access_token=bad`,`#recovery_token_hash=${token}&recovery_type=recovery&recovery_type=recovery`,'#recovery_token_hash=short&recovery_type=recovery',`#confirmation_token_hash=${token}&recovery_type=recovery`])expect(readRecoveryLink(hash)).toEqual({tokenHash:null,invalid:true})
  expect(readRecoveryLink('',`?recovery_token_hash=${token}`)).toEqual({tokenHash:null,invalid:true})
  expect(shouldDetectSessionInUrl(`#recovery_token_hash=${token}&recovery_type=recovery&access_token=bad`,'')).toBe(false)
 })
 it('requires an observed recovery event, never an ordinary signed-in session',()=>{
  const intent=createRecoveryIntent()
  intent.observe('INITIAL_SESSION','student');expect(intent.userId()).toBeNull()
  intent.observe('SIGNED_IN','student');expect(intent.userId()).toBeNull()
  intent.observe('PASSWORD_RECOVERY','parent');expect(intent.userId()).toBe('parent')
  intent.observe('TOKEN_REFRESHED','parent');expect(intent.userId()).toBe('parent')
  intent.observe('SIGNED_IN','student');expect(intent.userId()).toBeNull()
  intent.observe('PASSWORD_RECOVERY','parent');intent.observe('USER_UPDATED','parent');expect(intent.userId()).toBeNull()
 })
})
