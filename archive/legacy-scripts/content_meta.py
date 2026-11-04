from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/StaffPages.tsx'
s=p.read_text(encoding='utf-8')
def rep(a,b):
    global s
    if a not in s:raise RuntimeError(a)
    s=s.replace(a,b,1)
rep("const [videoUrl,setVideoUrl]=useState('');", "const [videoUrl,setVideoUrl]=useState('');const [attribution,setAttribution]=useState('');const [language,setLanguage]=useState('en');")
rep("setVideoUrl(item.video_id?`https://www.youtube.com/watch?v=${item.video_id}`:'');", "setVideoUrl(item.video_id?`https://www.youtube.com/watch?v=${item.video_id}`:'');setAttribution(item.attribution||'');setLanguage(item.language||'en');")
rep("setVideoUrl('');setPdfText('');", "setVideoUrl('');setAttribution('');setLanguage('en');setPdfText('');")
rep("video_id:kind==='video'?videoId(videoUrl):null,pdf_text:", "video_id:kind==='video'?videoId(videoUrl):null,attribution:attribution||null,language,pdf_text:")
rep("video_id:item.video_id,pdf_text:item.pdf_text", "video_id:item.video_id,attribution:item.attribution,language:item.language,pdf_text:item.pdf_text")
rep('<Field label="Title"><input required value={title}', '<div className="form-grid"><Field label="Language"><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="kn">Kannada</option><option value="hi">Hindi</option></select></Field><Field label="Attribution"><input value={attribution} onChange={e=>setAttribution(e.target.value)} maxLength={200} placeholder="Creator or source"/></Field></div><Field label="Title"><input required value={title}')
rep('{message&&<div className="notice success" role="status">{message}</div>}</form>', '{message&&<div className="notice success" role="status">{message}</div>}{editId&&<ContentHistory contentId={editId} version={items.data?.find(x=>x.id===editId)?.version||1}/>}</form>')
p.write_text(s,encoding='utf-8')
