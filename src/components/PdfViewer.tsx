import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { requireSupabase } from '../lib/supabase'
import { Button, ErrorNotice, Loading } from './Ui'

GlobalWorkerOptions.workerSrc = workerUrl
export function PdfViewer({contentId}:{contentId:string}){
  const canvas=useRef<HTMLCanvasElement>(null); const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null); const [page,setPage]=useState(1); const [scale,setScale]=useState(1.25); const [error,setError]=useState<string|null>(null)
  useEffect(()=>{let live=true;let document:PDFDocumentProxy|null=null;(async()=>{const {data:{session}}=await requireSupabase().auth.getSession();if(!session)throw new Error('Sign in again.');const base=import.meta.env.VITE_API_BASE_URL;if(!base)throw new Error('Secure API is not configured.');const response=await fetch(`${base.replace(/\/$/,'')}/assets/${contentId}`,{cache:'no-store',headers:{Authorization:`Bearer ${session.access_token}`}});if(!response.ok)throw new Error('PDF unavailable.');const bytes=new Uint8Array(await response.arrayBuffer());return getDocument({data:bytes}).promise})().then(p=>{document=p;if(live)setPdf(p)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false;void document?.destroy()}},[contentId])
  useEffect(()=>{if(!pdf||!canvas)return;let cancelled=false;let task:RenderTask|null=null;pdf.getPage(page).then(p=>{if(cancelled)return;const viewport=p.getViewport({scale});const el=canvas.current;if(!el)return;const context=el.getContext('2d');if(!context)return;el.height=viewport.height;el.width=viewport.width;task=p.render({canvas:el,canvasContext:context,viewport});return task.promise}).catch(e=>{if(!cancelled&&e?.name!=='RenderingCancelledException')setError(e.message)});return()=>{cancelled=true;task?.cancel()}},[pdf,page,scale])
  if(error)return <ErrorNotice message={error}/>;if(!pdf)return <Loading label="Opening lesson PDF…"/>
  return <div className="pdf-viewer"><div className="pdf-toolbar"><span>Page {page} of {pdf.numPages}</span><div><Button variant="ghost" aria-label="Previous page" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/></Button><Button variant="ghost" aria-label="Next page" disabled={page>=pdf.numPages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={18}/></Button><Button variant="ghost" aria-label="Zoom out" onClick={()=>setScale(s=>Math.max(.75,s-.25))}><ZoomOut size={18}/></Button><Button variant="ghost" aria-label="Zoom in" onClick={()=>setScale(s=>Math.min(2,s+.25))}><ZoomIn size={18}/></Button></div></div><div className="pdf-canvas-wrap"><canvas ref={canvas} aria-label={`PDF page ${page}`}/></div></div>
}
