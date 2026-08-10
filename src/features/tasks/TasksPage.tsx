import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { TaskForm } from '@/features/tasks/TaskForm'
import {
  createTask,
  deleteTask,
  listClientOptions,
  listTasks,
  updateTask,
  type TaskWithRelations,
} from '@/features/tasks/api'
import {
  priorityLabel,
  statusLabel,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskFormValues,
} from '@/features/tasks/schemas'
import type { Client, Task, TaskPriority, TaskStatus } from '@/types/database'

function statusTone(status: TaskStatus): 'neutral' | 'brand' | 'success' | 'danger' {
  if (status === 'done') return 'success'
  if (status === 'blocked' || status === 'cancelled') return 'danger'
  if (status === 'in_progress') return 'brand'
  return 'neutral'
}

function priorityTone(priority: TaskPriority): 'neutral' | 'brand' | 'success' | 'danger' {
  if (priority === 'urgent' || priority === 'high') return 'danger'
  if (priority === 'medium') return 'brand'
  return 'neutral'
}

function isOverdue(task: TaskWithRelations): boolean {
  if (!task.due_date) return false
  if (task.status === 'done' || task.status === 'cancelled') return false
  return task.due_date < new Date().toISOString().slice(0, 10)
}

export function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [priority, setPriority] = useState<TaskPriority | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<TaskWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listTasks({ search, status, priority })
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [search, status, priority])

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
    const open = tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled')
    return {
      openCount: open.length,
      overdueCount: open.filter((task) => isOverdue(task)).length,
      doneCount: tasks.filter((task) => task.status === 'done').length,
    }
  }, [tasks])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: TaskFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateTask(editing.id, values)
      } else {
        await createTask(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteTask(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Follow-ups and work items for leads, deals, clients, and projects."
        actions={<Button onClick={openCreate}>Add task</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Open tasks
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.openCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Overdue
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.overdueCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Done
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.doneCount}</p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or description…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}
          className="input-field rounded-md lg:w-auto"
        >
          <option value="all">All statuses</option>
          {TASK_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority | 'all')}
          className="input-field rounded-md lg:w-auto"
        >
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((item) => (
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
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading tasks…</Panel>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Create follow-ups like send proposal, schedule meeting, or check project progress."
          action={<Button onClick={openCreate}>Add task</Button>}
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Related</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{task.title}</p>
                    {task.description ? (
                      <p className="line-clamp-1 text-xs text-ink-muted">{task.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(task.status)}>{statusLabel(task.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={priorityTone(task.priority)}>
                      {priorityLabel(task.priority)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {task.due_date ?? '—'}
                    {isOverdue(task) ? (
                      <span className="ml-2 text-xs font-medium text-danger">Overdue</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {task.clients?.name ??
                      task.projects?.name ??
                      task.deals?.name ??
                      (task.contacts
                        ? `${task.contacts.first_name} ${task.contacts.last_name}`
                        : '—')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(task)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(task)}
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
        title={editing ? 'Edit task' : 'Add task'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <TaskForm
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
        title="Delete task"
        message={`Delete “${deleting?.title ?? 'this task'}”?`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
