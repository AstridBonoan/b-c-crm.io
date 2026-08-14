import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Client, Contact, Deal, Lead, Note, Project } from '@/types/database'
import {
  listContactsForClient,
  listDealsForClient,
  listLeadsForClient,
  listProjectsForClient,
} from '@/features/notes/api'
import { noteSchema, type NoteFormValues } from '@/features/notes/schemas'
import { Button } from '@/components/ui/Button'

type NoteFormProps = {
  initial?: Note | null
  clients: Pick<Client, 'id' | 'name'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: NoteFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: NoteFormValues = {
  body: '',
  client_id: '',
  contact_id: '',
  lead_id: '',
  deal_id: '',
  project_id: '',
}

function toFormValues(note: Note): NoteFormValues {
  return {
    body: note.body,
    client_id: note.client_id ?? '',
    contact_id: note.contact_id ?? '',
    lead_id: note.lead_id ?? '',
    deal_id: note.deal_id ?? '',
    project_id: note.project_id ?? '',
  }
}

function leadOptionLabel(
  lead: Pick<Lead, 'source' | 'service_interested' | 'status'>,
): string {
  const focus = lead.service_interested || lead.source || 'Lead'
  return `${focus} (${lead.status})`
}

export function NoteForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])
  const [leads, setLeads] = useState<
    Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'>[]
  >([])
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
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setLeads([])
      setDeals([])
      setProjects([])
      setValue('contact_id', '')
      setValue('lead_id', '')
      setValue('deal_id', '')
      setValue('project_id', '')
      return
    }

    let active = true
    Promise.all([
      listContactsForClient(clientId),
      listLeadsForClient(clientId),
      listDealsForClient(clientId),
      listProjectsForClient(clientId),
    ])
      .then(([nextContacts, nextLeads, nextDeals, nextProjects]) => {
        if (!active) return
        setContacts(nextContacts)
        setLeads(nextLeads)
        setDeals(nextDeals)
        setProjects(nextProjects)
        setRelationError(null)

        const sameClient = initial?.client_id === clientId
        const keepOrClear = (
          field: 'contact_id' | 'lead_id' | 'deal_id' | 'project_id',
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
          'project_id',
          sameClient ? initial?.project_id : undefined,
          nextProjects.map((item) => item.id),
        )
      })
      .catch((err: unknown) => {
        if (!active) return
        setContacts([])
        setLeads([])
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
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-ink">
          Note
        </label>
        <textarea
          id="body"
          rows={5}
          className="input-field mt-1 rounded-md"
          placeholder="Internal notes for the team…"
          {...register('body')}
        />
        {errors.body ? <p className="mt-1 text-xs text-danger">{errors.body.message}</p> : null}
      </div>

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
        ) : (
          <p className="mt-1 text-xs text-ink-muted">
            Notes must be attached to a client (and optionally a related record).
          </p>
        )}
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
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add note'}
        </Button>
      </div>
    </form>
  )
}
