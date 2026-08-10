import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Activity, Client, Contact, Customer, Deal, Lead, Project, Task } from '@/types/database'
import {
  listContactsForClient,
  listCustomersForClient,
  listDealsForClient,
  listLeadsForClient,
  listProjectsForClient,
  listTasksForClient,
} from '@/features/activities/api'
import {
  ACTIVITY_TYPES,
  activitySchema,
  nowDatetimeLocal,
  toDatetimeLocalValue,
  type ActivityFormValues,
} from '@/features/activities/schemas'
import { Button } from '@/components/ui/Button'

type ActivityFormProps = {
  initial?: Activity | null
  clients: Pick<Client, 'id' | 'name'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: ActivityFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues = (): ActivityFormValues => ({
  type: 'call',
  summary: '',
  details: '',
  occurred_at: nowDatetimeLocal(),
  client_id: '',
  contact_id: '',
  lead_id: '',
  deal_id: '',
  customer_id: '',
  project_id: '',
  task_id: '',
})

function toFormValues(activity: Activity): ActivityFormValues {
  return {
    type: (ACTIVITY_TYPES.some((item) => item.value === activity.type)
      ? activity.type
      : 'other') as ActivityFormValues['type'],
    summary: activity.summary,
    details: activity.details ?? '',
    occurred_at: toDatetimeLocalValue(activity.occurred_at),
    client_id: activity.client_id ?? '',
    contact_id: activity.contact_id ?? '',
    lead_id: activity.lead_id ?? '',
    deal_id: activity.deal_id ?? '',
    customer_id: activity.customer_id ?? '',
    project_id: activity.project_id ?? '',
    task_id: activity.task_id ?? '',
  }
}

function leadOptionLabel(
  lead: Pick<Lead, 'source' | 'service_interested' | 'status'>,
): string {
  const focus = lead.service_interested || lead.source || 'Lead'
  return `${focus} (${lead.status})`
}

export function ActivityForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ActivityFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])
  const [leads, setLeads] = useState<
    Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'>[]
  >([])
  const [deals, setDeals] = useState<Pick<Deal, 'id' | 'name'>[]>([])
  const [customers, setCustomers] = useState<Pick<Customer, 'id' | 'status'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name'>[]>([])
  const [tasks, setTasks] = useState<Pick<Task, 'id' | 'title'>[]>([])
  const [relationError, setRelationError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues(),
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues())
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setLeads([])
      setDeals([])
      setCustomers([])
      setProjects([])
      setTasks([])
      setValue('contact_id', '')
      setValue('lead_id', '')
      setValue('deal_id', '')
      setValue('customer_id', '')
      setValue('project_id', '')
      setValue('task_id', '')
      return
    }

    let active = true
    Promise.all([
      listContactsForClient(clientId),
      listLeadsForClient(clientId),
      listDealsForClient(clientId),
      listCustomersForClient(clientId),
      listProjectsForClient(clientId),
      listTasksForClient(clientId),
    ])
      .then(([nextContacts, nextLeads, nextDeals, nextCustomers, nextProjects, nextTasks]) => {
        if (!active) return
        setContacts(nextContacts)
        setLeads(nextLeads)
        setDeals(nextDeals)
        setCustomers(nextCustomers)
        setProjects(nextProjects)
        setTasks(nextTasks)
        setRelationError(null)

        const sameClient = initial?.client_id === clientId
        const keepOrClear = (
          field:
            | 'contact_id'
            | 'lead_id'
            | 'deal_id'
            | 'customer_id'
            | 'project_id'
            | 'task_id',
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
          sameClient ? initial?.contact_id : undefined,
          nextContacts.map((item) => item.id),
        )
        keepOrClear(
          'lead_id',
          sameClient ? initial?.lead_id : undefined,
          nextLeads.map((item) => item.id),
        )
        keepOrClear(
          'deal_id',
          sameClient ? initial?.deal_id : undefined,
          nextDeals.map((item) => item.id),
        )
        keepOrClear(
          'customer_id',
          sameClient ? initial?.customer_id : undefined,
          nextCustomers.map((item) => item.id),
        )
        keepOrClear(
          'project_id',
          sameClient ? initial?.project_id : undefined,
          nextProjects.map((item) => item.id),
        )
        keepOrClear(
          'task_id',
          sameClient ? initial?.task_id : undefined,
          nextTasks.map((item) => item.id),
        )
      })
      .catch((err: unknown) => {
        if (!active) return
        setContacts([])
        setLeads([])
        setDeals([])
        setCustomers([])
        setProjects([])
        setTasks([])
        setRelationError(err instanceof Error ? err.message : 'Failed to load related records')
      })

    return () => {
      active = false
    }
  }, [clientId, initial, setValue])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-ink">
            Type
          </label>
          <select id="type" className="input-field mt-1 rounded-md" {...register('type')}>
            {ACTIVITY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="occurred_at"
          label="Occurred at"
          type="datetime-local"
          error={errors.occurred_at?.message}
          {...register('occurred_at')}
        />
      </div>

      <Field
        id="summary"
        label="Summary"
        error={errors.summary?.message}
        {...register('summary')}
      />

      <div>
        <label htmlFor="details" className="block text-sm font-medium text-ink">
          Details
        </label>
        <textarea
          id="details"
          rows={3}
          className="input-field mt-1 rounded-md"
          {...register('details')}
        />
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
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
          <label htmlFor="lead_id" className="block text-sm font-medium text-ink">
            Lead
          </label>
          <select
            id="lead_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('lead_id')}
          >
            <option value="">None</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {leadOptionLabel(lead)}
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
          <label htmlFor="customer_id" className="block text-sm font-medium text-ink">
            Customer
          </label>
          <select
            id="customer_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('customer_id')}
          >
            <option value="">None</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                Customer ({customer.status})
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
        <div>
          <label htmlFor="task_id" className="block text-sm font-medium text-ink">
            Task
          </label>
          <select
            id="task_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('task_id')}
          >
            <option value="">None</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
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
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Log activity'}
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
