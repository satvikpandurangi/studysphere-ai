import { useState } from 'react'
import { db } from '../lib/api'
import { useLoad } from '../hooks/useLoad'
import type { Board, Chapter, Grade, Subject, Topic } from '../lib/types'
import { Button, Field } from './Ui'

export function CurriculumSelector({onSelect}:{onSelect:(state:{board:string;grade:string;subject:string;chapter:string;topic:string;reloadChapters:()=>Promise<void>;reloadTopics:()=>Promise<void>})=>void}){
  const catalogs=useLoad(async()=>({boards:await db.boards(),grades:await db.grades()}),[])
  const [board,setBoard]=useState(''),[grade,setGrade]=useState(''),[subject,setSubject]=useState(''),[chapter,setChapter]=useState(''),[topic,setTopic]=useState('')
  const subjects=useLoad(()=>board&&grade?db.subjects(board,grade):Promise.resolve([] as Subject[]),[board,grade])
  const chapters=useLoad(()=>subject?db.chapters(subject):Promise.resolve([] as Chapter[]),[subject])
  const topics=useLoad(()=>chapter?db.topics(chapter):Promise.resolve([] as Topic[]),[chapter])
  const state={board,grade,subject,chapter,topic,reloadChapters:chapters.reload,reloadTopics:topics.reload}
  return <div className="studio-filters"><Field label="Board"><select value={board} onChange={e=>{setBoard(e.target.value);setSubject('');setChapter('');setTopic('')}}><option value="">Choose board</option>{catalogs.data?.boards.map((b:Board)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Standard"><select value={grade} onChange={e=>{setGrade(e.target.value);setSubject('');setChapter('');setTopic('')}}><option value="">Choose standard</option>{catalogs.data?.grades.map((g:Grade)=><option key={g.id} value={g.id}>{g.number}</option>)}</select></Field><Field label="Subject"><select value={subject} onChange={e=>{setSubject(e.target.value);setChapter('');setTopic('')}}><option value="">Choose subject</option>{subjects.data?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Chapter"><select value={chapter} onChange={e=>{setChapter(e.target.value);setTopic('')}}><option value="">Choose chapter</option>{chapters.data?.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></Field><Field label="Topic"><select value={topic} onChange={e=>setTopic(e.target.value)}><option value="">Choose topic</option>{topics.data?.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></Field><div className="selector-sync"><Button variant="ghost" onClick={()=>onSelect(state)}>Use selection</Button></div></div>
}

