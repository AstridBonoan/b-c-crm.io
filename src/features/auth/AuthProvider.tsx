import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { tryGetSupabaseClient } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = env.isSupabaseConfigured

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = tryGetSupabaseClient()
    if (!supabase) {
      setProfile(null)
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile', error.message)
      setProfile(null)
      return null
    }

    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    const supabase = tryGetSupabaseClient()

    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        void loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = tryGetSupabaseClient()
      if (!supabase) {
        return {
          error:
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your environment.',
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: error.message }
      }

      const userId = data.user?.id
      if (!userId) {
        return { error: 'Sign-in failed. Try again.' }
      }

      const nextProfile = await loadProfile(userId)
      if (!nextProfile) {
        await supabase.auth.signOut()
        setProfile(null)
        return {
          error:
            'No employee profile found for this account. Ask a founder to add your email to the allowlist.',
        }
      }

      if (!nextProfile.is_active) {
        await supabase.auth.signOut()
        setProfile(null)
        return {
          error:
            'This account is not authorized for the CRM. Access is limited to allowlisted B&C employees.',
        }
      }

      return { error: null }
    },
    [loadProfile],
  )

  const signOut = useCallback(async () => {
    const supabase = tryGetSupabaseClient()
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    await loadProfile(session.user.id)
  }, [loadProfile, session?.user])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, configured, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
