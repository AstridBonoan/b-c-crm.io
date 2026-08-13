import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { LeadWithRelations } from '@/features/leads/api'
import { clientSchema, type ClientFormValues } from '@/features/clients/schemas'
import { Button } from '@/components/ui/Button'

type ConvertLeadFormProps = {
  lead: LeadWithRelations
  submitting: boolean
  formError: string | null
  onSubmit: (values: ClientFormValues) => Promise<void>
  onCancel: () => void
}

function defaultsFromLead(lead: LeadWithRelations): ClientFormValues {
  const contact = lead.contacts
  const existing = lead.clients

  if (existing) {
    return {
      client_type: existing.client_type,
      client_status: 'active',
      name: existing.name,
      first_name: '',
      last_name: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      location: '',
      notes: lead.notes ?? '',
    }
  }

  if (contact) {
    return {
      client_type: 'individual',
      client_status: 'active',
      name: '',
      first_name: contact.first_name,
      last_name: contact.last_name,
      industry: '',
      website: '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      address: '',
      location: '',
      notes: lead.notes ?? '',
    }
  }

  return {
    client_type: 'organization',
    client_status: 'active',
    name: '',
    first_name: '',
    last_name: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    location: '',
    notes: lead.notes ?? '',
  }
}

export function ConvertLeadForm({
  lead,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ConvertLeadFormProps) {
  const alreadyLinked = Boolean(lead.client_id)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultsFromLead(lead),
  })

  const clientType = watch('client_type')

  useEffect(() => {
    reset(defaultsFromLead(lead))
  }, [lead, reset])

  if (alreadyLinked) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">
          This lead is already linked to{' '}
          <span className="font-semibold">{lead.clients?.name ?? 'a client'}</span>. Converting
          will mark the lead as converted and set that client to <strong>Active</strong>.
        </p>
        {formError ? (
          <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            disabled={submitting}
            onClick={() => void onSubmit(defaultsFromLead(lead))}
          >
            {submitting ? 'Converting…' : 'Convert to client'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-ink-muted">
        Create the client from this lead. Enter the real client name (not the service). We’ll mark
        the lead converted, link the client, and create a primary contact when name/email/phone is
        provided.
      </p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Client type</legend>
        <div className="flex gap-4 text-sm text-ink">
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="organization" {...register('client_type')} />
            Organization
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="individual" {...register('client_type')} />
            Individual
          </label>
        </div>
      </fieldset>

      {clientType === 'organization' ? (
        <Field id="name" label="Organization name" error={errors.name?.message} {...register('name')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="first_name"
            label="First name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Field
            id="last_name"
            label="Last name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Field id="phone" label="Phone" error={errors.phone?.message} {...register('phone')} />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={3} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>

      <input type="hidden" {...register('client_status')} value="active" />

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
          {submitting ? 'Converting…' : 'Convert to client'}
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
