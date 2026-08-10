import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { ProjectForm } from '@/features/projects/ProjectForm'
import {
  createProject,
  deleteProject,
  listClientOptions,
  listProjects,
  updateProject,
  type ProjectWithRelations,
} from '@/features/projects/api'
import {
  formatMoney,
  PROJECT_STATUSES,
  statusLabel,
  type ProjectFormValues,
} from '@/features/projects/schemas'
import type { Client, Project, ProjectStatus } from '@/types/database'

function statusTone(status: ProjectStatus): 'neutral' | 'brand' | 'success' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'in_development' || status === 'review') return 'brand'
  if (status === 'not_started') return 'neutral'
  return 'brand'
}

export function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectWithRelations[]>([])
  const [clients, setClients] = useState<
    Pick<Client, 'id' | 'name' | 'client_type' | 'client_status'>[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ProjectWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects({ search, status })
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [search, status])

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
    const active = projects.filter((project) => project.status !== 'completed')
    const completed = projects.filter((project) => project.status === 'completed')
    return {
      activeCount: active.length,
      completedCount: completed.length,
      activeValue: active.reduce((sum, project) => sum + Number(project.project_value ?? 0), 0),
      completedValue: completed.reduce(
        (sum, project) => sum + Number(project.project_value ?? 0),
        0,
      ),
    }
  }, [projects])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditing(project)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: ProjectFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateProject(editing.id, values)
      } else {
        await createProject(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteProject(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Active and completed client work. Completed projects stay as historical records."
        actions={<Button onClick={openCreate}>Add project</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Active projects
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.activeCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Active value
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatMoney(totals.activeValue)}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Completed
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.completedCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Completed value
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">
            {formatMoney(totals.completedValue)}
          </p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, type, notes…"
          className="input-field rounded-md sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ProjectStatus | 'all')}
          className="input-field rounded-md sm:w-auto"
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUSES.map((item) => (
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
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading projects…</Panel>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={
            clients.length === 0
              ? 'Create a client first, then add projects for their work.'
              : 'Add a project to track delivery from planning through completion.'
          }
          action={
            clients.length === 0 ? (
              <Link
                to="/clients"
                className="inline-flex items-center justify-center rounded-md bg-btn-primary-bg px-3.5 py-2 text-sm font-medium text-btn-primary-fg hover:bg-btn-primary-hover"
              >
                Go to Clients
              </Link>
            ) : (
              <Button onClick={openCreate}>Add project</Button>
            )
          }
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Progress</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{project.name}</p>
                    <p className="text-xs text-ink-muted">
                      {project.project_type ?? 'No type'}
                      {project.deals?.name ? ` · ${project.deals.name}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {project.clients?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(project.status)}>{statusLabel(project.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-24">
                      <div className="mb-1 text-xs text-ink-muted">{project.progress}%</div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full bg-teal"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatMoney(project.project_value)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {project.status === 'completed'
                      ? project.completion_date ?? '—'
                      : project.due_date ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(project)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(project)}
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
        title={editing ? 'Edit project' : 'Add project'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <ProjectForm
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
        title="Delete project"
        message={
          deleting?.status === 'completed'
            ? `“${deleting.name}” is completed. Prefer keeping completed projects as history. Delete anyway?`
            : `Delete “${deleting?.name ?? 'this project'}”?`
        }
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
