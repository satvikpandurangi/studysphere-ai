import { describe, expect, it, vi } from 'vitest'
import { savePdfContent } from '../src/lib/pdfPublishing'
import { validatePdfFile } from '../src/lib/pdfAssets'
import type { ContentItem } from '../src/lib/types'
const metadata={kind:'pdf' as const,topic_id:'topic',title:'New title',pdf_text:'New text',status:'published' as const}
const file=new File(['%PDF-1.7'], 'lesson.pdf',{type:'application/pdf'})
function actions(){return {save:vi.fn().mockResolvedValue({id:'content'} as ContentItem),upload:vi.fn().mockResolvedValue({cleanupPending:false,contentVersion:2}),onDraft:vi.fn(),onAttached:vi.fn(),onReloadRequired:vi.fn()}}
describe('safe PDF content publication',()=>{
  it('enforces current limits, maintenance and inventory before extraction/upload',()=>{
    const limits={maxPdfBytes:15000000,uploadsPaused:false,needsInventory:false}
    expect(()=>validatePdfFile({type:'application/pdf',size:15000000},limits)).not.toThrow()
    for(const item of [{type:'application/pdf',size:15000001},{type:'text/plain',size:10}])expect(()=>validatePdfFile(item,limits)).toThrow()
    expect(()=>validatePdfFile(file,{...limits,uploadsPaused:true})).toThrow('paused')
    expect(()=>validatePdfFile(file,{...limits,needsInventory:true})).toThrow('reconcile')
  })
  it('does not alter old metadata/text/publication when replacing an existing file fails',async()=>{
    const a=actions();a.upload.mockRejectedValue(new Error('uncertain'))
    await expect(savePdfContent({id:'existing',metadata,file},a)).rejects.toThrow('uncertain')
    expect(a.save).not.toHaveBeenCalled();expect(a.onReloadRequired).toHaveBeenCalled();expect(a.onAttached).not.toHaveBeenCalled()
  })
  it('writes reviewed text/publication only after confirmed upload',async()=>{
    const a=actions();await savePdfContent({id:'existing',metadata,file},a)
    expect(a.upload.mock.invocationCallOrder[0]).toBeLessThan(a.save.mock.invocationCallOrder[0])
    expect(a.save).toHaveBeenCalledWith({...metadata,id:'existing'},2);expect(a.onAttached).toHaveBeenCalled()
  })
  it('retains the new draft ID with no searchable new text if its first upload fails',async()=>{
    const a=actions();a.upload.mockRejectedValue(new Error('offline'))
    await expect(savePdfContent({id:null,metadata,file},a)).rejects.toThrow('offline')
    expect(a.save).toHaveBeenCalledOnce();expect(a.save).toHaveBeenCalledWith({...metadata,status:'draft',pdf_text:null})
    expect(a.onDraft).toHaveBeenCalledWith('content')
  })
  it('clears the selected upload before metadata retry if post-upload save fails',async()=>{
    const a=actions();a.save.mockRejectedValue(new Error('metadata conflict'))
    await expect(savePdfContent({id:'existing',metadata,file},a)).rejects.toThrow('metadata conflict')
    expect(a.onAttached.mock.invocationCallOrder[0]).toBeLessThan(a.save.mock.invocationCallOrder[0]);expect(a.onReloadRequired).toHaveBeenCalled()
  })
})
