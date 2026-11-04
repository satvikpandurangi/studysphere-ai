import { expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ResetPasswordPage } from '../src/pages/ResetPasswordPage'
vi.mock('../src/lib/supabase',()=>({requireSupabase:()=>({auth:{}}),createRecoveryClient:()=>({auth:{}}),getRecoveryUserId:()=>null}))
it('does not offer password submission for an expired callback or a plain visit',()=>{
 for(const route of ['/reset-password#error=access_denied&error_code=otp_expired&error_description=PRIVATE','/reset-password']){
  const html=renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[route]},createElement(ResetPasswordPage)))
  expect(html).not.toMatch(/autocomplete="new-password"/i)
  expect(html).not.toContain('PRIVATE')
 }
})
