import { describe, expect, it } from 'vitest'
import { authenticatedDestination, confirmationRedirect, isVerificationCode, needsEmailVerification, normalizeVerificationCode, signupDestination, verificationCodeLength, verificationCodePattern, verificationErrorMessage, verificationLinkError } from '../src/lib/emailVerification'

describe('email confirmation routing and feedback', () => {
  it('matches the chosen six-digit length and gives expired-code recovery guidance', () => {
    expect(verificationCodeLength).toBe(6)
    expect(verificationCodePattern).toBe('[0-9]{6}')
    expect(isVerificationCode('012345')).toBe(true)
    for (const code of ['', '12345', '1234567', '12345678', '123456789', '123 45', 'ABCDEF', '１２３４５６']) expect(isVerificationCode(code)).toBe(false)
    expect(verificationErrorMessage({ code: 'otp_expired' })).toContain('newest email')
  })
  it('preserves all six digits including leading zero when typing or pasting', () => {
    expect(normalizeVerificationCode('012345')).toBe('012345')
    expect(normalizeVerificationCode('01 23 45')).toBe('012345')
    expect(normalizeVerificationCode('0123456789')).toBe('012345')
    expect(normalizeVerificationCode('１２３４５６７８')).toBe('')
  })
  it('requires a confirmed authenticated session before sending signup to the dashboard', () => {
    // Supabase may return an obfuscated user for a repeated signup. A user
    // object without a session must never be treated as authenticated.
    expect(signupDestination(null)).toBe('/verify-email')
    expect(signupDestination({ user: {} })).toBe('/verify-email')
    expect(signupDestination({ user: { email_confirmed_at: '2026-10-29T00:00:00Z' } })).toBe('/app')
    expect(authenticatedDestination(null)).toBeNull()
  })

  it('redirects only the explicit unconfirmed-email error, retaining other sign-in errors', () => {
    expect(needsEmailVerification({ code: 'email_not_confirmed', status: 400 })).toBe(true)
    for (const error of [null, 'email_not_confirmed', new Error('Email not confirmed'), { code: 'invalid_credentials' }, { code: 'unexpected_failure' }]) {
      expect(needsEmailVerification(error)).toBe(false)
    }
    expect(authenticatedDestination({})).toBe('/verify-email')
    expect(authenticatedDestination({ email_confirmed_at: '2026-10-29T00:00:00Z' })).toBe('/app')
  })

  it('handles expired and invalid links without reflecting provider descriptions or tokens', () => {
    expect(verificationLinkError('#error=access_denied&error_code=otp_expired&error_description=PRIVATE', '')).toContain('expired or has already been used')
    expect(verificationLinkError('', '?error_code=otp_expired')).toContain('expired')
    const message = verificationLinkError('#error=PRIVATE&error_description=UNTRUSTED&access_token=SECRET', '')
    expect(message).toContain('could not be used')
    expect(message).not.toMatch(/PRIVATE|UNTRUSTED|SECRET/)
    expect(verificationLinkError('#access_token=SECRET&type=signup', '')).toBeNull()
  })

  it('gives actionable delivery and rate-limit errors without claiming delivery', () => {
    expect(verificationErrorMessage({ code: 'over_email_send_rate_limit' })).toContain('Wait')
    expect(verificationErrorMessage({ code: 'email_address_not_authorized' })).toContain('could not send')
    expect(verificationErrorMessage({ code: 'unexpected_failure' })).toContain('contact your school')
    expect(verificationErrorMessage(null)).toContain('try again later')
  })

  it('uses an exact verification callback on the current frontend origin', () => {
    expect(confirmationRedirect('http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173/verify-email')
    expect(confirmationRedirect('https://school.example')).toBe('https://school.example/verify-email')
  })
})
