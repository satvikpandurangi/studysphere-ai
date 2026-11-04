import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { Button, ErrorNotice, Field, Loading } from '../components/Ui'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../lib/supabase'
import { confirmationRedirect, createConfirmationExchange, readConfirmationLink, isVerificationCode, normalizeVerificationCode, verificationCodeLength, verificationCodePattern, verificationErrorMessage, verificationLinkError, verificationResendDelay, verificationSentMessage } from '../lib/emailVerification'

export function VerifyEmailPage() {
  const { user, loading } = useAuth()
  const location = useLocation(), navigate = useNavigate()
  const pending = location.state as { email?: unknown; fromSignup?: unknown } | null
  const [email, setEmail] = useState(typeof pending?.email === 'string' ? pending.email : user?.email ?? '')
  const [code, setCode] = useState('')
  const emailInput = useRef<HTMLInputElement>(null)
  const actionLock = useRef(false)
  const [link, setLink] = useState(() => readConfirmationLink(location.hash, location.search))
  const [openedLink, setOpenedLink] = useState(() => Boolean(link.tokenHash || link.invalid))
  const [exchange] = useState(() => createConfirmationExchange(tokenHash => requireSupabase().auth.verifyOtp({ token_hash: tokenHash, type: 'email' })))
  const [remaining, setRemaining] = useState(pending?.fromSignup === true ? verificationResendDelay : 0)
  const [action, setAction] = useState<'resend' | 'verify' | 'link' | null>(null)
  const busy = action !== null
  const callbackError = verificationLinkError(location.hash, location.search)
  const [error, setError] = useState<string | null>(callbackError || (link.invalid ? 'This verification link could not be used. Enter the code from your newest email or request another email.' : null))
  const [message, setMessage] = useState(pending?.fromSignup === true ? verificationSentMessage : '')

  useEffect(() => {
    const incoming = readConfirmationLink(location.hash, location.search)
    if (incoming.tokenHash || incoming.invalid) {
      setLink(incoming); setOpenedLink(true)
      if (incoming.invalid) setError('This verification link could not be used. Enter the code from your newest email or request another email.')
      navigate('/verify-email', { replace: true, state: pending })
    } else if (callbackError) navigate('/verify-email', { replace: true, state: pending })
  }, [callbackError, location.hash, location.search, navigate, pending])
  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  async function resend() {
    if (actionLock.current || busy || remaining > 0) return
    if (!emailInput.current?.reportValidity()) { setError('Enter the email address you used to sign up.'); emailInput.current?.focus(); return }
    actionLock.current = true; setAction('resend'); setError(null); setMessage('')
    try {
      const { error } = await requireSupabase().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: confirmationRedirect(window.location.origin) } })
      if (error) throw error
      setMessage(verificationSentMessage)
      setCode(''); setLink({ tokenHash: null, invalid: false })
      setRemaining(verificationResendDelay)
    } catch (error) {
      setError(verificationErrorMessage(error))
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 429) setRemaining(verificationResendDelay)
    } finally { actionLock.current = false; setAction(null) }
  }

  async function verify(event: FormEvent) {
    event.preventDefault()
    if (actionLock.current || busy) return
    if (!isVerificationCode(code)) { setError(`Enter the complete ${verificationCodeLength}-digit code from your newest verification email.`); return }
    actionLock.current = true; setAction('verify'); setError(null); setMessage('')
    try {
      const { data, error } = await requireSupabase().auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
      if (error) throw error
      if (!data.session || !data.user?.email_confirmed_at) throw new Error('Verification could not finish. Try signing in or request a new code.')
      setCode(''); navigate('/app', { replace: true })
    } catch (error) { setError(verificationErrorMessage(error)) }
    finally { actionLock.current = false; setAction(null) }
  }

  async function confirmLink() {
    if (actionLock.current || !link.tokenHash) return
    actionLock.current = true; setAction('link'); setError(null); setMessage('')
    try {
      if (await exchange(link.tokenHash)) navigate('/app', { replace: true })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'This link could not be verified. Enter your email code instead.') }
    finally { setLink({ tokenHash: null, invalid: false }); actionLock.current = false; setAction(null) }
  }

  if (loading) return <AuthLayout className="verification-page"><Loading label="Checking your account…"/></AuthLayout>
  if (user?.email_confirmed_at && !openedLink) return <Navigate to="/app" replace/>
  return <AuthLayout className="verification-page">
    <header className="verification-heading">
      <span className="verification-icon"><MailCheck size={26} aria-hidden="true"/></span>
      <h2>Verify your email</h2>
      <p>{link.tokenHash ? 'Confirm below to finish verifying the account linked in your email.' : `Use the button in your newest email, or enter its ${verificationCodeLength}-digit code below.`}</p>
    </header>
    {link.tokenHash && <div className="verification-form verification-link-actions">
      {user && <p className="verification-help">You are already signed in. Confirming continues with the account linked in this email.</p>}
      <Button type="button" disabled={busy} onClick={() => void confirmLink()}>{action === 'link' ? 'Confirming…' : 'Confirm email'}</Button>
      <button type="button" className="text-button verification-resend" disabled={busy} onClick={() => setLink({ tokenHash: null, invalid: false })}>Use a code instead</button>
    </div>}
    {!link.tokenHash && <form onSubmit={verify} className="verification-form">
      <Field label="Email address"><input ref={emailInput} type="email" required autoComplete="email" maxLength={254} placeholder="you@example.com" aria-describedby="verification-email-help" value={email} disabled={busy} onChange={event => { setEmail(event.target.value); setCode(''); setMessage('') }}/></Field>
      <p id="verification-email-help" className="verification-help">Check spam or junk, and make sure this address is correct.</p>
      <Field label="Verification code" hint="Use the newest email. A new request replaces the previous code."><input className="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern={verificationCodePattern} minLength={verificationCodeLength} maxLength={verificationCodeLength} placeholder={'0'.repeat(verificationCodeLength)} value={code} disabled={busy} onChange={event => setCode(normalizeVerificationCode(event.target.value))}/></Field>
      <ErrorNotice message={error}/>
      {message && <div className="notice success" role="status">{message}</div>}
      <Button type="submit" disabled={busy || !isVerificationCode(code)}>{action === 'verify' ? 'Verifying…' : 'Verify email'}</Button>
      <button className="text-button verification-resend" type="button" disabled={busy || remaining > 0 || !email.trim()} onClick={() => void resend()}>{action === 'resend' ? 'Sending…' : 'Send a new code'}</button>
      {remaining > 0 && <p className="verification-wait" aria-live="off">You can request another email in {remaining} seconds.</p>}
    </form>}
    <div className="verification-signin">
      <p>Already verified? Sign in with your existing password.</p>
      <Link className="button button-secondary" to="/login" state={{ email }}><ArrowLeft size={16} aria-hidden="true"/>Return to sign in</Link>
    </div>
    <footer className="verification-footer"><p>Need help? Contact your school.</p><Link to="/privacy">How learning data is used</Link></footer>
  </AuthLayout>
}
