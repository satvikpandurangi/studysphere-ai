from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/ParentPages.tsx'
s=p.read_text(encoding='utf-8')
old="catch(e){setError(e instanceof Error?e.message:String(e))}}return <div className=\"page\"><div className=\"section-heading page-heading\">"
new="catch(e){setError(e instanceof Error?e.message:String(e))}}async function approve(studentId:string){try{await workerFetch('/students/consent',{studentId,status:'approved'});await children.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}}return <div className=\"page\"><div className=\"section-heading page-heading\">"
if old not in s:raise RuntimeError('Children return anchor missing')
s=s.replace(old,new,1)
old="{c.approval_status==='approved'&&<button className=\"text-button danger\" onClick={()=>withdraw(c.student_id)}>Withdraw approval</button>}"
new="{c.approval_status==='approved'?<button className=\"text-button danger\" onClick={()=>withdraw(c.student_id)}>Withdraw approval</button>:c.approval_status==='withdrawn'?<button className=\"text-button\" onClick={()=>approve(c.student_id)}>Approve again</button>:null}"
if old not in s:raise RuntimeError('Consent button missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
