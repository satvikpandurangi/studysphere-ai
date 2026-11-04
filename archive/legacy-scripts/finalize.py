from pathlib import Path

root = Path(__file__).resolve().parent.parent / 'outputs' / 'studysphere-ai'


def change(relative, before, after):
    path = root / relative
    source = path.read_text(encoding='utf-8')
    if before not in source:
        raise RuntimeError(f'Missing expected text in {relative}: {before[:80]!r}')
    path.write_text(source.replace(before, after, 1), encoding='utf-8')


change('worker/index.ts', 'response=await inviteStaff(request,a);', 'response=await inviteStaff(request,a,env);')
change('worker/index.ts', ".select('id,kind,school_id').eq('id',contentId)", ".select('id,kind,school_id,object_key').eq('id',contentId)")
change('worker/index.ts', "if(updateError){await env.LESSON_ASSETS.delete(key);throw updateError}return respond({ok:true})", "if(updateError){await env.LESSON_ASSETS.delete(key);throw updateError}if(item.object_key)await env.LESSON_ASSETS.delete(item.object_key);return respond({ok:true})")
change('src/pages/StaffPages.tsx', "const extracted=file?await extractPdf(file):pdfText;", "const extracted=file?(pdfText.trim()||await extractPdf(file)):pdfText;")
change('src/pages/StudentPages.tsx', "if(profile.error)return <div className=\"page\"><ErrorNotice message={profile.error}/><Link to=\"/app/onboarding\">Complete your setup</Link></div>;if(!profile.data)return <NavigateOnboarding/>;", "if(profile.error)return <div className=\"page\"><ErrorNotice message={profile.error}/></div>;if(!profile.data)return <div className=\"page\"><PageTitle title=\"Account setup pending\" subtitle=\"Ask your parent or school administrator to finish your student account.\"/></div>;")
start = "function NavigateOnboarding(){"
end = "\n\nexport function StudentDashboard"
path = root / 'src/pages/StudentPages.tsx'
source = path.read_text(encoding='utf-8')
first = source.index(start)
last = source.index(end, first)
source = source[:first] + source[last:]
first = source.index('export function StudentOnboarding(){')
last = source.index('\n\nexport function LearnPage()', first)
source = source[:first] + source[last:]
source = source.replace("import { Link, useNavigate, useParams }", "import { Link, useParams }")
source = source.replace("import type { Board, Chapter, ContentItem, Grade, PlanItem, School, Subject, Topic }", "import type { Chapter, ContentItem, PlanItem, Subject, Topic }")
path.write_text(source, encoding='utf-8')
change('src/App.tsx', ', StudentOnboarding }', ' }')
change('src/App.tsx', '<Route path="onboarding" element={<StudentOnboarding/>}/>', '')

seed = root / 'supabase/seed.sql'
source = seed.read_text(encoding='utf-8')
source = source.replace('\\\\frac', '\\frac')
source = source.replace('\\n', '\n')
seed.write_text(source, encoding='utf-8')

staff = root / 'src/pages/StaffPages.tsx'
source = staff.read_text(encoding='utf-8')
source = source[:source.index('export function SchoolsPage(){')] + '''export function SchoolsPage(){
  const {profile}=useAuth();
  const schools=useLoad(()=>db.schools(),[]);
  const memberships=useLoad(async()=>{const {data,error}=await requireSupabase().from('memberships').select('school_id,role');if(error)throw error;return data||[]},[]);
  const [email,setEmail]=useState('');const [school,setSchool]=useState('');const [role,setRole]=useState<'editor'|'school_admin'>('editor');
  const [name,setName]=useState('');const [city,setCity]=useState('');const [state,setState]=useState('');
  const [message,setMessage]=useState('');const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState(false);
  const manageable=schools.data?.filter(s=>profile?.role==='platform_admin'||memberships.data?.some(m=>m.school_id===s.id&&m.role==='school_admin'))||[];
  async function invite(e:FormEvent){e.preventDefault();setBusy(true);setError(null);setMessage('');try{await workerFetch('/staff/invite',{email,schoolId:school,role});setMessage('Invitation sent.');setEmail('')}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  async function create(e:FormEvent){e.preventDefault();setBusy(true);setError(null);setMessage('');try{await workerFetch('/schools/create',{name,city,state});setMessage('School created.');setName('');setCity('');setState('');await schools.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  return <div className="page"><h1>Schools & people</h1><p className="page-subtitle">Manage the people who shape your learning space.</p>
    {schools.loading?<Loading/>:schools.error?<ErrorNotice message={schools.error}/>:<div className="school-grid">{schools.data?.map(s=><div className="school-card" key={s.id}><Building2 size={22}/><h2>{s.name}</h2><p>{[s.city,s.state].filter(Boolean).join(', ')||'India'}</p></div>)}</div>}
    {profile?.role==='platform_admin'&&<form className="form-panel invite-form" onSubmit={create}><h2>Add a school</h2><div className="form-grid"><Field label="School name"><input required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="City"><input maxLength={100} value={city} onChange={e=>setCity(e.target.value)}/></Field><Field label="State"><input maxLength={100} value={state} onChange={e=>setState(e.target.value)}/></Field></div><Button disabled={busy}><Building2 size={17}/> Create school</Button></form>}
    {manageable.length>0&&<form className="form-panel invite-form" onSubmit={invite}><h2>Invite staff</h2><div className="form-grid"><Field label="Email address"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="School"><select required value={school} onChange={e=>setSchool(e.target.value)}><option value="">Choose school</option>{manageable.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Role"><select value={role} onChange={e=>setRole(e.target.value as 'editor'|'school_admin')}><option value="editor">Content editor</option><option value="school_admin">School administrator</option></select></Field></div><Button disabled={busy}><UploadCloud size={17}/> Send invitation</Button></form>}
    <ErrorNotice message={error}/>{message&&<div className="notice success" role="status">{message}</div>}
  </div>
}
'''
staff.write_text(source, encoding='utf-8')

parent = root / 'src/pages/ParentPages.tsx'
source = parent.read_text(encoding='utf-8')
source = source.replace('as described in the privacy notice.</span>', 'as described in the <Link to="/privacy" target="_blank">data use summary</Link>.</span>')
parent.write_text(source, encoding='utf-8')
