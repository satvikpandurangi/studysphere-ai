import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture=vi.hoisted(()=>({role:'editor',rpc:vi.fn(),upload:vi.fn(),remove:vi.fn(),errors:new Map<string,string>(),queue:[] as {id:string;object_key:string;bucket:string}[]}))
vi.mock('@supabase/supabase-js',()=>({createClient:(_url:string,key:string)=>key==='secret-test-key'?{
  from:()=>({select(){return this},eq(){return this},single:async()=>({data:{id:'a0000000-0000-4000-8000-000000000001',role:fixture.role},error:null})}),
  rpc:fixture.rpc,storage:{from:()=>({upload:fixture.upload,remove:fixture.remove})},
}:{auth:{getUser:async()=>({data:{user:{id:'a0000000-0000-4000-8000-000000000001'}},error:null})}}}))
import api from './index'
import { readBoundedPdf } from './assets'
const content='c0000000-0000-4000-8000-000000000001'
const env={APP_ORIGIN:'https://app.example.test',SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public-test-key',SUPABASE_SECRET_KEY:'secret-test-key'} as Parameters<typeof api.fetch>[1]
const request=(path:string,method='GET',body?:BodyInit,headers:Record<string,string>={})=>new Request(`https://api.example.test${path}`,{method,headers:{Authorization:'Bearer synthetic-token',...headers},...(body?{body}: {})})
const put=(body='%PDF-1.7 test',headers:Record<string,string>={})=>request(`/assets/upload/${content}`,'PUT',body,{'Content-Type':'application/pdf',...headers})
beforeEach(()=>{
  fixture.role='editor';fixture.errors.clear();fixture.queue=[]
  fixture.rpc.mockReset().mockImplementation(async(name:string)=>{
    if(fixture.errors.has(name))return {data:null,error:{message:fixture.errors.get(name)}}
    const data=name==='reserve_api_request'?true:name==='pdf_storage_state'?{maxPdfBytes:15000000,storageLimitBytes:800000000,bucket:'lesson-assets',uploadsPaused:false,inventoryReviewed:true,unverifiedObjects:0}:name==='reserve_pdf_upload'?{id:'reservation',key:'new.pdf',bucket:'lesson-assets'}:name==='pdf_cleanup_candidates'?fixture.queue:{ok:true,contentVersion:2}
    return {data,error:null}
  })
  fixture.upload.mockReset().mockResolvedValue({error:null});fixture.remove.mockReset().mockResolvedValue({error:null})
})
describe('bounded PDF upload and cleanup boundary',()=>{
  it('advertises the same effective limit used for reservations and clamps legacy overrides',async()=>{
    const response=await api.fetch(request('/assets/limits'),{...env,PDF_MAX_BYTES:'20000000'})
    expect(response.status).toBe(200);expect(await response.json()).toMatchObject({maxPdfBytes:15000000})
    const smaller=await api.fetch(request('/assets/limits'),{...env,PDF_MAX_BYTES:'32'})
    expect(await smaller.json()).toMatchObject({maxPdfBytes:32})
    const uploaded=await api.fetch(put(),{...env,PDF_MAX_BYTES:'32'})
    expect(await uploaded.json()).toMatchObject({contentVersion:2})
    expect(fixture.rpc).toHaveBeenCalledWith('reserve_pdf_upload',expect.objectContaining({pdf_cap:32,incoming_bytes:13,acting_user:'a0000000-0000-4000-8000-000000000001'}))
  })
  it('rejects size/type/header violations before reserving or writing to Storage',async()=>{
    for(const req of [put('%PDF-12345678901234567890'),put('bad header'),put('%PDF-1.7',{'Content-Type':'text/plain'}),put('%PDF-1.7',{'Content-Length':'99'})])expect((await api.fetch(req,{...env,PDF_MAX_BYTES:'16'})).status).toBe(400)
    expect(fixture.rpc.mock.calls.some(([name])=>name==='reserve_pdf_upload')).toBe(false);expect(fixture.upload).not.toHaveBeenCalled()
  })
  it('cancels chunked input as soon as the byte ceiling is crossed without trusting content-length',async()=>{
    let index=0;let cancelled=false
    const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new TextEncoder().encode(index++===0?'%PDF-123':'12345678'))},cancel(){cancelled=true}})
    const req=new Request('https://api.example.test/upload',{method:'PUT',headers:{'Content-Type':'application/pdf'},body:stream,duplex:'half'} as RequestInit)
    await expect(readBoundedPdf(req,12)).rejects.toThrow('bytes or smaller');expect(cancelled).toBe(true);expect(index).toBeLessThanOrEqual(3)
  })
  it('marks failed or thrown provider uploads uncertain and never deletes or releases them automatically',async()=>{
    fixture.upload.mockResolvedValue({error:{message:'Network outcome unknown'}})
    const response=await api.fetch(put(),env);expect(response.status).toBe(400)
    expect(fixture.rpc).toHaveBeenCalledWith('settle_pdf_upload',{upload_id:'reservation',acting_user:'a0000000-0000-4000-8000-000000000001',upload_confirmed:false})
    expect(fixture.remove).not.toHaveBeenCalled();expect(fixture.rpc.mock.calls.some(([name])=>name==='confirm_pdf_cleanup')).toBe(false)
    fixture.upload.mockRejectedValue(new Error('connection lost'));expect((await api.fetch(put(),env)).status).toBe(400)
  })
  it('handles failed finalization only through the database cleanup queue, preserving attached objects',async()=>{
    fixture.errors.set('finalize_pdf_upload','Content changed')
    expect((await api.fetch(put(),env)).status).toBe(400)
    expect(fixture.rpc).toHaveBeenCalledWith('settle_pdf_upload',expect.objectContaining({upload_confirmed:true}))
    expect(fixture.remove).not.toHaveBeenCalled() // empty queue, including a possible committed attachment
  })
  it('keeps failed cleanup pending after a successful attachment and supports an operator retry',async()=>{
    fixture.queue=[{id:'old',object_key:'old.pdf',bucket:'lesson-assets'}];fixture.remove.mockResolvedValue({error:{message:'Storage unavailable'}})
    const response=await api.fetch(put(),env);expect(response.status).toBe(200);expect(await response.json()).toMatchObject({cleanupPending:true})
    expect(fixture.rpc.mock.calls.some(([name])=>name==='confirm_pdf_cleanup')).toBe(false)
    fixture.role='platform_admin';fixture.remove.mockResolvedValue({error:null})
    const retry=await api.fetch(request('/assets/cleanup','POST','{}'),env);expect(await retry.json()).toEqual({removed:1,failed:0})
    expect(fixture.rpc).toHaveBeenCalledWith('confirm_pdf_cleanup',{object_id:'old'})
  })
  it('denies non-staff uploads and reserves only after authoritative school permission succeeds',async()=>{
    fixture.role='student';expect((await api.fetch(put(),env)).status).toBe(400);expect(fixture.upload).not.toHaveBeenCalled()
    fixture.role='editor';fixture.errors.set('check_pdf_upload_access','PDF content unavailable for this staff account')
    expect((await api.fetch(put(),env)).status).toBe(400);expect(fixture.upload).not.toHaveBeenCalled()
    expect((await api.fetch(request('/assets/cleanup','POST','{}'),env)).status).toBe(400)
  })
  it('checks bucket configuration and restricts ledger monitoring to platform admins without quota lockout',async()=>{
    expect((await api.fetch(request('/assets/limits'),{...env,STORAGE_BUCKET:'wrong-bucket'})).status).toBe(400)
    expect((await api.fetch(request('/assets/storage'),env)).status).toBe(400)
    fixture.role='platform_admin';fixture.rpc.mockClear()
    expect((await api.fetch(request('/assets/storage'),env)).status).toBe(200)
    expect(fixture.rpc.mock.calls.some(([name])=>name==='reserve_api_request')).toBe(false)
  })
  it('detaches only through the authorized transaction before processing queued files',async()=>{
    const response=await api.fetch(request(`/assets/${content}`,'DELETE'),env)
    expect(response.status).toBe(200);expect(fixture.rpc).toHaveBeenCalledWith('detach_pdf_asset',{target_content:content,acting_user:'a0000000-0000-4000-8000-000000000001'})
  })
})
