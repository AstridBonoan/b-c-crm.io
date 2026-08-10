import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  formatDashboardMoney,
  loadDashboard,
  type DashboardData,
} from '@/features/dashboard/api'
import { formatOccurredAt, typeLabel } from '@/features/activities/schemas'
import { priorityLabel, statusLabel } from '@/features/tasks/schemas'

function formatDue(due: string | null): string {
  if (!due) return 'No due date'
  return due
}

function isOverdue(due: string | null, status: string): boolean {
  if (!due || status === 'done' || status === 'cancelled') return false
  return due < new Date().toISOString().slice(0, 10)
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await loadDashboard()
      setData(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const metrics = data?.metrics
  const cards = [
    { label: 'New leads', value: metrics ? String(metrics.newLeads) : '—', to: '/leads' },
    {
      label: 'Active opportunities',
      value: metrics ? String(metrics.activeOpportunities) : '—',
      to: '/leads',
    },
    { label: 'Open deals', value: metrics ? String(metrics.openDeals) : '—', to: '/pipeline' },
    {
      label: 'Active customers',
      value: metrics ? String(metrics.activeCustomers) : '—',
      to: '/customers',
    },
    {
      label: 'Active projects',
      value: metrics ? String(metrics.activeProjects) : '—',
      to: '/projects',
    },
    {
      label: 'Completed projects',
      value: metrics ? String(metrics.completedProjects) : '—',
      to: '/projects',
    },
    {
      label: 'Potential revenue',
      value: metrics ? formatDashboardMoney(metrics.potentialRevenue) : '—',
      to: '/deals',
    },
    {
      label: 'Current project revenue',
      value: metrics ? formatDashboardMoney(metrics.projectRevenue) : '—',
      to: '/projects',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live overview of leads, pipeline, customers, and delivery work."
        actions={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((metric, index) => (
          <Link
            key={metric.label}
            to={metric.to}
            className="block transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Panel
              className="h-full px-4 py-4 animate-fade-up"
              style={{ animationDelay: `${index * 40}ms` } as CSSProperties}
            >
              <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                {loading && !metrics ? '…' : metric.value}
              </p>
            </Panel>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
            <Link to="/activities" className="text-xs font-medium text-blue hover:underline">
              View all
            </Link>
          </div>
          {loading && !data ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">Loading…</p>
          ) : !data?.recentActivities.length ? (
            <div className="p-4">
              <EmptyState
                title="No activity yet"
                description="Logged calls, emails, and meetings will show up here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {data.recentActivities.map((activity) => (
                <li key={activity.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{activity.summary}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {activity.clients?.name ?? 'No client'} ·{' '}
                        {formatOccurredAt(activity.occurred_at)}
                      </p>
                    </div>
                    <Badge tone="brand">{typeLabel(activity.type)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Upcoming tasks</h2>
            <Link to="/tasks" className="text-xs font-medium text-blue hover:underline">
              View all
            </Link>
          </div>
          {loading && !data ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">Loading…</p>
          ) : !data?.upcomingTasks.length ? (
            <div className="p-4">
              <EmptyState
                title="No open tasks"
                description="Follow-ups and work items will appear here once created."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {data.upcomingTasks.map((task) => (
                <li key={task.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{task.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {formatDue(task.due_date)}
                        {isOverdue(task.due_date, task.status) ? (
                          <span className="ml-2 font-medium text-danger">Overdue</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone="neutral">{statusLabel(task.status)}</Badge>
                      <Badge
                        tone={
                          task.priority === 'urgent' || task.priority === 'high'
                            ? 'danger'
                            : 'brand'
                        }
                      >
                        {priorityLabel(task.priority)}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
