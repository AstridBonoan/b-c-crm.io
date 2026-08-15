import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { tryGetSupabaseClient } from '@/lib/supabase'
import { markLeadFinderFreshLogin } from '@/features/lead-finder/session'
import type { Profile } from '@/types/database'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)
  const configured = env.isSupabaseConfigured
  const profileUserIdRef = useRef<string | null>(null)
  profileUserIdRef.current = profile?.id ?? null

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
          if (mounted) {
            setProfileReady(true)
            setLoading(false)
          }
        })
      } else {
        setProfileReady(true)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (!nextSession?.user) {
        setProfile(null)
        setProfileReady(true)
        return
      }
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'SIGNED_IN' && profileUserIdRef.current === nextSession.user.id) return
      // Supabase can deadlock if other auth/DB calls run inside this callback.
      window.setTimeout(() => {
        if (!mounted) return
        setProfileReady(false)
        void loadProfile(nextSession.user.id).finally(() => {
          if (mounted) setProfileReady(true)
        })
      }, 0)
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

      setSession(data.session)
      setProfileReady(false)

      const userId = data.user?.id
      if (!userId) {
        setProfileReady(true)
        return { error: 'Sign-in failed. Try again.' }
      }

      const nextProfile = await loadProfile(userId)
      setProfileReady(true)
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

      markLeadFinderFreshLogin()
      return { error: null }
    },
    [loadProfile],
  )

  const signOut = useCallback(async () => {
    const supabase = tryGetSupabaseClient()
    if (!supabase) return
    await supabase.auth.signOut()
    markLeadFinderFreshLogin()
    setSession(null)
    setProfile(null)
    setProfileReady(true)
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
      profileReady,
      configured,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, profileReady, configured, signIn, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
