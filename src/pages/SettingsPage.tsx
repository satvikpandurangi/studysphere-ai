import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db } from '../lib/api'
import { account } from '../lib/account'
import { requireSupabase } from '../lib/supabase'
import { Button, EmptyState, ErrorNotice, Field, Loading } from '../components/Ui'
import '../account.css'

export function SettingsPage() {
  const { profile, user, refresh } = useAuth()
  const navigate = useNavigate()
  const overview = useLoad(account.overview, [user?.id])
  const [name, setName] = useState(profile?.full_name ?? '')
  const [target, setTarget] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const targets = [
    ...(overview.data?.can_request_self ? [{ id: user!.id, name: 'My account' }] : []),
    ...(overview.data?.children.map(child => ({ id: child.id, name: `${child.name} · Standard ${child.grade}` })) ?? []),
  ]
  const chosen = targets.find(row => row.id === target) ?? targets[0]
  const hasOpen = (kind: 'export' | 'delete') => overview.data?.requests.some(row => row.user_id === chosen?.id && row.kind === kind && row.status !== 'fulfilled')
  async function act(action: () => Promise<void>) {
    setBusy(true); setError(null); setMessage('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.') } finally { setBusy(false) }
  }
  function save(event: FormEvent) {
    event.preventDefault()
    void act(async () => { await db.updateName(user!.id, name.trim()); await refresh(); setMessage('Profile updated.') })
  }
  function request(kind: 'export' | 'delete') {
    if (!chosen) return
    void act(async () => {
      const result = await account.request(kind, chosen.id)
      setMessage(result.existing ? 'This request is already open.' : 'Request received for manual review. No data has been exported or deleted yet.')
      setConfirmDelete(false); await overview.reload()
    })
  }
  return <div className="page narrow account-page">
    <div className="page-title"><h1>Settings</h1><p>Your account, sign-in and privacy controls.</p></div>
    <ErrorNotice message={error} />{message && <div className="notice success" role="status">{message}</div>}
    <form className="form-panel" onSubmit={save}><h2>Profile</h2><Field label="Full name"><input required minLength={1} maxLength={120} value={name} disabled={busy} onChange={e => setName(e.target.value)} /></Field><Field label="Email"><input disabled value={user?.email ?? ''} /></Field><Button disabled={busy || !name.trim()}>Save changes</Button></form>
    <section className="form-panel"><h2><KeyRound size={21} /> Sign-in</h2><p>Send a password recovery link to your account email. Email delivery must be available.</p><div className="button-row"><Button variant="secondary" disabled={busy || !user?.email} onClick={() => void act(async () => {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(user!.email!, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw error
      setMessage('Password recovery requested. Check your account email for the next step.')
    })}>Send password reset email</Button><Button variant="secondary" disabled={busy} onClick={() => {
      if (!window.confirm('Sign out on all devices? Other devices may retain an existing access token until it expires.')) return
      void act(async () => { const { error } = await requireSupabase().auth.signOut({ scope: 'global' }); if (error) throw error; navigate('/login', { replace: true }) })
    }}><LogOut size={17} />Sign out all devices</Button></div><p>Signing out revokes sessions. Previously issued access tokens can remain valid until their expiry.</p></section>
    <section className="form-panel"><div className="section-heading"><h2><ShieldCheck size={21} /> Privacy requests</h2><Button variant="ghost" disabled={busy || overview.loading} onClick={() => void overview.reload()} aria-label="Refresh privacy requests"><RefreshCw size={18} /></Button></div><p>Exports and deletion are reviewed by the operator. A deletion request does not immediately remove an account or stop learning access. Guardians manage requests for linked Standard 1–5 learners.</p>
      {overview.loading ? <Loading /> : overview.error ? <ErrorNotice message={overview.error} /> : <>
        {targets.length ? <><Field label="Account for this request"><select disabled={busy} value={chosen?.id ?? ''} onChange={e => { setTarget(e.target.value); setConfirmDelete(false) }}>{targets.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
          <div className="button-row"><Button variant="secondary" disabled={busy || hasOpen('export')} onClick={() => request('export')}>{hasOpen('export') ? 'Export request open' : 'Request export'}</Button><Button variant="secondary" disabled={busy || hasOpen('delete')} onClick={() => setConfirmDelete(true)}>{hasOpen('delete') ? 'Deletion request open' : 'Request deletion'}</Button></div>
          {confirmDelete && <div className="notice"><div><p>Request deletion for <strong>{chosen?.name}</strong>? The operator will review linked accounts, institution material and retention requirements before taking action.</p><div className="button-row"><Button variant="secondary" disabled={busy} onClick={() => request('delete')}>Confirm deletion request</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</Button></div></div></div>}
        </> : <p>Your verified guardian manages Standard 1–5 privacy requests. If your account email is unverified, verify it before requesting. Contact the operator if you cannot use these controls.</p>}
        <h2>Recent requests</h2><p>Latest 100 requests for your account or submitted by you.</p>{overview.data?.requests.length ? <div className="account-requests">{overview.data.requests.map(row => <article key={row.id}><div><strong>{row.kind === 'export' ? 'Data export' : 'Account deletion'}</strong><p>{row.subject_name || 'Account'} · {new Date(row.created_at).toLocaleDateString()}</p><small>Reference: {row.id}</small></div><span className="status-tag">{row.status.replace('_', ' ')}</span></article>)}</div> : <EmptyState title="No requests yet" description="Your submitted requests and review status will appear here." />}
      </>}
      <Link to="/privacy">Read the pilot data use summary</Link>
    </section>
  </div>
}
