import { useState, type FormEvent } from 'react'
import { Building2, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db } from '../lib/api'
import { enrollment } from '../lib/enrollment'
import { requireSupabase } from '../lib/supabase'
import { Button, EmptyState, ErrorNotice, Field, Loading } from '../components/Ui'
import '../enrollment.css'

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'

export function EnrollmentAdminPage() {
  const { profile } = useAuth()
  const allowed = profile?.role === 'platform_admin' || profile?.role === 'school_admin'
  const schools = useLoad(async () => {
    if (!allowed || !profile) return []
    const list = await db.schools()
    if (profile?.role === 'platform_admin') return list
    const { data, error } = await requireSupabase().from('memberships').select('school_id').eq('user_id', profile.id).eq('role', 'school_admin')
    if (error) throw error
    return list.filter(s => data?.some(m => m.school_id === s.id))
  }, [profile?.id, profile?.role])
  const [school, setSchool] = useState('')
  const selectedSchool = schools.data?.length === 1 ? schools.data[0].id : schools.data?.some(row => row.id === school) ? school : ''
  if (!allowed) return <div className="page"><EmptyState title="School administrator access required" description="Your institution administrator manages student enrollment." /></div>
  return <div className="page">
    <div className="section-heading page-heading"><div><h1>Student enrollment</h1><p>A private learning space for the students your institution invites.</p></div></div>
    {schools.loading ? <Loading /> : schools.error ? <ErrorNotice message={schools.error} /> : <>
      {schools.data && schools.data.length > 1 && <section className="form-panel invite-form"><Field label="School"><select value={selectedSchool} onChange={e => setSchool(e.target.value)}><option value="">Choose school</option>{schools.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></section>}
      {selectedSchool ? <SchoolRoster key={selectedSchool} schoolId={selectedSchool} /> : <EmptyState title="Choose your school" description="View enrolled learners and create private invitations." />}
    </>}
  </div>
}

function SchoolRoster({ schoolId }: { schoolId: string }) {
  const { user } = useAuth()
  const roster = useLoad(() => enrollment.roster(schoolId), [schoolId])
  const [email, setEmail] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffRole, setStaffRole] = useState<'editor' | 'school_admin'>('editor')
  const [invitation, setInvitation] = useState<{ code: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  async function invite(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(''); setInvitation(null)
    try {
      setInvitation(await enrollment.invite(schoolId, email.trim()))
      setMessage('Invitation created. Share the code privately with the student or their guardian.'); setEmail('')
      await roster.reload()
    } catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  async function change(action: () => Promise<void>, success: string) {
    setBusy(true); setError(null); setMessage(''); setInvitation(null)
    try { await action(); setConfirm(null); setMessage(success); await roster.reload() }
    catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  async function addStaff(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(''); setInvitation(null)
    try {
      await enrollment.addStaff(schoolId, staffEmail.trim(), staffRole)
      setStaffEmail(''); setMessage('Existing staff access added for this school.'); await roster.reload()
    } catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  return <>
    <form className="form-panel invite-form" onSubmit={invite}>
      <h2><ShieldCheck size={21} /> Invite a student</h2>
      <p>Use the student's sign-in email. For Standards 1–5, their guardian accepts for the linked child. Invitations expire after seven days.</p>
      <Field label="Student account email" hint="A new invitation replaces any unused invitation for this email at this school."><input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></Field>
      <Button disabled={busy || roster.loading || !!roster.error}>{busy ? 'Working…' : 'Create invitation'}</Button>
      {invitation && <div className="enrollment-code"><Field label="Private invitation code" hint={`Copy now. Expires ${new Date(invitation.expiresAt).toLocaleString()}. This code is not shown again after leaving this page.`}><textarea readOnly rows={3} value={invitation.code} onFocus={e => e.currentTarget.select()} /></Field></div>}
    </form>
    <ErrorNotice message={error} />{message && <div className="notice success" role="status">{message}</div>}
    <section className="form-panel enrollment-panel">
      <div className="section-heading"><div><h2><Users size={21} /> School roster</h2><p>Latest 200 enrollments and 200 open invitations, plus up to 200 staff memberships. A school name entered at signup does not add a student here.</p></div><Button variant="ghost" disabled={busy || roster.loading} onClick={() => void roster.reload()} aria-label="Refresh school roster"><RefreshCw size={18} /></Button></div>
      {roster.loading ? <Loading /> : roster.error ? <ErrorNotice message={roster.error} /> : <>
        {roster.data?.enrollments.length ? <div className="enrollment-list">{roster.data.enrollments.map(student => <article className="enrollment-row" key={student.id}>
          <div><h3>{student.full_name || 'Student'}</h3><p>{student.board_name} · Standard {student.grade_number}</p><small>Joined {new Date(student.accepted_at).toLocaleDateString()}</small></div>
          <span className="status-tag">{student.status}</span>
          {student.status === 'active' && (confirm === student.id ? <div className="enrollment-confirm"><p>Remove access to this school's private materials?</p><div className="button-row"><Button variant="secondary" disabled={busy} onClick={() => void change(() => enrollment.revoke(schoolId, student.student_id), 'Enrollment revoked. New requests for private school materials are blocked.')}>Confirm revocation</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Keep access</Button></div></div> : <Button variant="secondary" disabled={busy} onClick={() => setConfirm(student.id)}>Revoke access</Button>)}
        </article>)}</div> : <EmptyState title="No verified enrollments yet" description="Invite learners and ask them to accept using their account or a linked guardian account." />}
        <h2>Open invitations</h2>
        {roster.data?.invitations.length ? <div className="enrollment-list">{roster.data.invitations.map(invite => <article className="enrollment-row" key={invite.id}><div><h3>{invite.email}</h3><p>Expires {new Date(invite.expires_at).toLocaleString()}</p></div><Button variant="secondary" disabled={busy} onClick={() => void change(() => enrollment.cancel(schoolId, invite.id), 'Invitation cancelled.')}>Cancel invitation</Button></article>)}</div> : <p className="muted">No open invitations.</p>}
        <h2>Staff access</h2><p>Invite staff from <Link to="/app/schools">Schools &amp; people</Link>. Removing school access keeps their account and other school memberships.</p>
        {roster.data?.staff?.length ? <div className="enrollment-list">{roster.data.staff.map(member => <article className="enrollment-row" key={member.id}>
          <div><h3>{member.full_name || 'Staff member'}{member.user_id === user?.id ? ' (you)' : ''}</h3><p>{member.role === 'school_admin' ? 'School administrator' : 'Content editor'}</p></div>
          {member.user_id !== user?.id && (confirm === member.id ? <div className="enrollment-confirm"><p>Remove this staff member's access to this school?</p><div className="button-row"><Button variant="secondary" disabled={busy} onClick={() => void change(() => enrollment.revokeStaff(schoolId, member.user_id), 'Staff access removed for this school.')}>Confirm staff removal</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Keep staff access</Button></div></div> : <Button variant="secondary" disabled={busy} onClick={() => setConfirm(member.id)}>Remove staff access</Button>)}
        </article>)}</div> : <p className="muted">No staff memberships listed.</p>}
        <form className="invite-form enrollment-staff-form" onSubmit={addStaff}><h3>Add existing staff</h3><p>Use this for a verified staff account that does not currently have access, including returning staff. New staff need an invitation from Schools &amp; people.</p><div className="form-grid"><Field label="Existing staff account email"><input required type="email" maxLength={254} value={staffEmail} onChange={e => setStaffEmail(e.target.value)} disabled={busy} /></Field><Field label="School role"><select value={staffRole} onChange={e => setStaffRole(e.target.value as 'editor' | 'school_admin')} disabled={busy}><option value="editor">Content editor</option><option value="school_admin">School administrator</option></select></Field></div><Button variant="secondary" disabled={busy}>Add staff access</Button></form>
      </>}
    </section>
  </>
}

export function MySchoolsPage() {
  const { user, profile } = useAuth()
  const parent = profile?.role === 'parent'
  const children = useLoad(async () => {
    if (!parent) return [] as { student_id: string; name: string; approval_status: string }[]
    const { data, error } = await requireSupabase().from('parent_children_overview').select('student_id,name,approval_status')
    if (error) throw error
    return data as { student_id: string; name: string; approval_status: string }[]
  }, [user?.id, parent])
  const schools = useLoad(() => enrollment.mine(), [user?.id])
  const [child, setChild] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function accept(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage('')
    try {
      const result = await enrollment.accept(code, parent ? child : user!.id)
      setCode(''); setMessage(`Joined ${result.schoolName}. Published materials for the student's assigned subjects are now available.`)
      await schools.reload()
    } catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  return <div className="page narrow"><h1>My schools</h1><p className="page-subtitle">Join your institution's private learning space.</p>
    <form className="form-panel" onSubmit={accept}><h2><ShieldCheck size={21} /> Accept an invitation</h2><p>Ask your school for an invitation for the student's sign-in email. Your account and learning history stay the same.</p>
      {parent && (children.loading ? <Loading /> : children.error ? <ErrorNotice message={children.error} /> : <Field label="Linked child"><select required value={child} onChange={e => setChild(e.target.value)} disabled={busy}><option value="">Choose child</option>{children.data?.filter(c => c.approval_status === 'approved').map(c => <option key={c.student_id} value={c.student_id}>{c.name}</option>)}</select></Field>)}
      <Field label="Invitation code" hint="Use the code shared privately by your institution. For Standards 1–5, a guardian accepts for the child."><textarea required maxLength={100} rows={3} value={code} onChange={e => setCode(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy} /></Field>
      <Button disabled={busy || code.trim().length !== 72 || (parent && (!child || !!children.error))}>{busy ? 'Joining…' : 'Join school'}</Button>
    </form>
    <ErrorNotice message={error} />{message && <div className="notice success" role="status">{message}</div>}
    <section className="form-panel enrollment-panel"><div className="section-heading"><h2><Building2 size={21} /> School access</h2><Button variant="ghost" aria-label="Refresh school access" disabled={schools.loading} onClick={() => void schools.reload()}><RefreshCw size={18} /></Button></div>
      {schools.loading ? <Loading /> : schools.error ? <ErrorNotice message={schools.error} /> : schools.data?.length ? <div className="enrollment-list">{schools.data.map(school => <article className="enrollment-row" key={`${school.student_id}-${school.school_name}`}><div><h3>{school.school_name}</h3>{parent && <p>{children.data?.find(c => c.student_id === school.student_id)?.name || 'Linked child'}</p>}<small>{school.status === 'active' ? 'Enrollment accepted; subject and account permissions still apply.' : 'Private school materials are no longer available.'}</small></div><span className="status-tag">{school.status}</span></article>)}</div> : <EmptyState title="No school enrollments yet" description="Accept your institution's invitation to access its private materials. Your existing personal learning records are preserved." />}
    </section>
  </div>
}
