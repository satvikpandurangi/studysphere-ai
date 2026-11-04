import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
// @ts-expect-error Shared Node script has no separate TypeScript declaration.
import { missingHostedInputs } from '../scripts/hosted-config.mjs'

const config={
  url:process.env.TEST_SUPABASE_URL,key:process.env.TEST_SUPABASE_PUBLISHABLE_KEY,
  studentA:process.env.TEST_STUDENT_A_JWT,studentB:process.env.TEST_STUDENT_B_JWT,studentBId:process.env.TEST_STUDENT_B_ID,
  schoolAEditor:process.env.TEST_SCHOOL_A_EDITOR_JWT,schoolBEditor:process.env.TEST_SCHOOL_B_EDITOR_JWT,
  schoolADraftId:process.env.TEST_SCHOOL_A_DRAFT_ID,schoolBDraftId:process.env.TEST_SCHOOL_B_DRAFT_ID,
}
const ready=missingHostedInputs(process.env).length===0
function client(token:string){return createClient(config.url!,config.key!,{global:{headers:{Authorization:`Bearer ${token}`},fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})},auth:{persistSession:false,autoRefreshToken:false}})}
async function identity(db:SupabaseClient,token:string,roles:string[]){
  const {data,error}=await db.auth.getUser(token)
  expect(error,'Live Auth must accept each fixture token').toBeNull()
  expect(data.user?.email_confirmed_at,'Fixture accounts must be verified').toBeTruthy()
  const id=data.user!.id
  const profile=await db.from('profiles').select('id,role').eq('id',id).single()
  expect(profile.error).toBeNull();expect(roles).toContain(profile.data?.role)
  return id
}

describe.skipIf(!ready)('live Supabase tenant boundaries',()=>{
  let studentA:SupabaseClient,studentB:SupabaseClient,editorA:SupabaseClient,editorB:SupabaseClient
  let studentAId:string,studentBId:string
  beforeAll(async()=>{
    const url=new URL(config.url!)
    expect(url.protocol,'Use the designated HTTPS staging project').toBe('https:')
    expect(url.username||url.password||url.search||url.hash,'Project URL must not contain credentials or tokens').toBe('')
    studentA=client(config.studentA!);studentB=client(config.studentB!);editorA=client(config.schoolAEditor!);editorB=client(config.schoolBEditor!)
    const ids=await Promise.all([
      identity(studentA,config.studentA!,['student']),identity(studentB,config.studentB!,['student']),
      identity(editorA,config.schoolAEditor!,['editor','school_admin']),identity(editorB,config.schoolBEditor!,['editor','school_admin']),
    ])
    expect(new Set(ids).size,'Use four distinct fixture accounts').toBe(4)
    ;[studentAId,studentBId]=ids
    expect(studentBId).toBe(config.studentBId)
    expect(config.schoolADraftId).not.toBe(config.schoolBDraftId)
  },60000)

  it('blocks cross-student records with nonempty own-record controls in both directions',async()=>{
    for(const table of ['student_profiles','topic_progress','plan_items','mind_maps'] as const){
      const column=table==='student_profiles'?'user_id':'student_id'
      for(const [db,ownId,otherId] of [[studentA,studentAId,studentBId],[studentB,studentBId,studentAId]] as const){
        const own=await db.from(table).select(column).eq(column,ownId).limit(1)
        expect(own.error,`${table}: own read must work`).toBeNull()
        expect(own.data,`${table}: seed an own row for each student`).toHaveLength(1)
        const other=await db.from(table).select(column).eq(column,otherId)
        expect(other.error,table).toBeNull();expect(other.data,table).toEqual([])
      }
    }
  },60000)

  it('separates school drafts with two authorized own-school positive controls',async()=>{
    const ownA=await editorA.from('content_items').select('id,school_id,status').eq('id',config.schoolADraftId!).single()
    const ownB=await editorB.from('content_items').select('id,school_id,status').eq('id',config.schoolBDraftId!).single()
    for(const result of [ownA,ownB]){expect(result.error).toBeNull();expect(result.data?.status).toBe('draft');expect(result.data?.school_id).toBeTruthy()}
    expect(ownA.data!.school_id).not.toBe(ownB.data!.school_id)
    for(const [db,otherId] of [[editorA,config.schoolBDraftId!],[editorB,config.schoolADraftId!]] as const){
      const other=await db.from('content_items').select('id').eq('id',otherId)
      expect(other.error).toBeNull();expect(other.data).toEqual([])
    }
  },60000)

  it('allows published question reads but denies answer/explanation columns with a privilege error',async()=>{
    const allowed=await studentA.from('quiz_questions').select('id,prompt,options').limit(1)
    expect(allowed.error,'Published question read must work').toBeNull()
    expect(allowed.data,'Publish an accessible quiz with a question for Student A').toHaveLength(1)
    for(const column of ['correct_index','explanation']){
      const result=await studentA.from('quiz_questions').select(column).limit(1)
      expect(result.error?.code,`${column}: require a PostgreSQL privilege denial, not a network/auth/schema error`).toBe('42501')
    }
  },60000)
})
