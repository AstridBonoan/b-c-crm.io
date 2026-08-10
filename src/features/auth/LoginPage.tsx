import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas'
import { useAuth } from '@/features/auth/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useTheme } from '@/features/theme/useTheme'

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const { signIn, signUp, user, loading, configured } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('signin')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

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
    setInfoMessage(null)

    if (mode === 'signin') {
      const result = await signIn(values.email, values.password)
      if (result.error) {
        setSubmitError(result.error)
        return
      }
      navigate('/', { replace: true })
      return
    }

    const result = await signUp(values.email, values.password)
    if (result.error) {
      setSubmitError(result.error)
      return
    }

    if (result.needsEmailConfirmation) {
      setInfoMessage(
        'Account created, but Supabase requires email confirmation before sign-in. In the Supabase dashboard go to Authentication → Providers → Email and turn off “Confirm email”, then sign in. Or confirm via the email link.',
      )
      setMode('signin')
      return
    }

    navigate('/', { replace: true })
  })

  const atmosphereLogoVariant = theme === 'dark' ? 'dark' : 'light'

  return (
    <div className="relative grid min-h-full lg:grid-cols-2">
      <div className="absolute top-4 right-4 z-20 lg:top-6 lg:right-6">
        <ThemeToggle />
      </div>

      <section
        className={`auth-atmosphere relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between ${
          theme === 'dark' ? 'text-white' : 'text-navy'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative animate-fade-up">
          <BrandLogo
            variant={atmosphereLogoVariant}
            className="mb-8 h-12 w-auto object-contain"
          />
          <p className="text-xs font-semibold tracking-[0.22em] text-teal uppercase">
            B&amp;C Software &amp; Web
          </p>
          <h1 className="mt-4 max-w-md text-4xl leading-tight font-semibold tracking-tight">
            Internal CRM
          </h1>
          <p
            className={`mt-4 max-w-sm text-base leading-relaxed ${
              theme === 'dark' ? 'text-slate-300' : 'text-ink-muted'
            }`}
          >
            Manage leads, clients, opportunities, and projects the way B&amp;C works — in one
            employee workspace.
          </p>
        </div>
        <p
          className={`relative text-sm animate-fade-up [animation-delay:120ms] ${
            theme === 'dark' ? 'text-slate-400' : 'text-ink-muted'
          }`}
        >
          Employee access only. Customers do not log in here.
        </p>
      </section>

      <section className="app-shell-bg flex items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-md rounded-lg bg-auth-panel p-8 animate-scale-in">
          <div className="lg:hidden">
            <BrandLogo className="mb-4 h-10 w-auto object-contain" />
            <p className="text-xs tracking-[0.18em] text-teal uppercase">Internal CRM</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-ink lg:mt-0">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === 'signin'
              ? 'Use your B&C employee email and password.'
              : 'Set up your employee account for this internal workspace.'}
          </p>

          {!configured && (
            <div className="mt-4 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              Supabase environment variables are not configured yet. Copy{' '}
              <code className="font-mono text-xs">.env.example</code> to{' '}
              <code className="font-mono text-xs">.env</code> and set your project credentials.
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="input-field mt-1 rounded-md"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="input-field mt-1 rounded-md"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {submitError && (
              <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            )}

            {infoMessage && (
              <p className="border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
                {infoMessage}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting
                ? mode === 'signin'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            {mode === 'signin' ? (
              <>
                First time here?{' '}
                <button
                  type="button"
                  className="font-medium text-teal hover:underline"
                  onClick={() => {
                    setMode('signup')
                    setSubmitError(null)
                    setInfoMessage(null)
                  }}
                >
                  Create your account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-medium text-teal hover:underline"
                  onClick={() => {
                    setMode('signin')
                    setSubmitError(null)
                    setInfoMessage(null)
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  )
}
