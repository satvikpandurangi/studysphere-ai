from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/AuthoringPages.tsx'
s=p.read_text(encoding='utf-8')
a=s.index('export function CurriculumPage(){')
b=s.index('type QuizDraft=',a)
section=s[a:b]
old="export function CurriculumPage(){const {profile}=useAuth();"
new="export function CurriculumPage(){const {profile}=useAuth();const [catalogVersion,setCatalogVersion]=useState(0);"
if old not in section:raise RuntimeError('Curriculum header missing')
section=section.replace(old,new,1)
old='<CurriculumSelector onSelect={setSelection}/>'
new='<CatalogEditor onCreated={()=>setCatalogVersion(v=>v+1)}/><CurriculumSelector key={catalogVersion} onSelect={setSelection}/>'
if old not in section:raise RuntimeError('Selector missing')
section=section.replace(old,new,1)
p.write_text(s[:a]+section+s[b:],encoding='utf-8')
