from pathlib import Path
root=Path(__file__).resolve().parent.parent/'outputs'/'studysphere-ai'
page=root/'src/pages/StudentPages.tsx'
source=page.read_text(encoding='utf-8')
source=source[:source.index('export function PlanPage(){')]
source=source.replace('CircleHelp, Plus, Search', 'CircleHelp, Search')
source=source.replace('ContentItem, PlanItem, Topic', 'ContentItem, Topic')
page.write_text(source,encoding='utf-8')
app=root/'src/App.tsx'
source=app.read_text(encoding='utf-8').replace("const PlanPage=lazy(()=>import('./pages/StudentPages').then(m=>({default:m.PlanPage})))", "const PlanPage=lazy(()=>import('./pages/PlanPage').then(m=>({default:m.PlanPage})))")
app.write_text(source,encoding='utf-8')
