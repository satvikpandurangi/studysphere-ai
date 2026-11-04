import type { User } from '@supabase/supabase-js'

export const verificationPath = '/verify-email'
export const verificationResendDelay = 60
export const verificationSentMessage = 'If this address needs verification, a new verification email will be sent. Use the code in the newest message. Check spam too. If you already verified your account, return to sign in.'

// Match the hosted Auth email OTP length; do not shorten the provider's code.
export const verificationCodeLength = 6
export const verificationCodePattern = `[0-9]{${verificationCodeLength}}`
export function isVerificationCode(value: string) { return new RegExp(`^${verificationCodePattern}$`).test(value) }
export function normalizeVerificationCode(value: string) { return value.replace(/[^0-9]/g, '').slice(0, verificationCodeLength) }

export function authenticatedDestination(user: Pick<User, 'email_confirmed_at'> | null | undefined) {
  if (!user) return null
  return user.email_confirmed_at ? '/app' : verificationPath
}

export function signupDestination(session: { user: Pick<User, 'email_confirmed_at'> } | null) {
  // A generic signup response may conceal an existing account. It proves neither
  // account creation nor delivery, and its user object is not a signed-in session.
  return authenticatedDestination(session?.user) ?? verificationPath
}

export function needsEmailVerification(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'email_not_confirmed'
}

export function verificationErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'otp_expired') return 'That code is invalid or expired. Use the code in the newest email, or request a new one.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Too many email requests. Wait a while before trying again.'
  if (code === 'email_address_not_authorized' || code === 'unexpected_failure') return 'We could not send the email right now. Try again later or contact your school for help.'
  return error instanceof Error ? error.message : 'We could not send the verification email. Please try again later.'
}

export function verificationLinkError(hash: string, search: string) {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const query = new URLSearchParams(search)
  const error = fragment.get('error_code') || query.get('error_code') || fragment.get('error') || query.get('error')
  if (!error) return null
  return error === 'otp_expired'
    ? 'This verification link has expired or has already been used. Enter the code from your newest email, or request a new code below. If you already verified your email, sign in.'
    : 'This verification link could not be used. Enter the code from your newest email, request a new code below, or sign in if your email is already verified.'
}

export function confirmationRedirect(origin: string) {
  return new URL(verificationPath, origin).toString()
}

export function readConfirmationLink(hash: string, search = '') : { tokenHash: string | null; invalid: boolean } {
  if (!shouldDetectSessionInUrl('', search)) return { tokenHash: null, invalid: true }
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const tokens = params.getAll('confirmation_token_hash')
  const types = params.getAll('confirmation_type')
  if (!tokens.length && !types.length) return { tokenHash: null, invalid: false }
  if (hash.length > 1024 || [...params.keys()].length !== 2 || tokens.length !== 1 || types.length !== 1 || types[0] !== 'signup' || !/^[A-Za-z0-9_-]{32,256}$/.test(tokens[0])) return { tokenHash: null, invalid: true }
  return { tokenHash: tokens[0], invalid: false }
}

export function shouldDetectSessionInUrl(hash: string, search: string) {
  return ![new URLSearchParams(hash.replace(/^#/, '')), new URLSearchParams(search)].some(params => params.has('confirmation_token_hash') || params.has('confirmation_type') || params.has('recovery_token_hash') || params.has('recovery_type'))
}

type ConfirmationResponse = { data: { session: unknown; user: { email_confirmed_at?: string } | null }; error: unknown }
export function createConfirmationExchange(verify: (tokenHash: string) => Promise<ConfirmationResponse>) {
  let active = false
  return async (tokenHash: string) => {
    if (active) return false
    if (!readConfirmationLink(`#confirmation_token_hash=${encodeURIComponent(tokenHash)}&confirmation_type=signup`).tokenHash) throw new Error('This link could not be verified. Use your newest email or enter its code.')
    active = true
    try {
      let result: ConfirmationResponse
      try { result = await verify(tokenHash) } catch { throw new Error('This link could not be verified. Try again or enter the code from your newest email.') }
      if (result.error) {
        const code = typeof result.error === 'object' && 'code' in result.error ? result.error.code : null
        if (code === 'otp_expired') throw new Error('This verification link has expired or has already been used. Use your newest email, enter its code, or sign in if already verified.')
        throw new Error('This link could not be verified. Use your newest email or enter its code.')
      }
      if (!result.data.session || !result.data.user?.email_confirmed_at) throw new Error('Verification could not finish. Try signing in or request a new email.')
      return true
    } finally { active = false }
  }
}
