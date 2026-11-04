from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/StudentPages.tsx'
s=p.read_text(encoding='utf-8')
old='const subjects=useLoad(()=>db.subjects(boardId,gradeId),[boardId,gradeId]);'
if s.count(old)!=2:raise RuntimeError(f'Expected 2 uses, found {s.count(old)}')
s=s.replace(old,'const subjects=useLoad(()=>db.assignedSubjects(studentId,boardId,gradeId),[studentId,boardId,gradeId]);',1)
old='function LearnInner({boardId,gradeId}:{boardId:string;gradeId:string}){const subjects=useLoad(()=>db.subjects(boardId,gradeId),[boardId,gradeId]);'
new='function LearnInner({boardId,gradeId}:{boardId:string;gradeId:string}){const {user}=useAuth();const subjects=useLoad(()=>db.assignedSubjects(user!.id,boardId,gradeId),[user?.id,boardId,gradeId]);'
if old not in s:raise RuntimeError('Learn function not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
