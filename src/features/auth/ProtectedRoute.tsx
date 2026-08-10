import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen label="Checking session…" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
