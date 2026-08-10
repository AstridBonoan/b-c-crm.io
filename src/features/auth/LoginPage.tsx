import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas'
import { useAuth } from '@/features/auth/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function LoginPage() {
  const { signIn, user, loading, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (loading) {
    return <LoadingScreen label="Loading…" />
  }

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    const result = await signIn(values.email, values.password)
    if (result.error) {
      setSubmitError(result.error)
      return
    }
    navigate('/', { replace: true })
  })

  return (
    <div className="flex min-h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,_#d5e7ef_0%,_#f4f6f8_55%,_#e8eef2_100%)] px-4">
      <div className="w-full max-w-md border border-brand-200/80 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">
          B&amp;C Software &amp; Web
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Internal CRM</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your B&amp;C employee account. Customers do not have access.
        </p>

        {!configured && (
          <div className="mt-4 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Supabase environment variables are not configured yet. Copy{' '}
            <code className="font-mono text-xs">.env.example</code> to{' '}
            <code className="font-mono text-xs">.env</code> and set{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_URL</code> plus{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {submitError && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
