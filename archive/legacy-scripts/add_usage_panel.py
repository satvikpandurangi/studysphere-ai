from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/StaffPages.tsx'
s=p.read_text(encoding='utf-8')
old='</div>}\n\nasync function extractPdf'
new='<UsagePanel/></div>}\n\nasync function extractPdf'
if old not in s:raise RuntimeError('Dashboard end missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
