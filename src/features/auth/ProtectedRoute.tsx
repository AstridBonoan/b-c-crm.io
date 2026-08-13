import { Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function ProtectedRoute() {
  const { user, profile, loading, signOut } = useAuth()

  useEffect(() => {
    if (!loading && user && profile && !profile.is_active) {
      void signOut()
    }
  }, [loading, user, profile, signOut])

  if (loading) {
    return <LoadingScreen label="Checking session…" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div className="app-shell-bg flex min-h-full items-center justify-center px-4">
        <div className="panel max-w-md rounded-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-ink">No employee profile</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your login exists, but there is no CRM profile yet. Ask a founder to add your email to
            the employee allowlist in Supabase, then sign in again.
          </p>
          <button
            type="button"
            className="mt-4 text-sm font-medium text-teal hover:underline"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (!profile.is_active) {
    return <LoadingScreen label="Signing out inactive account…" />
  }

  return <Outlet />
}
