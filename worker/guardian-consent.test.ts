import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture=vi.hoisted(()=>({role:'parent',callerRpc:vi.fn(),reserve:vi.fn(),privilegedWrite:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient:(_url:string,key:string)=>key==='secret-test-key'?{
  from:()=>({select(){return this},eq(){return this},single:async()=>({data:{id:'b0000000-0000-4000-8000-000000000001',role:fixture.role},error:null}),update:fixture.privilegedWrite,insert:fixture.privilegedWrite}),rpc:fixture.reserve,
}:{auth:{getUser:async()=>({data:{user:{id:'b0000000-0000-4000-8000-000000000001'}},error:null})},rpc:fixture.callerRpc}}))
import api from './index'
const env={APP_ORIGIN:'https://app.example.test',SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public-test-key',SUPABASE_SECRET_KEY:'secret-test-key'} as Parameters<typeof api.fetch>[1]
const studentId='b0000000-0000-4000-8000-000000000005'
function request(body:object){return new Request('https://api.example.test/students/consent',{method:'POST',headers:{Authorization:'Bearer synthetic-token','Content-Type':'application/json'},body:JSON.stringify(body)})}
beforeEach(()=>{fixture.role='parent';fixture.callerRpc.mockReset().mockResolvedValue({data:{status:'withdrawn',consentVersion:2,changed:true},error:null});fixture.reserve.mockReset().mockResolvedValue({data:true,error:null});fixture.privilegedWrite.mockReset()})
describe('guardian consent Worker boundary',()=>{
  it('delegates one atomic RPC with caller identity and ignores forged parent/audit fields',async()=>{
    const response=await api.fetch(request({studentId,status:'withdrawn',expectedVersion:1,parentId:'forged',actorId:'forged',consentedAt:'forged'}),env)
    expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({status:'withdrawn',consentVersion:2,changed:true})
    expect(fixture.callerRpc).toHaveBeenCalledExactlyOnceWith('change_guardian_consent',{target_student:studentId,new_status:'withdrawn',expected_version:1})
    expect(fixture.privilegedWrite).not.toHaveBeenCalled()
  })
  it('rejects malformed/missing versions, status and student IDs before the RPC',async()=>{
    for(const body of [{studentId,status:'approved'},{studentId,status:'pending',expectedVersion:1},{studentId:'bad',status:'approved',expectedVersion:1},...[0,-1,1.2,'1',2147483648,null].map(expectedVersion=>({studentId,status:'approved',expectedVersion}))])expect((await api.fetch(request(body),env)).status).toBe(400)
    expect(fixture.callerRpc).not.toHaveBeenCalled()
  })
  it('denies non-parent roles before delegation',async()=>{
    for(const role of ['student','editor','school_admin','platform_admin']){fixture.role=role;expect((await api.fetch(request({studentId,status:'approved',expectedVersion:1}),env)).status).toBe(400)}
    expect(fixture.callerRpc).not.toHaveBeenCalled()
  })
  it('returns authorization/conflict/rollback errors without reporting success or a fallback write',async()=>{
    for(const message of ['Verified parent account required','Student is not linked to this parent','Approval changed; reload My children and try again','Audit write failed']){
      fixture.callerRpc.mockResolvedValue({data:null,error:{message}})
      const response=await api.fetch(request({studentId,status:'approved',expectedVersion:2}),env)
      expect(response.status).toBe(400);expect(await response.json()).toEqual({error:message})
    }
    expect(fixture.privilegedWrite).not.toHaveBeenCalled()
  })
})
