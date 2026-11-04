import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db } from '../lib/api'
import { requireSupabase } from '../lib/supabase'
import type { Subject } from '../lib/types'
import { Button, ErrorNotice, Field, Loading } from '../components/Ui'
import { AuthLayout } from '../components/AuthLayout'
import { authenticatedDestination, confirmationRedirect, needsEmailVerification, signupDestination, verificationPath } from '../lib/emailVerification'

export function AuthPage(){
  const {user,loading}=useAuth(); const navigate=useNavigate(); const location=useLocation(); const pending=location.state as {email?:unknown}|null; const [role,setRole]=useState<'student'|'parent'>('parent'); const [signup,setSignup]=useState(false)
  const [name,setName]=useState(''); const [email,setEmail]=useState(typeof pending?.email==='string'?pending.email:''); const [password,setPassword]=useState(''); const [error,setError]=useState<string|null>(null); const [success,setSuccess]=useState(''); const [busy,setBusy]=useState(false)
  const [schoolName,setSchoolName]=useState(''); const [board,setBoard]=useState(''); const [grade,setGrade]=useState(''); const [subjectIds,setSubjectIds]=useState<string[]>([])
  const catalog=useLoad(async()=>({boards:await db.boards(),grades:await db.grades()}),[])
  const subjects=useLoad(()=>signup&&role==='student'&&board&&grade?db.subjects(board,grade):Promise.resolve([] as Subject[]),[signup,role,board,grade])
  if(loading) return <AuthLayout><Loading label="Checking your account…"/></AuthLayout>
  if(user) return <Navigate to={authenticatedDestination(user)!} replace state={{email:user.email}}/>

  function chooseRole(next:'student'|'parent'){setRole(next);setError(null);setSuccess('');setSchoolName('');setBoard('');setGrade('');setSubjectIds([])}
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError(null);setSuccess('');try{
    if(signup){
      if(role==='student'&&(schoolName.trim().length<3||!board||!grade||!subjectIds.length))throw new Error('Enter your school name and choose your board, standard, and at least one subject.')
      const metadata=role==='student'?{full_name:name,account_type:'student',school_name:schoolName.trim(),board_id:board,grade_id:grade,subject_ids:subjectIds}:{full_name:name,account_type:'parent'}
      const {data,error}=await requireSupabase().auth.signUp({email:email.trim(),password,options:{data:metadata,emailRedirectTo:confirmationRedirect(window.location.origin)}}); if(error) throw error
      setPassword(''); navigate(signupDestination(data.session),{replace:true,state:{email:email.trim(),fromSignup:true}})
    }else{
      const {data,error}=await requireSupabase().auth.signInWithPassword({email:email.trim(),password})
      if(error){if(needsEmailVerification(error)){setPassword('');navigate(verificationPath,{replace:true,state:{email:email.trim()}});return}throw error}
      setPassword(''); navigate(authenticatedDestination(data.user)??verificationPath,{replace:true,state:{email:email.trim()}})
    }
  }catch(e){setError(e instanceof Error?e.message:'Something went wrong.')}finally{setBusy(false)}}
  async function recover(){setError(null);setSuccess('');if(!email.includes('@')){setError('Enter your account email first.');return}setBusy(true);try{const {error}=await requireSupabase().auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;setSuccess('If this email has an account, a recovery link is on its way.')}catch(e){setError(e instanceof Error?e.message:'Could not send a recovery link.')}finally{setBusy(false)}}

  const independentGrades=catalog.data?.grades.filter(g=>g.number>=6)??[]
  return <AuthLayout><h2>{signup?(role==='student'?'Create your student account':'Create your parent account'):'Welcome back'}</h2><p>{signup?(role==='student'?'Independent registration is available for Standards 6–10.':'Create and supervise accounts for children in Standards 1–5.'):'Sign in to continue learning.'}</p><div className="role-tabs" role="tablist" aria-label="Account type"><button type="button" role="tab" aria-selected={role==='parent'} className={role==='parent'?'selected':''} onClick={()=>chooseRole('parent')}>Parent</button><button type="button" role="tab" aria-selected={role==='student'} className={role==='student'?'selected':''} onClick={()=>chooseRole('student')}>Student</button></div>
  {signup&&role==='student'&&<div className="notice"><ShieldCheck size={18}/><span>Students in Standards 1–5 must ask a parent or guardian to create and supervise their account.</span></div>}
  <form onSubmit={submit}>{signup&&<Field label="Full name"><input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/></Field>}{signup&&role==='student'&&(catalog.loading?<Loading label="Loading curriculum…"/>:<><ErrorNotice message={catalog.error}/><Field label="School name" hint="Type the full official name of your school."><input required minLength={3} maxLength={160} value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Example: National Public School"/></Field><Field label="Board"><select required value={board} onChange={e=>{setBoard(e.target.value);setSubjectIds([])}}><option value="">Choose your board</option>{catalog.data?.boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Standard"><select required value={grade} onChange={e=>{setGrade(e.target.value);setSubjectIds([])}}><option value="">Choose your standard</option>{independentGrades.map(g=><option key={g.id} value={g.id}>Standard {g.number}</option>)}</select></Field><div className="field"><span>Subjects</span><div className="checkbox-list">{subjects.data?.map(s=><label key={s.id}><input type="checkbox" checked={subjectIds.includes(s.id)} onChange={e=>setSubjectIds(e.target.checked?[...subjectIds,s.id]:subjectIds.filter(id=>id!==s.id))}/>{s.name}</label>)}</div>{board&&grade&&!subjects.loading&&!subjects.data?.length&&<small>No subjects are configured for this selection.</small>}</div></>)}<Field label="Email address"><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></Field><Field label="Password" hint={signup?'Use at least 10 characters.':undefined}><input type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?10:8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/></Field><ErrorNotice message={error}/>{success&&<div className="notice success" role="status">{success}</div>}<Button disabled={busy||Boolean(signup&&role==='student'&&(catalog.loading||schoolName.trim().length<3||!subjectIds.length))} type="submit">{busy?'Please wait…':signup?'Create account':'Sign in'}</Button></form><button className="text-button" disabled={busy} onClick={()=>{setSignup(!signup);setError(null);setSuccess('')}}>{signup?'Already have an account? Sign in':'New here? Create an account'}</button>{!signup&&<button className="text-button" onClick={recover} disabled={busy}>Forgot password?</button>}<p className="auth-footnote">School staff receive an invitation from their administrator. <Link to="/privacy">How learning data is used</Link></p></AuthLayout>
}
