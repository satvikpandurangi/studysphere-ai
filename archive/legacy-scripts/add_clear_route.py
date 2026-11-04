from pathlib import Path
path=Path('outputs/studysphere-ai/worker/index.ts')
text=path.read_text(encoding='utf-8')
needle="else if(request.method==='POST'&&url.pathname==='/privacy/request')response=await privacy(request,a);"
replace="else if(request.method==='DELETE'&&segments[0]==='ai'&&segments[1]==='conversation'&&segments[2])response=await clearConversation(a,uuid(segments[2],'conversation'));"+needle
assert needle in text
path.write_text(text.replace(needle,replace),encoding='utf-8')
