from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/StudentPages.tsx'
s=p.read_text(encoding='utf-8')
old='const plan=useLoad(()=>db.plan(studentId),[studentId]);'
new="""const plan=useLoad(()=>db.plan(studentId),[studentId]);const recent=useLoad(async()=>{const {data,error}=await requireSupabase().from('topic_progress').select('topic_id,completed_at').eq('student_id',studentId).order('completed_at',{ascending:false}).limit(4);if(error)throw error;if(!data?.length)return [] as {title:string;completed_at:string}[];const topics=await requireSupabase().from('topics').select('id,title').in('id',data.map(x=>x.topic_id));if(topics.error)throw topics.error;const names=new Map((topics.data||[]).map(x=>[x.id,x.title]));return data.map(x=>({title:names.get(x.topic_id)||'Topic',completed_at:x.completed_at}))},[studentId]);"""
if old not in s:raise RuntimeError('Plan hook missing')
s=s.replace(old,new,1)
old='</div><div className="encouragement"><Sparkles size={24}/>'
new='</div><div className="plan-panel recent-panel"><div className="section-heading"><h2>Recently learned</h2></div>{recent.loading?<Loading/>:recent.error?<ErrorNotice message={recent.error}/>:recent.data?.length?recent.data.map((item,i)=><div className="plan-row" key={`${item.completed_at}-${i}`}><CheckCircle2 size={19} color="#169f7a"/><span>{item.title}</span></div>):<p className="muted">Completed topics will appear here.</p>}</div><div className="encouragement"><Sparkles size={24}/>'
if old not in s:raise RuntimeError('Dashboard aside missing')
s=s.replace(old,new,1)
s=s.replace('Good morning, {name}', "{new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening'}, {name}",1)
p.write_text(s,encoding='utf-8')
