import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact, Deal } from '@/types/database'
import { listContactsForClient } from '@/features/pipeline/api'
import { PIPELINE_STAGES, dealSchema, type DealFormValues } from '@/features/pipeline/schemas'
import { Button } from '@/components/ui/Button'

type DealFormProps = {
  initial?: Deal | null
  defaultStage?: DealFormValues['stage']
  clients: Pick<Client, 'id' | 'name' | 'client_type'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: DealFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues = (stage: DealFormValues['stage']): DealFormValues => ({
  name: '',
  client_id: '',
  contact_id: '',
  service: '',
  estimated_value: '',
  proposal_amount: '',
  stage,
  expected_close_date: '',
  notes: '',
})

function toFormValues(deal: Deal): DealFormValues {
  return {
    name: deal.name,
    client_id: deal.client_id ?? '',
    contact_id: deal.contact_id ?? '',
    service: deal.service ?? '',
    estimated_value:
      deal.estimated_value === null || deal.estimated_value === undefined
        ? ''
        : String(deal.estimated_value),
    proposal_amount:
      deal.proposal_amount === null || deal.proposal_amount === undefined
        ? ''
        : String(deal.proposal_amount),
    stage: deal.stage,
    expected_close_date: deal.expected_close_date ?? '',
    notes: deal.notes ?? '',
  }
}

export function DealForm({
  initial,
  defaultStage = 'new_lead',
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: DealFormProps) {
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
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues(defaultStage),
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues(defaultStage))
  }, [initial, defaultStage, reset])

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
      <Field id="name" label="Deal name" error={errors.name?.message} {...register('name')} />

      <div>
        <label htmlFor="stage" className="block text-sm font-medium text-ink">
          Stage
        </label>
        <select id="stage" className="input-field mt-1 rounded-md" {...register('stage')}>
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
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

      <Field id="service" label="Service" error={errors.service?.message} {...register('service')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="estimated_value"
          label="Estimated value (USD)"
          type="number"
          step="0.01"
          min="0"
          error={errors.estimated_value?.message}
          {...register('estimated_value')}
        />
        <Field
          id="proposal_amount"
          label="Proposal amount (USD)"
          type="number"
          step="0.01"
          min="0"
          error={errors.proposal_amount?.message}
          {...register('proposal_amount')}
        />
      </div>

      <Field
        id="expected_close_date"
        label="Expected close date"
        type="date"
        error={errors.expected_close_date?.message}
        {...register('expected_close_date')}
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create deal'}
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
