import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { db } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthState = { user: User | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void> }
const Context = createContext<AuthState>({ user:null, profile:null, loading:true, refresh:async()=>{} })
export const useAuth = () => useContext(Context)

export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser] = useState<User|null>(null)
  const [profile,setProfile] = useState<Profile|null>(null)
  const [loading,setLoading] = useState(true)
  async function refresh() {
    if (!supabase) { setLoading(false); return }
    const {data} = await supabase.auth.getUser()
    setUser(data.user)
    if (data.user) {
      try { setProfile(await db.profile(data.user.id)) } catch { setProfile(null) }
    } else setProfile(null)
    setLoading(false)
  }
  useEffect(()=>{
    void refresh()
    const subscription = supabase?.auth.onAuthStateChange(()=>{ void refresh() })
    return ()=> subscription?.data.subscription.unsubscribe()
  },[])
  return <Context.Provider value={{user,profile,loading,refresh}}>{children}</Context.Provider>
}
