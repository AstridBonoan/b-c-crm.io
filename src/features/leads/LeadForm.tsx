import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact, Lead } from '@/types/database'
import { listContactsForClient } from '@/features/leads/api'
import { LEAD_STATUSES, leadSchema, type LeadFormValues } from '@/features/leads/schemas'
import { Button } from '@/components/ui/Button'

type LeadFormProps = {
  initial?: Lead | null
  clients: Pick<Client, 'id' | 'name' | 'client_type'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: LeadFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: LeadFormValues = {
  client_id: '',
  contact_id: '',
  source: '',
  service_interested: '',
  status: 'new',
  estimated_value: '',
  notes: '',
  last_contacted_at: '',
  next_follow_up_at: '',
}

function toDateInput(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function toFormValues(lead: Lead): LeadFormValues {
  return {
    client_id: lead.client_id ?? '',
    contact_id: lead.contact_id ?? '',
    source: lead.source ?? '',
    service_interested: lead.service_interested ?? '',
    status: lead.status,
    estimated_value:
      lead.estimated_value === null || lead.estimated_value === undefined
        ? ''
        : String(lead.estimated_value),
    notes: lead.notes ?? '',
    last_contacted_at: toDateInput(lead.last_contacted_at),
    next_follow_up_at: toDateInput(lead.next_follow_up_at),
  }
}

export function LeadForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const [contacts, setContacts] = useState<
    Pick<Contact, 'id' | 'first_name' | 'last_name' | 'client_id'>[]
  >([])
  const [contactsError, setContactsError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setValue('contact_id', '')
      return
    }

    let active = true
    void listContactsForClient(clientId)
      .then((data) => {
        if (!active) return
        setContacts(data)
        setContactsError(null)
        const currentContact = initial?.contact_id
        if (currentContact && data.some((contact) => contact.id === currentContact)) {
          setValue('contact_id', currentContact)
        } else {
          setValue('contact_id', '')
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        setContacts([])
        setContactsError(err instanceof Error ? err.message : 'Failed to load contacts')
      })

    return () => {
      active = false
    }
  }, [clientId, initial?.contact_id, setValue])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select id="status" className="input-field mt-1 rounded-md" {...register('status')}>
          {LEAD_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-ink">
          Client
        </label>
        <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
          <option value="">No client linked</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.client_type})
            </option>
          ))}
        </select>
      </div>

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
          <option value="">{clientId ? 'No contact linked' : 'Select a client first'}</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.first_name} {contact.last_name}
            </option>
          ))}
        </select>
        {contactsError ? <p className="mt-1 text-xs text-danger">{contactsError}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="source" label="Lead source" error={errors.source?.message} {...register('source')} />
        <Field
          id="service_interested"
          label="Service interested in"
          error={errors.service_interested?.message}
          {...register('service_interested')}
        />
      </div>

      <Field
        id="estimated_value"
        label="Estimated value (USD)"
        type="number"
        step="0.01"
        min="0"
        error={errors.estimated_value?.message}
        {...register('estimated_value')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="last_contacted_at"
          label="Last contacted"
          type="date"
          error={errors.last_contacted_at?.message}
          {...register('last_contacted_at')}
        />
        <Field
          id="next_follow_up_at"
          label="Next follow-up"
          type="date"
          error={errors.next_follow_up_at?.message}
          {...register('next_follow_up_at')}
        />
      </div>

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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create lead'}
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
