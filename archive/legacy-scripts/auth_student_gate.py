from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/AuthPage.tsx'
s=p.read_text(encoding='utf-8')
def replace(old,new):
    global s
    if old not in s:raise RuntimeError(old)
    s=s.replace(old,new,1)
replace("<h2>{signup?'Create your parent account':'Welcome back'}</h2>","<h2>{signup?(role==='student'?'Student accounts start with a guardian':'Create your parent account'):'Welcome back'}</h2>")
replace("<p>{signup?'Set up a secure space for your family.':'Sign in to continue learning.'}</p>","<p>{signup?(role==='student'?'Ask a parent or school administrator to set up your account.':'Set up a secure space for your family.'):'Sign in to continue learning.'}</p>")
replace('<form onSubmit={submit}>', "{!(signup&&role==='student')&&<form onSubmit={submit}>")
replace('</Button></form><button className="text-button"', '</Button></form>}{signup&&role===\'student\'&&<Button onClick={()=>setRole(\'parent\')}>Continue as a parent</Button>}<button className="text-button"')
p.write_text(s,encoding='utf-8')
