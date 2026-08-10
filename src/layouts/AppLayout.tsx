import {
  Building2,
  CheckSquare,
  ContactRound,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Search,
  Target,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { Button } from '@/components/ui/Button'
import bcLogo from '@/assets/bc-logo.png'

const navItems: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: ContactRound },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/pipeline', label: 'Pipeline', icon: Handshake },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/activities', label: 'Activities', icon: NotebookPen },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/search', label: 'Search', icon: Search },
]

export function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = profile?.full_name ?? user?.email ?? 'Employee'

  return (
    <div className="app-shell-bg flex min-h-full">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-950 text-brand-50 shadow-[4px_0_24px_rgba(12,29,37,0.18)] transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={bcLogo}
              alt="B&C Software & Web"
              className="h-9 w-9 object-contain"
            />
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tracking-tight text-white">
                B&amp;C
              </p>
              <p className="truncate text-[11px] tracking-[0.14em] text-brand-300 uppercase">
                Internal CRM
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 text-brand-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-brand-100/75 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute inset-y-1 left-0 w-0.5 bg-brand-300 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                    }`}
                  />
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-brand-300/80">
          B&amp;C Software &amp; Web
          <br />
          Employee workspace
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-brand-950/50 backdrop-blur-[2px] animate-fade-in lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line/80 bg-white/85 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="border border-line p-1.5 text-ink-muted hover:bg-brand-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-ink-muted sm:block">
              Internal use only — not a customer portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{displayName}</p>
              {profile?.role ? (
                <p className="text-xs capitalize text-ink-muted">{profile.role}</p>
              ) : null}
            </div>
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
