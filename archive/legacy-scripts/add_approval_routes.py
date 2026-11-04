from pathlib import Path
path=Path('outputs/studysphere-ai/worker/index.ts')
text=path.read_text(encoding='utf-8')
needle="else if(request.method==='POST'&&url.pathname==='/students/consent')response=await changeConsent(request,a);"
replacement=needle+"else if(request.method==='GET'&&url.pathname==='/students/pending')response=await pendingStudents(a,uuid(url.searchParams.get('schoolId'),'school'));else if(request.method==='POST'&&url.pathname==='/students/school-approval')response=await schoolApproval(request,a);"
assert needle in text
path.write_text(text.replace(needle,replacement),encoding='utf-8')
