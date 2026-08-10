import {
  Briefcase,
  Building2,
  ChartColumn,
  CheckSquare,
  ContactRound,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Search,
  StickyNote,
  Target,
  UsersRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { roleTitle } from '@/features/roles/roles'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { BrandLogo } from '@/components/brand/BrandLogo'

const navItems: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: ContactRound },
  { to: '/pipeline', label: 'Pipeline', icon: Handshake },
  { to: '/deals', label: 'Deals', icon: Briefcase },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/activities', label: 'Activities', icon: NotebookPen },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/team', label: 'Team', icon: UsersRound },
]

export function AppLayout() {
  const { user, profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = profile?.full_name ?? user?.email ?? 'Employee'

  return (
    <div className="app-shell-bg flex min-h-full">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-text shadow-[4px_0_24px_rgba(10,15,24,0.2)] transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[4.75rem] items-center justify-between border-b border-white/10 px-3">
          <div className="min-w-0 flex-1 pr-2">
            <BrandLogo variant="dark" className="h-12 w-auto max-w-full object-contain object-left" />
            <p className="mt-1 text-[10px] tracking-[0.16em] text-teal-bright uppercase">
              Internal CRM
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 p-1 text-sidebar-muted lg:hidden"
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
                `group relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-muted hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-accent transition-opacity ${
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

        <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-sidebar-muted">
          B&amp;C Software &amp; Web
          <br />
          Employee workspace
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-navy-deep/55 backdrop-blur-[2px] animate-fade-in lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-header px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-line p-1.5 text-ink-muted hover:bg-surface-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-ink-muted sm:block">
              Internal use only — not a customer portal
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink">{displayName}</p>
              {profile?.role ? (
                <p className="text-xs text-ink-muted">{roleTitle(profile.role)}</p>
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
