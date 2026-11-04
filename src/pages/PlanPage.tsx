import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db } from '../lib/api'
import { requireSupabase } from '../lib/supabase'
import { generateStudyTasks } from '../lib/studyPlan'
import type { PlanItem, Subject } from '../lib/types'
import { Button, EmptyState, ErrorNotice, Field, Loading } from '../components/Ui'
import { StudentGate } from '../components/StudentGate'

const week=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const today=()=>new Date().toISOString().slice(0,10)
export function PlanPage(){return <StudentGate>{p=><PlanInner boardId={p.board_id} gradeId={p.grade_id}/>}</StudentGate>}

function PlanInner({boardId,gradeId}:{boardId:string;gradeId:string}){
  const {user}=useAuth();const studentId=user!.id
  const plan=useLoad(()=>db.plan(studentId),[studentId])
  const subjects=useLoad(async()=>{
    const [catalog,assigned]=await Promise.all([db.subjects(boardId,gradeId),requireSupabase().from('student_subjects').select('subject_id').eq('student_id',studentId)])
    if(assigned.error)throw assigned.error
    const ids=new Set(assigned.data?.map(x=>x.subject_id)||[])
    return catalog.filter(s=>ids.has(s.id))
  },[boardId,gradeId,studentId])
  const [title,setTitle]=useState('');const [date,setDate]=useState(today());const [manualSubject,setManualSubject]=useState('')
  const [start,setStart]=useState(today());const [target,setTarget]=useState(today())
  const [weekdays,setWeekdays]=useState<number[]>([1,2,3,4,5]);const [chosen,setChosen]=useState<string[]>([])
  const [editId,setEditId]=useState<string|null>(null);const [editTitle,setEditTitle]=useState('');const [editDate,setEditDate]=useState('')
  const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false)
  async function add(e:FormEvent){e.preventDefault();setBusy(true);setError(null);try{await db.savePlanItem({student_id:studentId,title,due_date:date,subject_id:manualSubject||null});setTitle('');setMessage('Study task saved.');await plan.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  async function generate(e:FormEvent){e.preventDefault();setBusy(true);setError(null);try{const selected=(subjects.data||[]).filter((s:Subject)=>chosen.includes(s.id));const tasks=generateStudyTasks(start,target,weekdays,selected);await db.createPlanItems(tasks.map(task=>({...task,student_id:studentId})));setMessage(`${tasks.length} study tasks added. You can edit each one below.`);await plan.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  async function toggle(item:PlanItem){try{await db.completePlanItem(item.id,!item.completed_at);await plan.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}}
  async function saveEdit(e:FormEvent){e.preventDefault();if(!editId)return;try{await db.updatePlanItem(editId,editTitle.trim(),editDate);setEditId(null);await plan.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}}
  async function remove(id:string){try{await db.deletePlanItem(id);await plan.reload()}catch(e){setError(e instanceof Error?e.message:String(e))}}
  return <div className="page"><h1>Study plan</h1><p className="page-subtitle">Choose your own goals and study days. Your plan is saved across devices.</p>
    <div className="plan-layout"><div className="plan-forms"><form className="form-panel" onSubmit={generate}><h2>Make a plan</h2><p>StudySphere spreads your selected subjects across your available days.</p><div className="form-grid"><Field label="Start date"><input required type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field label="Target date"><input required type="date" min={start} value={target} onChange={e=>setTarget(e.target.value)}/></Field></div><div className="field"><span>Subjects</span>{subjects.loading?<Loading/>:<div className="checkbox-list">{subjects.data?.map(s=><label key={s.id}><input type="checkbox" checked={chosen.includes(s.id)} onChange={e=>setChosen(e.target.checked?[...chosen,s.id]:chosen.filter(id=>id!==s.id))}/>{s.name}</label>)}</div>}</div><div className="field"><span>Available days</span><div className="weekday-row">{week.map((label,day)=><label key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={e=>setWeekdays(e.target.checked?[...weekdays,day]:weekdays.filter(x=>x!==day))}/>{label}</label>)}</div></div><Button disabled={busy||!chosen.length||!weekdays.length}>Create study plan</Button><small className="muted">Up to 60 tasks across six months. The plan uses your choices and does not call AI.</small></form>
      <form className="form-panel" onSubmit={add}><h2>Add one task</h2><Field label="What will you work on?"><input required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} placeholder="For example, revise fractions"/></Field><div className="form-grid"><Field label="Study date"><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Subject"><select value={manualSubject} onChange={e=>setManualSubject(e.target.value)}><option value="">General</option>{subjects.data?.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></Field></div><Button disabled={busy}><Plus size={18}/> Add task</Button></form></div>
      <section className="plan-list"><h2>Your tasks</h2>{plan.loading?<Loading/>:plan.error?<ErrorNotice message={plan.error}/>:plan.data?.length?plan.data.map(item=><div className="task-row" key={item.id}>{editId===item.id?<form className="task-edit" onSubmit={saveEdit}><input required maxLength={150} aria-label="Task title" value={editTitle} onChange={e=>setEditTitle(e.target.value)}/><input required type="date" aria-label="Task date" value={editDate} onChange={e=>setEditDate(e.target.value)}/><Button>Save</Button><Button type="button" variant="ghost" onClick={()=>setEditId(null)}>Cancel</Button></form>:<><input aria-label={`Complete ${item.title}`} type="checkbox" checked={!!item.completed_at} onChange={()=>toggle(item)}/><span className={item.completed_at?'done':''}>{item.title}<small>{new Date(`${item.due_date}T12:00:00`).toLocaleDateString()}</small></span><button className="text-button" onClick={()=>{setEditId(item.id);setEditTitle(item.title);setEditDate(item.due_date)}}>Edit</button><button className="icon-button" aria-label={`Delete ${item.title}`} onClick={()=>remove(item.id)}><Trash2 size={16}/></button></>}</div>):<EmptyState title="A fresh page" description="Choose subjects and study days to create a plan."/>}</section></div><ErrorNotice message={error}/>{message&&<div className="notice success" role="status">{message}</div>}
  </div>
}
