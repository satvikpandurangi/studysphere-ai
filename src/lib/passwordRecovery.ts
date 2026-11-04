import { readConfirmationLink } from './emailVerification'

export function readRecoveryLink(hash: string, search = ''): { tokenHash: string | null; invalid: boolean } {
  const query = new URLSearchParams(search)
  if (query.has('recovery_token_hash') || query.has('recovery_type')) return { tokenHash: null, invalid: true }
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.has('recovery_token_hash') && !params.has('recovery_type')) return { tokenHash: null, invalid: false }
  if ([...params.keys()].length !== 2 || params.getAll('recovery_token_hash').length !== 1 || params.getAll('recovery_type').length !== 1 || params.get('recovery_type') !== 'recovery') return { tokenHash: null, invalid: true }
  const translated = new URLSearchParams()
  for (const [key, value] of params) translated.append(key === 'recovery_token_hash' ? 'confirmation_token_hash' : key === 'recovery_type' ? 'confirmation_type' : key, key === 'recovery_type' ? 'signup' : value)
  return readConfirmationLink('#' + translated.toString())
}

export function recoveryCallbackError(hash: string, search: string) {
  const params = [new URLSearchParams(hash.replace(/^#/, '')), new URLSearchParams(search)]
  if (!params.some(p => p.has('error') || p.has('error_code'))) return null
  return 'This recovery link is invalid, expired or already used. Request a new password reset email from sign in.'
}

// In-memory intent is observed synchronously before Auth initialization finishes.
// An ordinary existing session is never permission to reset another account.
export function createRecoveryIntent() {
  let id: string | null = null
  return {
    observe(event: string, userId?: string) {
      if (event === 'PASSWORD_RECOVERY') id = userId ?? null
      else if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED' || (id && userId && userId !== id)) id = null
    },
    userId: () => id,
  }
}
