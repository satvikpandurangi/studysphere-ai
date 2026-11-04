import { createClient } from '@supabase/supabase-js'
import { shouldDetectSessionInUrl } from './emailVerification'
import { createRecoveryIntent } from './passwordRecovery'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const configured = Boolean(url && key)
export const supabase = configured
  ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: typeof window === 'undefined' || shouldDetectSessionInUrl(window.location.hash, window.location.search) } })
  : null

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}

const recoveryIntent = createRecoveryIntent()
supabase?.auth.onAuthStateChange((event, session) => {
  recoveryIntent.observe(event, session?.user.id)
})
export const getRecoveryUserId = () => recoveryIntent.userId()

// Recovery cannot accidentally change an unrelated account in the main app.
export function createRecoveryClient() {
  if (!configured) throw new Error('Supabase is not configured.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `studysphere-recovery-${crypto.randomUUID()}` } })
}
