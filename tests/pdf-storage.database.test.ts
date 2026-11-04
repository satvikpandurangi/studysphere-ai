import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
let pg: PGlite
const editor='a0000000-0000-4000-8000-000000000001', other='a0000000-0000-4000-8000-000000000002', platform='a0000000-0000-4000-8000-000000000003', student='a0000000-0000-4000-8000-000000000004'
const school='b0000000-0000-4000-8000-000000000001', otherSchool='b0000000-0000-4000-8000-000000000002'
let legacy: string; let shared: string; let fresh: string; let second: string; let unknown: string
type Reservation={id:string;key:string;bucket:string}
async function role<T>(name:string,sql:string,args:unknown[]=[],actor=''){
  await pg.exec('savepoint pdf_case')
  try{
    await pg.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);await pg.exec(`set local role ${name}`)
    const result=await pg.query<T>(sql,args);await pg.exec('reset role;release savepoint pdf_case');return result.rows
  }catch(e){await pg.exec('rollback to savepoint pdf_case;release savepoint pdf_case');throw e}
}
async function rpc<T=Record<string,unknown>>(call:string,args:unknown[]=[]){return (await role<{value:T}>('service_role',`select ${call} as value`,args))[0].value}
async function state(){return rpc<Record<string,unknown>&{revision:number}>('public.pdf_storage_state()')}
async function reserve(id=fresh,bytes=30,actor=editor,pdfCap=15000000,storageCap=100){return rpc<Reservation>('public.reserve_pdf_upload($1,$2,$3,$4,$5)',[id,actor,bytes,pdfCap,storageCap])}
async function finish(row:Reservation,actor=editor){return rpc('public.finalize_pdf_upload($1,$2)',[row.id,actor])}
async function settle(row:Reservation,confirmed=true){return rpc('public.settle_pdf_upload($1,$2,$3)',[row.id,editor,confirmed])}
async function reconcile(key:string,bytes:number|null,revision?:number,actor=platform,confirmed=true){return rpc('public.reconcile_pdf_asset($1,$2,$3,$4,$5)',[actor,key,bytes,revision??(await state()).revision,confirmed])}
async function enable(){await rpc('public.complete_pdf_storage_review($1,$2,true)',[platform,(await state()).revision])}
beforeAll(async()=>{
  pg=new PGlite()
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;`)
  const directory=new URL('../supabase/migrations/',import.meta.url)
  for(const file of (await readdir(directory)).filter(file=>file.endsWith('.sql')&&file<'202610220005_pdf_storage_ledger.sql').sort())await pg.exec((await readFile(new URL(file,directory),'utf8')).replace('create extension if not exists pgcrypto;',''))
  for(const id of [editor,other,platform,student])await pg.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`${id}@example.test`])
  await pg.query("update public.profiles set role='editor' where id in ($1,$2)",[editor,other]);await pg.query("update public.profiles set role='platform_admin' where id=$1",[platform]);await pg.query("update public.profiles set role='student' where id=$1",[student])
  await pg.query("insert into public.schools(id,name) values($1,'PDF A'),($2,'PDF B')",[school,otherSchool])
  await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'editor'),($3,$4,'editor')",[editor,school,other,otherSchool])
  const subject=(await pg.query<{id:string}>('select id from public.subjects limit 1')).rows[0].id
  const chapter=(await pg.query<{id:string}>("insert into public.chapters(subject_id,title) values($1,'PDF') returning id",[subject])).rows[0].id
  const topic=(await pg.query<{id:string}>("insert into public.topics(chapter_id,title) values($1,'PDF') returning id",[chapter])).rows[0].id
  const make=async(title:string,key:string|null,bytes:number,status='draft')=>(await pg.query<{id:string}>('insert into public.content_items(topic_id,school_id,kind,title,object_key,asset_bytes,pdf_text,status) values($1,$2,\'pdf\',$3,$4,$5,\'Old text\',$6) returning id',[topic,school,title,key,bytes,status])).rows[0].id
  legacy=await make('Existing','legacy.pdf',40,'published');shared=await make('Shared legacy','legacy.pdf',40,'published');fresh=await make('New',null,0);second=await make('Second',null,0);unknown=await make('Unknown legacy','unknown.pdf',0)
  await pg.exec(await readFile(new URL('202610220005_pdf_storage_ledger.sql',directory),'utf8'))
  await pg.exec(await readFile(new URL('20261028232250_pdf_singleton_safe_updates.sql',directory),'utf8'))
},60000)
beforeEach(async()=>{await pg.exec('begin')})
afterEach(async()=>{await pg.exec('rollback')})
afterAll(async()=>{await pg?.close()})
async function ready(){await reconcile('unknown.pdf',10);await enable()}

describe('PDF capacity ledger and storage transactions',()=>{
  it('forward fix preserves policy and objects while review and ledger updates advance the singleton',async()=>{
    const before=await state()
    const objects=(await pg.query('select object_key,bytes,state from public.pdf_asset_objects order by object_key')).rows
    const forward=await readFile(new URL('../supabase/migrations/20261028232250_pdf_singleton_safe_updates.sql',import.meta.url),'utf8')
    // The test already owns a rollback transaction; retain it around the DDL.
    await pg.exec(forward.replace(/^begin;$/m,'').replace(/^commit;$/m,''))
    expect(await state()).toEqual(before)
    expect((await pg.query('select object_key,bytes,state from public.pdf_asset_objects order by object_key')).rows).toEqual(objects)
    await ready()
    const reviewed=await state();expect(reviewed.uploadsPaused).toBe(false)
    const reservation=await reserve()
    expect((await state()).revision).toBe(reviewed.revision+1)
    await finish(reservation)
    expect((await state()).revision).toBeGreaterThan(reviewed.revision+1)
    await expect(role('authenticated','select public.complete_pdf_storage_review($1,$2,true)',[platform,(await state()).revision],platform)).rejects.toThrow('permission denied')
  })
  it('preserves old pointers/status/text, deduplicates shared keys and pauses for initial inventory',async()=>{
    const data=await state();expect(data).toMatchObject({accountedBytes:40,unverifiedObjects:1,uploadsPaused:true,inventoryReviewed:false})
    expect((await pg.query('select object_key,status,pdf_text from public.content_items where id=$1',[legacy])).rows[0]).toEqual({object_key:'legacy.pdf',status:'published',pdf_text:'Old text'})
    await expect(reserve()).rejects.toThrow('paused')
    await expect(enable()).rejects.toThrow('unknown sizes')
    await reconcile('unknown.pdf',10);await enable();expect((await state()).inventoryReviewed).toBe(true)
  })
  it('serial reservations count full overlap and reject another upload before capacity is exceeded',async()=>{
    await ready();const first=await reserve(fresh,30);expect((await state()).accountedBytes).toBe(80)
    await expect(reserve(second,21)).rejects.toThrow('capacity reached')
    await expect(reserve(fresh,5)).rejects.toThrow('pending upload')
    await finish(first);expect((await state()).accountedBytes).toBe(80)
    const replacement=await reserve(fresh,20);expect((await state()).accountedBytes).toBe(100)
    await finish(replacement);expect((await state()).pendingBytes).toBe(30)
    await expect(reserve(second,5)).rejects.toThrow('capacity reached')
    await rpc('public.confirm_pdf_cleanup($1)',[first.id]);expect((await state()).accountedBytes).toBe(70)
  })
  it('keeps a shared file active until the last live reference is detached',async()=>{
    await ready();await rpc('public.detach_pdf_asset($1,$2)',[legacy,editor]);expect((await state()).cleanupObjects).toBe(0)
    await rpc('public.detach_pdf_asset($1,$2)',[shared,editor]);expect((await state()).cleanupObjects).toBe(1)
    const rows=await rpc<{id:string}[]>('public.pdf_cleanup_candidates()');await rpc('public.confirm_pdf_cleanup($1)',[rows[0].id]);expect((await state()).accountedBytes).toBe(10)
  })
  it('atomically attaches confirmed files as drafts with cleared old text and ignores a lost finalize response',async()=>{
    await ready();const row=await reserve(legacy,20);const final=await finish(row);await settle(row)
    expect((await pg.query('select object_key,status,pdf_text,asset_bytes from public.content_items where id=$1',[legacy])).rows[0]).toEqual({object_key:row.key,status:'draft',pdf_text:null,asset_bytes:20})
    expect(await rpc('public.pdf_cleanup_candidates()')).toEqual([])
    expect((await state()).activeBytes).toBe(70)
    await pg.query("update public.content_items set title='Intervening edit' where id=$1",[legacy])
    expect(await role('authenticated',"update public.content_items set pdf_text='Stale text',status='published',author_id=$2 where id=$1 and version=$3 returning id",[legacy,editor,final.contentVersion],editor)).toEqual([])
  })
  it('retains uncertain capacity without automatic expiry or eligibility for cleanup',async()=>{
    await ready();const row=await reserve();await settle(row,false)
    await pg.query("update public.pdf_asset_objects set created_at=now()-interval '2 days' where id=$1",[row.id])
    expect((await state()).uncertainUploads).toBe(1);expect((await state()).accountedBytes).toBe(80)
    expect(await rpc('public.pdf_cleanup_candidates()')).toEqual([])
    await rpc('public.confirm_pdf_cleanup($1)',[row.id]);expect((await state()).accountedBytes).toBe(80)
    await expect(reserve()).rejects.toThrow('pending upload')
  })
  it('rejects stale finalization and lost staff authority while retaining the old published file',async()=>{
    await ready();const row=await reserve(legacy,20)
    await pg.query("update public.content_items set title='Other edit' where id=$1",[legacy])
    await expect(finish(row)).rejects.toThrow('changed during upload');await settle(row)
    expect((await pg.query('select object_key,status,pdf_text from public.content_items where id=$1',[legacy])).rows[0]).toEqual({object_key:'legacy.pdf',status:'published',pdf_text:'Old text'})
    const revoked=await reserve(fresh,10);await pg.query('delete from public.memberships where user_id=$1',[editor]);await expect(finish(revoked)).rejects.toThrow('changed during upload')
  })
  it('enforces school/global authoring, file size, and effective capacity caps',async()=>{
    await ready()
    for(const actor of [other,student])await expect(reserve(fresh,20,actor)).rejects.toThrow('unavailable')
    for(const size of [0,4,15000001])await expect(reserve(fresh,size)).rejects.toThrow('file-size limit')
    await expect(reserve(fresh,20,editor,10)).rejects.toThrow('file-size limit')
    await expect(reserve(fresh,20,editor,15000000,60)).rejects.toThrow('capacity reached')
    await pg.query('update public.content_items set school_id=null where id=$1',[fresh]);await expect(reserve()).rejects.toThrow('unavailable');await reserve(fresh,20,platform)
    await pg.exec('update public.pdf_storage_policy set max_pdf_bytes=10')
    const snapshot=await role<{value:{pdfMaxBytes:number}}>('authenticated','select public.platform_usage_snapshot() as value',[],platform)
    expect(snapshot[0].value.pdfMaxBytes).toBe(10)
  })
  it('denies all client/anonymous ledger RPCs and raw attachment mutation, even for platform users',async()=>{
    for(const actor of [editor,student,platform]){
      await expect(role('authenticated','select public.pdf_storage_state()',[],actor)).rejects.toThrow('permission denied')
      await expect(role('authenticated','select * from public.pdf_asset_objects',[],actor)).rejects.toThrow('permission denied')
      await expect(role('authenticated','select public.reserve_pdf_upload($1,$2,10,15000000,800000000)',[fresh,actor],actor)).rejects.toThrow('permission denied')
    }
    await expect(role('anon','select public.pdf_cleanup_candidates()')).rejects.toThrow('permission denied')
    await pg.exec('grant update(object_key) on public.content_items to service_role;grant select on public.content_items to service_role')
    await expect(role('service_role',"update public.content_items set object_key='bypass.pdf' where id=$1",[fresh])).rejects.toThrow('storage transaction')
  })
  it('requires detachment before type changes and an attachment before publication',async()=>{
    await expect(role('authenticated',"update public.content_items set kind='lesson',author_id=$2 where id=$1",[legacy,editor],editor)).rejects.toThrow('Remove the attached PDF')
    await expect(role('authenticated',"update public.content_items set status='published',author_id=$2 where id=$1",[fresh,editor],editor)).rejects.toThrow('Upload a PDF')
    await rpc('public.detach_pdf_asset($1,$2)',[legacy,editor])
    await role('authenticated',"update public.content_items set kind='lesson',author_id=$2 where id=$1",[legacy,editor],editor)
  })
  it('reconciles observed orphan sizes and missing unreferenced objects only during stable reviewed maintenance',async()=>{
    await reconcile('orphan.pdf',25);expect((await state()).accountedBytes).toBe(65)
    await expect(reconcile('orphan.pdf',null,1)).rejects.toThrow('refresh the inventory')
    await expect(reconcile('legacy.pdf',null)).rejects.toThrow('Referenced PDF is missing')
    await expect(reconcile('orphan.pdf',25,undefined,editor)).rejects.toThrow('Platform review')
    await expect(reconcile('orphan.pdf',25,undefined,platform,false)).rejects.toThrow('Platform review')
    await reconcile('orphan.pdf',null);expect((await state()).accountedBytes).toBe(40)
    await reconcile('unknown.pdf',10);expect((await pg.query('select asset_bytes from public.content_items where id=$1',[unknown])).rows[0].asset_bytes).toBe(10)
    await enable();await expect(reconcile('orphan.pdf',25)).rejects.toThrow('Pause uploads')
  })
  it('never treats a live reservation as abandoned without pause, age and explicit platform confirmation',async()=>{
    await ready();const row=await reserve()
    await expect(rpc('public.mark_abandoned_pdf_upload($1,$2,true)',[row.id,platform])).rejects.toThrow('Pause uploads')
    await pg.exec('update public.pdf_storage_policy set uploads_paused=true,revision=revision+1')
    await expect(reconcile(row.key,null)).rejects.toThrow('in-flight reservations')
    await expect(rpc('public.mark_abandoned_pdf_upload($1,$2,true)',[row.id,platform])).rejects.toThrow('not eligible')
    await pg.query("update public.pdf_asset_objects set created_at=now()-interval '2 hours' where id=$1",[row.id])
    await rpc('public.mark_abandoned_pdf_upload($1,$2,true)',[row.id,platform]);await expect(enable()).rejects.toThrow('pending writes')
    await reconcile(row.key,null);await enable();expect((await state()).accountedBytes).toBe(50)
  })
  it('holds newly observed unreferenced files without deleting them until explicit platform approval',async()=>{
    await reconcile('unrecognized.bin',25)
    expect((await state()).heldObjects).toBe(1);expect(await rpc('public.pdf_cleanup_candidates()')).toEqual([])
    await expect(rpc('public.approve_pdf_object_cleanup($1,$2,$3,false)',[platform,'unrecognized.bin',(await state()).revision])).rejects.toThrow('Explicit platform approval')
    await rpc('public.approve_pdf_object_cleanup($1,$2,$3,true)',[platform,'unrecognized.bin',(await state()).revision])
    expect((await rpc<unknown[]>('public.pdf_cleanup_candidates()'))).toHaveLength(1)
  })
})
