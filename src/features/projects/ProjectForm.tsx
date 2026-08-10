import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Deal, Project } from '@/types/database'
import { listDealsForClient } from '@/features/projects/api'
import {
  PROJECT_STATUSES,
  projectSchema,
  type ProjectFormValues,
} from '@/features/projects/schemas'
import { Button } from '@/components/ui/Button'

type ProjectFormProps = {
  initial?: Project | null
  clients: Pick<Client, 'id' | 'name' | 'client_type' | 'client_status'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: ProjectFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: ProjectFormValues = {
  name: '',
  client_id: '',
  deal_id: '',
  project_type: '',
  description: '',
  start_date: '',
  due_date: '',
  completion_date: '',
  project_value: '',
  status: 'not_started',
  progress: '0',
  notes: '',
}

function toFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    client_id: project.client_id,
    deal_id: project.deal_id ?? '',
    project_type: project.project_type ?? '',
    description: project.description ?? '',
    start_date: project.start_date ?? '',
    due_date: project.due_date ?? '',
    completion_date: project.completion_date ?? '',
    project_value:
      project.project_value === null || project.project_value === undefined
        ? ''
        : String(project.project_value),
    status: project.status,
    progress: String(project.progress ?? 0),
    notes: project.notes ?? '',
  }
}

export function ProjectForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [deals, setDeals] = useState<Pick<Deal, 'id' | 'name' | 'stage'>[]>([])
  const [dealsError, setDealsError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientId = watch('client_id')
  const status = watch('status')
  const completionDate = watch('completion_date')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  useEffect(() => {
    if (status === 'completed') {
      setValue('progress', '100')
      if (!completionDate) {
        setValue('completion_date', new Date().toISOString().slice(0, 10))
      }
    }
  }, [status, completionDate, setValue])

  useEffect(() => {
    if (!clientId) {
      setDeals([])
      setValue('deal_id', '')
      return
    }

    let active = true
    void listDealsForClient(clientId)
      .then((data) => {
        if (!active) return
        setDeals(data)
        setDealsError(null)
        const preferred =
          initial?.client_id === clientId ? initial.deal_id : undefined
        if (preferred && data.some((deal) => deal.id === preferred)) {
          setValue('deal_id', preferred)
        } else {
          setValue('deal_id', '')
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        setDeals([])
        setDealsError(err instanceof Error ? err.message : 'Failed to load deals')
      })

    return () => {
      active = false
    }
  }, [clientId, initial, setValue])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field id="name" label="Project name" error={errors.name?.message} {...register('name')} />

      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-ink">
          Client
        </label>
        <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
          <option value="">Select a client…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        {errors.client_id ? (
          <p className="mt-1 text-xs text-danger">{errors.client_id.message}</p>
        ) : null}
        {clients.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">
            No clients yet. Create a client before adding projects.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select id="status" className="input-field mt-1 rounded-md" {...register('status')}>
          {PROJECT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="progress"
        label="Progress (%)"
        type="number"
        min="0"
        max="100"
        error={errors.progress?.message}
        {...register('progress')}
      />

      <div>
        <label htmlFor="deal_id" className="block text-sm font-medium text-ink">
          Related deal (optional)
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
              {deal.name} ({deal.stage})
            </option>
          ))}
        </select>
        {dealsError ? <p className="mt-1 text-xs text-danger">{dealsError}</p> : null}
      </div>

      <Field
        id="project_type"
        label="Project type"
        error={errors.project_type?.message}
        {...register('project_type')}
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink">
          Description
        </label>
        <textarea
          id="description"
          rows={2}
          className="input-field mt-1 rounded-md"
          {...register('description')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="start_date"
          label="Start date"
          type="date"
          error={errors.start_date?.message}
          {...register('start_date')}
        />
        <Field
          id="due_date"
          label="Due date"
          type="date"
          error={errors.due_date?.message}
          {...register('due_date')}
        />
        <Field
          id="completion_date"
          label="Completion date"
          type="date"
          error={errors.completion_date?.message}
          {...register('completion_date')}
        />
      </div>

      <Field
        id="project_value"
        label="Project value (USD)"
        type="number"
        step="0.01"
        min="0"
        error={errors.project_value?.message}
        {...register('project_value')}
      />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={3} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || clients.length === 0}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create project'}
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
