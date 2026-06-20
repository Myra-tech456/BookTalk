import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AppRole = 'member' | 'admin' | 'superadmin'

type AuthContextType = {
  user: User | null
  session: Session | null
  role: AppRole | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getUserRole(user: User | null): AppRole | null {
  if (!user) return null

  const role = user.app_metadata?.role

  if (role === 'member' || role === 'admin' || role === 'superadmin') {
    return role
  }

  return 'member'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Erreur getSession:', error.message)
      }

      if (!mounted) return

      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Erreur signOut:', error.message)
    }
  }

  const value = useMemo(
    () => ({
      user,
      session,
      role: getUserRole(user),
      loading,
      signOut,
    }),
    [user, session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider')
  }

  return context
}