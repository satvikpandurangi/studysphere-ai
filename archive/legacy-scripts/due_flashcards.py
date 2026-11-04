from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/StudentPages.tsx'
s=p.read_text(encoding='utf-8')
old="const cards=useLoad(async()=>{const {data,error}=await requireSupabase().from('flashcards').select('id,topic_id,front,back,school_id').limit(100);if(error)throw error;return data as {id:string;topic_id:string;front:string;back:string;school_id:string|null}[]},[]);"
new="const cards=useLoad(async()=>{const [published,reviews]=await Promise.all([requireSupabase().from('flashcards').select('id,topic_id,front,back,school_id').limit(100),requireSupabase().from('flashcard_reviews').select('flashcard_id,due_at').eq('student_id',user!.id)]);if(published.error)throw published.error;if(reviews.error)throw reviews.error;const due=new Map((reviews.data||[]).map(x=>[x.flashcard_id,new Date(x.due_at)]));return (published.data||[]).filter(card=>!due.has(card.id)||(due.get(card.id) as Date)<=new Date()) as {id:string;topic_id:string;front:string;back:string;school_id:string|null}[]},[user?.id]);"
if old not in s:raise RuntimeError('Flashcards loader missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
