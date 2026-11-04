import { describe, expect, it, vi } from 'vitest'
// Maintained CLI exports pure read/compare helpers; importing does not run the operator command.
// @ts-expect-error JavaScript CLI helper intentionally has no browser declaration file.
import { compareInventory, listStorageObjects } from '../scripts/storage-inventory.mjs'
describe('read-only storage inventory',()=>{
  it('paginates past 1000 entries and traverses nested folders without downloading files',async()=>{
    const root=[...Array.from({length:1001},(_,index)=>({id:String(index),name:`f${String(index).padStart(4,'0')}`,metadata:{size:10}})),{id:null,name:'nested',metadata:null}]
    const list=vi.fn(async(prefix:string,{offset,limit}:{offset:number;limit:number})=>({data:prefix?[{id:'nested-file',name:'lesson.pdf',metadata:{size:'20'}}]:root.slice(offset,offset+limit),error:null}))
    const rows=await listStorageObjects({list})
    expect(rows).toHaveLength(1002);expect(rows).toContainEqual({key:'nested/lesson.pdf',bytes:20});expect(list).toHaveBeenCalledTimes(3)
  })
  it('reports missing references, orphans, size discrepancies and concurrent ledger changes',()=>{
    const snapshot={policy:{revision:1,uploadsPaused:true},objects:[{object_key:'a',bytes:5},{object_key:'missing',bytes:10}],references:[{key:'a'},{key:'missing'}]}
    const data=compareInventory(snapshot,[{key:'a',bytes:6},{key:'orphan',bytes:null}],{revision:2,uploadsPaused:true,reservedUploads:1})
    expect(data).toMatchObject({stableLedger:false,missingReferenced:['missing'],untracked:['orphan'],unknownSizes:['orphan'],sizeMismatches:['a'],reservedUploads:1})
  })
  it('fails closed on listing errors and repeated pagination rather than reporting a complete inventory',async()=>{
    await expect(listStorageObjects({list:async()=>({data:null,error:{message:'offline'}})})).rejects.toThrow('no complete inventory')
    const repeated=Array.from({length:1000},(_,index)=>({id:String(index),name:String(index),metadata:{size:1}}))
    await expect(listStorageObjects({list:async()=>({data:repeated,error:null})})).rejects.toThrow('did not advance')
  })
})
