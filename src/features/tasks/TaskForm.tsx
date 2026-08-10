import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact, Deal, Project, Task } from '@/types/database'
import {
  listContactsForClient,
  listDealsForClient,
  listProjectsForClient,
} from '@/features/tasks/api'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskSchema,
  type TaskFormValues,
} from '@/features/tasks/schemas'
import { Button } from '@/components/ui/Button'

type TaskFormProps = {
  initial?: Task | null
  clients: Pick<Client, 'id' | 'name'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: TaskFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: TaskFormValues = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  status: 'todo',
  client_id: '',
  contact_id: '',
  deal_id: '',
  project_id: '',
}

function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    due_date: task.due_date ?? '',
    priority: task.priority,
    status: task.status,
    client_id: task.client_id ?? '',
    contact_id: task.contact_id ?? '',
    deal_id: task.deal_id ?? '',
    project_id: task.project_id ?? '',
  }
}

export function TaskForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])
  const [deals, setDeals] = useState<Pick<Deal, 'id' | 'name'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name'>[]>([])
  const [relationError, setRelationError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setDeals([])
      setProjects([])
      setValue('contact_id', '')
      setValue('deal_id', '')
      setValue('project_id', '')
      return
    }

    let active = true
    Promise.all([
      listContactsForClient(clientId),
      listDealsForClient(clientId),
      listProjectsForClient(clientId),
    ])
      .then(([nextContacts, nextDeals, nextProjects]) => {
        if (!active) return
        setContacts(nextContacts)
        setDeals(nextDeals)
        setProjects(nextProjects)
        setRelationError(null)

        const keepOrClear = (
          field: 'contact_id' | 'deal_id' | 'project_id',
          preferred: string | null | undefined,
          ids: string[],
        ) => {
          if (preferred && ids.includes(preferred)) {
            setValue(field, preferred)
            return
          }
          setValue(field, '')
        }

        keepOrClear(
          'contact_id',
          initial?.client_id === clientId ? initial.contact_id : undefined,
          nextContacts.map((item) => item.id),
        )
        keepOrClear(
          'deal_id',
          initial?.client_id === clientId ? initial.deal_id : undefined,
          nextDeals.map((item) => item.id),
        )
        keepOrClear(
          'project_id',
          initial?.client_id === clientId ? initial.project_id : undefined,
          nextProjects.map((item) => item.id),
        )
      })
      .catch((err: unknown) => {
        if (!active) return
        setContacts([])
        setDeals([])
        setProjects([])
        setRelationError(err instanceof Error ? err.message : 'Failed to load related records')
      })

    return () => {
      active = false
    }
  }, [clientId, initial, setValue])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field id="title" label="Title" error={errors.title?.message} {...register('title')} />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          className="input-field mt-1 rounded-md"
          {...register('description')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-ink">
            Status
          </label>
          <select id="status" className="input-field mt-1 rounded-md" {...register('status')}>
            {TASK_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-ink">
            Priority
          </label>
          <select id="priority" className="input-field mt-1 rounded-md" {...register('priority')}>
            {TASK_PRIORITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Field
        id="due_date"
        label="Due date"
        type="date"
        error={errors.due_date?.message}
        {...register('due_date')}
      />

      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-ink">
          Related client (optional)
        </label>
        <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
          <option value="">None</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="contact_id" className="block text-sm font-medium text-ink">
            Contact
          </label>
          <select
            id="contact_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('contact_id')}
          >
            <option value="">None</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="deal_id" className="block text-sm font-medium text-ink">
            Deal
          </label>
          <select
            id="deal_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('deal_id')}
          >
            <option value="">None</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium text-ink">
            Project
          </label>
          <select
            id="project_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('project_id')}
          >
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {relationError ? <p className="text-xs text-danger">{relationError}</p> : null}

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

function Field({ id, label, error, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input id={id} className="input-field mt-1 rounded-md" {...props} />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  )
}
