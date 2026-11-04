from pathlib import Path
path=Path('outputs/studysphere-ai/src/pages/StaffPages.tsx')
text=path.read_text(encoding='utf-8')
old="await db.saveContent({...item,status:'published'})"
new="await db.saveContent({id:item.id,topic_id:item.topic_id,school_id:item.school_id,kind:item.kind,title:item.title,body_md:item.body_md,answer_md:item.answer_md,video_id:item.video_id,pdf_text:item.pdf_text,status:'published',position:item.position})"
assert old in text
path.write_text(text.replace(old,new),encoding='utf-8')
