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
    <div className="flex min-h-full">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-brand-800/40 bg-brand-900 text-brand-50 transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-brand-200 uppercase">B&amp;C</p>
            <p className="text-sm font-semibold">Internal CRM</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-brand-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-0.5 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-brand-100/80 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded border border-slate-200 p-1.5 text-slate-700 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-slate-500 sm:block">
              Employee workspace — not customer-facing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{displayName}</p>
              {profile?.role ? (
                <p className="text-xs capitalize text-slate-500">{profile.role}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
