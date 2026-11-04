import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { automaticInstitution, branding, type InstitutionWorkspace } from '../lib/branding'

type State = { workspaces: InstitutionWorkspace[]; active: InstitutionWorkspace | null; loading: boolean; error: string | null; refresh: () => Promise<void> }
const Context = createContext<State>({ workspaces: [], active: null, loading: true, error: null, refresh: async () => {} })
export const useInstitution = () => useContext(Context)

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const userId = user?.id
  const [workspaces, setWorkspaces] = useState<InstitutionWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const cached = useRef<InstitutionWorkspace[]>([])
  const lastRefresh = useRef(0)
  const refresh = useCallback(async () => {
    const request = ++generation.current
    try {
      const rows = userId ? await branding.workspaces(cached.current) : []
      if (request !== generation.current) return
      cached.current = rows; setWorkspaces(rows); setError(null)
      lastRefresh.current = Date.now()
    } catch (e) {
      if (request !== generation.current) return
      cached.current = []; setWorkspaces([]); setError(e instanceof Error ? e.message : 'Could not load institutions.')
    } finally { if (request === generation.current) setLoading(false) }
  }, [userId])
  useEffect(() => {
    cached.current = []; setWorkspaces([]); setLoading(true); void refresh()
    const onFocus = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current >= 60000) void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { ++generation.current; window.removeEventListener('focus', onFocus) }
  }, [refresh])
  const active = automaticInstitution(workspaces, profile?.role)
  return <Context.Provider value={{ workspaces, active, loading, error, refresh }}>{children}</Context.Provider>
}
