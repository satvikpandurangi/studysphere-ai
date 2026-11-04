from pathlib import Path
path = Path('outputs/studysphere-ai/worker/index.ts')
text = path.read_text(encoding='utf-8')
needle = "else if(request.method==='POST'&&url.pathname==='/privacy/request')response=await privacy(request,a);"
replacement = (
    "else if(request.method==='POST'&&url.pathname==='/schools/create')response=await addSchool(request,a);"
    "else if(request.method==='POST'&&url.pathname==='/catalog/chapter')response=await addChapter(request,a);"
    "else if(request.method==='POST'&&url.pathname==='/catalog/topic')response=await addTopic(request,a);"
    "else if(request.method==='POST'&&url.pathname==='/flashcards/create')response=await createFlashcard(request,a);"
    "else if(request.method==='POST'&&url.pathname==='/quizzes/create')response=await createQuiz(request,a);"
    + needle
)
assert needle in text
path.write_text(text.replace(needle,replacement),encoding='utf-8')
