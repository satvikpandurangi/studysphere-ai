import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createRecoveryClient, getRecoveryUserId, requireSupabase } from '../lib/supabase'
import { readRecoveryLink, recoveryCallbackError } from '../lib/passwordRecovery'
import { isVerificationCode, normalizeVerificationCode, verificationCodeLength, verificationCodePattern } from '../lib/emailVerification'
import { Button, ErrorNotice, Field } from '../components/Ui'

export function ResetPasswordPage() {
  const location = useLocation(), navigate = useNavigate()
  const [link, setLink] = useState(() => readRecoveryLink(location.hash, location.search))
  const [password, setPassword] = useState(''), [email, setEmail] = useState(''), [code, setCode] = useState('')
  const initialError = recoveryCallbackError(location.hash, location.search)
  const blockLegacy = useRef(Boolean(initialError || link.invalid || link.tokenHash))
  const [error, setError] = useState<string | null>(initialError || (link.invalid ? 'This recovery link could not be used. Request a new reset email from sign in.' : null))
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [target, setTarget] = useState<{ id: string; email: string } | null>(null)
  const client = useRef<ReturnType<typeof createRecoveryClient> | null>(null)
  const lock = useRef(false)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++; client.current = null }, [])

  useEffect(() => {
    const incoming = readRecoveryLink(location.hash, location.search)
    const callbackError = recoveryCallbackError(location.hash, location.search)
    if (incoming.tokenHash || incoming.invalid || callbackError) {
      generation.current++; blockLegacy.current = true
      setTarget(null); client.current = null; setPassword(''); setCode(''); setMessage('')
      lock.current = false; setBusy(false)
      setLink(incoming)
      setError(callbackError || (incoming.invalid ? 'This recovery link could not be used. Request a new reset email from sign in.' : null))
      navigate('/reset-password', { replace: true })
      return
    }
    if (blockLegacy.current) return
    let active = true
    // Preserve successful legacy callbacks, but never reuse a normal login.
    void (async () => {
      try {
        const main = requireSupabase()
        const { data } = await main.auth.getSession()
        if (!active || !data.session || getRecoveryUserId() !== data.session.user.id) return
        const recovery = createRecoveryClient()
        const result = await recovery.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
        if (active && !result.error && result.data.user?.id === getRecoveryUserId()) {
          client.current = recovery
          setTarget({ id: result.data.user.id, email: result.data.user.email ?? '' })
        }
      } catch { /* No recovery session: keep password submission unavailable. */ }
    })()
    return () => { active = false }
  }, [location.hash, location.search, navigate])

  async function verifyRecovery(event?: FormEvent) {
    event?.preventDefault()
    if (lock.current || (!link.tokenHash && !isVerificationCode(code))) return
    const started = generation.current
    lock.current = true; setBusy(true); setError(null)
    try {
      const recovery = createRecoveryClient()
      const result = link.tokenHash
        ? await recovery.auth.verifyOtp({ token_hash: link.tokenHash, type: 'recovery' })
        : await recovery.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' })
      if (started !== generation.current) return
      if (result.error || !result.data.session || !result.data.user) throw new Error('Recovery could not be verified. Use the newest email and code, or request a new reset email from sign in.')
      client.current = recovery
      setTarget({ id: result.data.user.id, email: result.data.user.email ?? '' })
    } catch { if (started === generation.current) setError('Recovery could not be verified. Use the newest email and code, or request a new reset email from sign in.') }
    finally { if (started === generation.current) { setLink({ tokenHash: null, invalid: false }); setCode(''); lock.current = false; setBusy(false) } }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (lock.current || !target || !client.current) return
    const started = generation.current
    lock.current = true; setBusy(true); setError(null)
    try {
      const recovery = client.current
      const current = await recovery.auth.getUser()
      if (started !== generation.current) return
      if (current.error || current.data.user?.id !== target.id) {
        setTarget(null); client.current = null
        throw new Error('Recovery session expired. Request a new reset email from sign in.')
      }
      const result = await recovery.auth.updateUser({ password })
      if (started !== generation.current) return
      if (result.error) throw new Error('Password could not be updated. Use a different password of at least 10 characters, or request a new reset email.')
      setPassword(''); setTarget(null); client.current = null
      setMessage('Password updated. Sign in with your new password. If another account is signed in, sign out of it first.')
      await recovery.auth.signOut({ scope: 'local' })
    } catch (failure) { if (started === generation.current) { setPassword(''); setError(failure instanceof Error ? failure.message : 'Password could not be updated. Request a new reset email.') } }
    finally { if (started === generation.current) { lock.current = false; setBusy(false) } }
  }

  return <main className="reset-page"><div className="auth-form">
    <h1>{target ? 'Set a new password' : 'Reset your password'}</h1>
    <p>{target ? `Choose a new password for ${target.email}.` : 'Open the button in your newest recovery email, then confirm here. You can also enter its six-digit code.'}</p>
    <ErrorNotice message={error}/>
    {!target && !message && (link.tokenHash ? <><Button disabled={busy} onClick={() => void verifyRecovery()}>Confirm password reset</Button><button className="text-button" disabled={busy} onClick={() => setLink({ tokenHash: null, invalid: false })}>Use a code instead</button></> :
      <form onSubmit={verifyRecovery}><Field label="Email address"><input required type="email" autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)}/></Field><Field label="Recovery code"><input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern={verificationCodePattern} minLength={verificationCodeLength} maxLength={verificationCodeLength} value={code} disabled={busy} onChange={e => setCode(normalizeVerificationCode(e.target.value))}/></Field><Button disabled={busy || !isVerificationCode(code)}>Verify recovery code</Button></form>)}
    {target && <form onSubmit={save}><Field label="New password"><input required type="password" minLength={10} autoComplete="new-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)}/></Field><Button disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button></form>}
    {message && <div className="notice success" role="status">{message}</div>}
    <Link to="/login" state={{ email }}>Return to sign in</Link>
  </div></main>
}
