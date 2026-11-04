import { describe, expect, it } from 'vitest'
import { readConfirmationLink } from '../src/lib/emailVerification'
const token = 'a'.repeat(64)
describe('confirmation link parsing', () => {
 it('accepts one signup fragment without exchanging it', () => {
  expect(readConfirmationLink(`#confirmation_token_hash=${token}&confirmation_type=signup`)).toEqual({tokenHash:token,invalid:false})
 })
 it('leaves ordinary code, recovery and legacy session callbacks alone', () => {
  for(const hash of ['', '#access_token=synthetic&type=recovery','#error_code=otp_expired']) expect(readConfirmationLink(hash)).toEqual({tokenHash:null,invalid:false})
 })
 it('fails closed for malformed, duplicate, unsupported and oversized payloads', () => {
  for(const hash of [`#confirmation_token_hash=${token}`, '#confirmation_type=signup', `#confirmation_token_hash=${token}&confirmation_type=recovery`, `#confirmation_token_hash=${token}&confirmation_token_hash=${token}&confirmation_type=signup`, `#confirmation_token_hash=${token}&confirmation_type=signup&confirmation_type=signup`, '#confirmation_token_hash=short&confirmation_type=signup', '#confirmation_token_hash='+ 'a'.repeat(257)+'&confirmation_type=signup', '#confirmation_token_hash=%3Cscript%3E&confirmation_type=signup']) expect(readConfirmationLink(hash)).toEqual({tokenHash:null,invalid:true})
 })
})
import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { createConfirmationExchange } from '../src/lib/emailVerification'
describe('explicit confirmation exchange',()=>{
 it('does nothing until invoked, submits once while busy and requires confirmed session',async()=>{
  let finish!:()=>void
  const gate=new Promise<void>(resolve=>{finish=resolve})
  const verify=vi.fn(async()=>{await gate;return {data:{session:{},user:{email_confirmed_at:'confirmed'}},error:null}})
  const confirm=createConfirmationExchange(verify)
  expect(verify).not.toHaveBeenCalled()
  const first=confirm(token)
  expect(await confirm(token)).toBe(false)
  expect(verify).toHaveBeenCalledTimes(1)
  finish();expect(await first).toBe(true)
 })
 it('rejects missing session/unconfirmed user and hides provider messages',async()=>{
  for(const data of [{session:null,user:{email_confirmed_at:'yes'}},{session:{},user:{}}]){
   const confirm=createConfirmationExchange(async()=>({data,error:null}))
   await expect(confirm(token)).rejects.toThrow('could not finish')
  }
  const confirm=createConfirmationExchange(async()=>({data:{session:null,user:null},error:new Error('SECRET untrusted provider payload')}))
  await expect(confirm(token)).rejects.toThrow('could not be verified')
 })
 it('gives safe used/expired link guidance and allows recovery after failure',async()=>{
  const verify=vi.fn().mockResolvedValueOnce({data:{session:null,user:null},error:{code:'otp_expired'}}).mockResolvedValueOnce({data:{session:{},user:{email_confirmed_at:'yes'}},error:null})
  const confirm=createConfirmationExchange(verify)
  await expect(confirm(token)).rejects.toThrow('expired or has already been used')
  expect(await confirm(token)).toBe(true)
 })
 it('emails use an app fragment link and retain the six-digit fallback',()=>{
  const html=readFileSync('supabase/templates/confirmation.html','utf8')
  expect(html).toContain('{{ .RedirectTo }}#confirmation_token_hash={{ .TokenHash }}&amp;confirmation_type=signup')
  expect(html).toContain('Verify my email')
  expect(html).toContain('{{ .Token }}')
  expect(html).not.toContain('{{ .ConfirmationURL }}')
 })
})
import { shouldDetectSessionInUrl } from '../src/lib/emailVerification'
describe('mixed callback protection',()=>{
 it('blocks SDK auto-detection before custom link confirmation, preserving recovery',()=>{
  const mixed=`#confirmation_token_hash=${token}&confirmation_type=signup&access_token=synthetic&refresh_token=synthetic&type=signup`
  expect(readConfirmationLink(mixed)).toEqual({tokenHash:null,invalid:true})
  expect(shouldDetectSessionInUrl(mixed,'')).toBe(false)
  expect(shouldDetectSessionInUrl('#access_token=synthetic&type=recovery','')).toBe(true)
  expect(shouldDetectSessionInUrl('#access_token=synthetic','?confirmation_type=signup')).toBe(false)
 })
})
it('rejects confirmation payloads in query strings instead of preserving credentials in the URL',()=>{
 expect(readConfirmationLink('',`?confirmation_token_hash=${token}&confirmation_type=signup`)).toEqual({tokenHash:null,invalid:true})
})
