import { Link, useParams } from 'react-router-dom'
import { BookOpen, CheckCircle2, ClipboardCheck, CalendarDays } from 'lucide-react'
import { useLoad } from '../hooks/useLoad'
import { requireSupabase } from '../lib/supabase'
import { EmptyState, ErrorNotice, Loading } from '../components/Ui'

type Child={student_id:string;name:string;school_name:string;board_name:string;grade_number:number;approval_status:string}

export function ChildProgressPage(){const {studentId}=useParams();const report=useLoad(async()=>{
  const client=requireSupabase()
  const child=await client.from('parent_children_overview').select('student_id,name,school_name,board_name,grade_number,approval_status').eq('student_id',studentId).single()
  if(child.error)throw new Error('This child is not linked to your account.')
  const [assigned,completed,quizzes,plan]=await Promise.all([
    client.from('student_subjects').select('subject_id,subjects(name)').eq('student_id',studentId),
    client.from('topic_progress').select('topic_id,completed_at').eq('student_id',studentId).order('completed_at',{ascending:false}).limit(10),
    client.from('quiz_attempts').select('score,total,quiz_title,quiz_version,created_at').eq('student_id',studentId).order('created_at',{ascending:false}).limit(10),
    client.from('plan_items').select('title,due_date,completed_at').eq('student_id',studentId).is('completed_at',null).gte('due_date',new Date().toISOString().slice(0,10)).order('due_date').limit(10),
  ])
  for(const result of [assigned,completed,quizzes,plan])if(result.error)throw result.error
  const topicIds=(completed.data||[]).map(x=>x.topic_id)
  const topicNames=topicIds.length?await client.from('topics').select('id,title').in('id',topicIds):{data:[],error:null}
  if(topicNames.error)throw topicNames.error
  return {child:child.data as Child,assigned:assigned.data||[],completed:completed.data||[],quizzes:quizzes.data||[],plan:plan.data||[],topicNames:new Map((topicNames.data||[]).map(x=>[x.id,x.title]))}
},[studentId])
  if(report.loading)return <Loading/>
  if(report.error)return <div className="page"><ErrorNotice message={report.error}/><Link to="/app/children">← Back to children</Link></div>
  const data=report.data!
  return <div className="page"><Link className="back-link" to="/app/children">← My children</Link><h1>{data.child.name}'s learning</h1><p className="page-subtitle">{data.child.school_name} · {data.child.board_name} · Standard {data.child.grade_number}</p>
    <div className="stats-grid"><div><BookOpen size={23}/><strong>{data.assigned.length}</strong><span>assigned subjects</span></div><div><CheckCircle2 size={23}/><strong>{data.completed.length}</strong><span>recent completed topics</span></div><div><ClipboardCheck size={23}/><strong>{data.quizzes.length}</strong><span>recent quiz attempts</span></div></div>
    {data.child.approval_status!=='approved'?<div className="notice">Learning access is paused by the parent or guardian.</div>:null}
    <div className="parent-report"><section className="form-panel"><h2>Subjects</h2>{data.assigned.length?<ul>{data.assigned.map(row=><li key={row.subject_id}>{Array.isArray(row.subjects)?row.subjects[0]?.name:(row.subjects as {name:string}|null)?.name||'Subject'}</li>)}</ul>:<EmptyState title="No subjects assigned" description="Choose subjects in the student setup."/>}</section>
      <section className="form-panel"><h2>Recently completed</h2>{data.completed.length?<ul>{data.completed.map(row=><li key={row.topic_id}><CheckCircle2 size={17}/><span>{data.topicNames.get(row.topic_id)||'Topic'}<small>{new Date(row.completed_at).toLocaleDateString()}</small></span></li>)}</ul>:<EmptyState title="No completed topics yet" description="Completed lessons will appear here."/>}</section>
      <section className="form-panel"><h2>Quiz results</h2>{data.quizzes.length?<ul>{data.quizzes.map((row,index)=><li key={`${row.created_at}-${index}`}><ClipboardCheck size={17}/><span>{row.quiz_title} · v{row.quiz_version}: {row.score} out of {row.total}<small>{new Date(row.created_at).toLocaleDateString()}</small></span></li>)}</ul>:<EmptyState title="No quiz attempts yet" description="Scores will appear after a quiz is submitted."/>}</section>
      <section className="form-panel"><h2>Upcoming plan</h2>{data.plan.length?<ul>{data.plan.map((row,index)=><li key={`${row.due_date}-${index}`}><CalendarDays size={17}/><span>{row.title}<small>{new Date(`${row.due_date}T12:00:00`).toLocaleDateString()}</small></span></li>)}</ul>:<EmptyState title="Nothing scheduled" description="Study tasks will appear here."/>}</section></div>
  </div>
}
