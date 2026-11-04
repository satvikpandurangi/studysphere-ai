from pathlib import Path

path = Path('outputs/studysphere-ai/src/pages/StaffPages.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace(
    "const catalogs=useLoad(async()=>({schools:await db.schools(),boards:await db.boards(),grades:await db.grades()}),[]);",
    "const catalogs=useLoad(async()=>{const schools=await db.schools();const {data:memberships}=await requireSupabase().from('memberships').select('school_id');return {schools,boards:await db.boards(),grades:await db.grades(),memberships:memberships||[]}},[]);"
)
text = text.replace(
    "if(file){if(file.type!=='application/pdf')throw new Error('Only PDF files are supported.');if(file.size>20*1024*1024)throw new Error('PDF must be 20 MB or smaller.');setPdfText(await extractPdf(file))}const item=",
    "if(file){if(file.type!=='application/pdf')throw new Error('Only PDF files are supported.');if(file.size>20*1024*1024)throw new Error('PDF must be 20 MB or smaller.');setPdfText(await extractPdf(file))}if(profile?.role!=='platform_admin'&&!school)throw new Error('Choose your school for this content.');const item="
)
text = text.replace("status,position:items.data?.length||0", "status:file?'draft':status,position:items.data?.length||0")
text = text.replace(
    "if(file)await upload(item.id,file);setEditId(item.id);",
    "if(file){await upload(item.id,file);if(status==='published')await db.saveContent({...item,status:'published'});}setEditId(item.id);"
)
text = text.replace(
    '<option value="">All schools</option>{catalogs.data?.schools.map((s:School)',
    '<option value="">{profile?.role===\'platform_admin\'?\'All schools\':\'Choose your school\'}</option>{catalogs.data?.schools.filter((s:School)=>profile?.role===\'platform_admin\'||catalogs.data?.memberships.some(m=>m.school_id===s.id)).map((s:School)'
)
text = text.replace("disabled={profile?.role!=='platform_admin'&&profile?.role!=='school_admin'}", "")
path.write_text(text, encoding='utf-8')
