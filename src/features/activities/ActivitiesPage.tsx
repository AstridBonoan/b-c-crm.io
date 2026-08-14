import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { ActivityForm } from '@/features/activities/ActivityForm'
import {
  createActivity,
  deleteActivity,
  listActivities,
  listClientOptions,
  updateActivity,
  type ActivityWithRelations,
} from '@/features/activities/api'
import {
  ACTIVITY_TYPES,
  formatOccurredAt,
  typeLabel,
  type ActivityFormValues,
  type ActivityType,
} from '@/features/activities/schemas'
import type { Activity, Client } from '@/types/database'

function relatedLabel(activity: ActivityWithRelations): string {
  if (activity.clients?.name) return activity.clients.name
  if (activity.projects?.name) return activity.projects.name
  if (activity.deals?.name) return activity.deals.name
  if (activity.tasks?.title) return activity.tasks.title
  if (activity.contacts) {
    return `${activity.contacts.first_name} ${activity.contacts.last_name}`
  }
  if (activity.leads) {
    return activity.leads.service_interested || activity.leads.source || 'Lead'
  }
  return '—'
}

export function ActivitiesPage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [type, setType] = useState<ActivityType | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ActivityWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listActivities({ search, type })
      setActivities(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [search, type])

  useEffect(() => {
    void loadClients().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    })
  }, [loadClients])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [load])

  const totals = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return {
      total: activities.length,
      thisWeek: activities.filter(
        (activity) => new Date(activity.occurred_at).getTime() >= weekAgo,
      ).length,
      calls: activities.filter((activity) => activity.type === 'call').length,
    }
  }, [activities])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (activity: Activity) => {
    setEditing(activity)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: ActivityFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateActivity(editing.id, values)
      } else {
        await createActivity(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save activity')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteActivity(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Activities"
        description="Chronological log of calls, emails, meetings, and other interactions."
        actions={<Button onClick={openCreate}>Log activity</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Logged
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.total}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            This week
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.thisWeek}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Calls
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.calls}</p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search summary or details…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType | 'all')}
          className="input-field rounded-md lg:w-auto"
        >
          <option value="all">All types</option>
          {ACTIVITY_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">
          Loading activities…
        </Panel>
      ) : activities.length === 0 ? (
        search.trim() || type !== 'all' ? (
          <EmptyState
            title="No matching activities"
            description="Try clearing search or filters to see all activities."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setType('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No activities yet"
            description="Log calls, emails, meetings, and demos so the team has a shared history."
            action={<Button onClick={openCreate}>Log activity</Button>}
          />
        )
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
                <th className="px-4 py-3 font-semibold">Related</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                    {formatOccurredAt(activity.occurred_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="brand">{typeLabel(activity.type)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{activity.summary}</p>
                    {activity.details ? (
                      <p className="line-clamp-1 text-xs text-ink-muted">{activity.details}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{relatedLabel(activity)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(activity)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(activity)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Modal
        open={editorOpen}
        title={editing ? 'Edit activity' : 'Log activity'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <ActivityForm
          initial={editing}
          clients={clients}
          submitting={submitting}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => {
            if (!submitting) {
              setEditorOpen(false)
              setEditing(null)
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete activity"
        message={`Delete “${deleting?.summary ?? 'this activity'}”?`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
