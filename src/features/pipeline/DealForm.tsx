import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact, Deal } from '@/types/database'
import { listContactsForClient, listLeadOptions, type LeadOption } from '@/features/pipeline/api'
import {
  PIPELINE_STAGES,
  STAGE_PROBABILITY,
  dealSchema,
  type DealFormValues,
} from '@/features/pipeline/schemas'
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
  lead_id: '',
  service: '',
  source: '',
  estimated_value: '',
  proposal_amount: '',
  stage,
  probability: String(STAGE_PROBABILITY[stage]),
  expected_close_date: '',
  next_action: '',
  next_follow_up_at: '',
  notes: '',
})

function toFormValues(deal: Deal): DealFormValues {
  return {
    name: deal.name,
    client_id: deal.client_id ?? '',
    contact_id: deal.contact_id ?? '',
    lead_id: deal.lead_id ?? '',
    service: deal.service ?? '',
    source: deal.source ?? '',
    estimated_value:
      deal.estimated_value === null || deal.estimated_value === undefined
        ? ''
        : String(deal.estimated_value),
    proposal_amount:
      deal.proposal_amount === null || deal.proposal_amount === undefined
        ? ''
        : String(deal.proposal_amount),
    stage: deal.stage,
    probability:
      deal.probability === null || deal.probability === undefined
        ? String(STAGE_PROBABILITY[deal.stage])
        : String(deal.probability),
    expected_close_date: deal.expected_close_date ?? '',
    next_action: deal.next_action ?? '',
    next_follow_up_at: deal.next_follow_up_at ?? '',
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
  const [leads, setLeads] = useState<LeadOption[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, dirtyFields },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues(defaultStage),
  })

  const clientId = watch('client_id')
  const stage = watch('stage')
  const leadId = watch('lead_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues(defaultStage))
  }, [initial, defaultStage, reset])

  useEffect(() => {
    void listLeadOptions()
      .then(setLeads)
      .catch(() => setLeads([]))
  }, [])

  useEffect(() => {
    if (!dirtyFields.probability) {
      setValue('probability', String(STAGE_PROBABILITY[stage]))
    }
  }, [stage, dirtyFields.probability, setValue])

  useEffect(() => {
    if (!leadId || initial) return
    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return
    if (lead.client_id) setValue('client_id', lead.client_id)
    if (lead.contact_id) setValue('contact_id', lead.contact_id)
    if (lead.source) setValue('source', lead.source)
    if (lead.service_interested) setValue('service', lead.service_interested)
    if (lead.estimated_value != null) setValue('estimated_value', String(lead.estimated_value))
    if (!getValues('name') && (lead.company_name || lead.clients?.name || lead.service_interested)) {
      setValue(
        'name',
        [lead.company_name || lead.clients?.name, lead.service_interested].filter(Boolean).join(' — '),
      )
    }
  }, [leadId, leads, initial, setValue, getValues])

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
          const selected = getValues('contact_id')
          if (selected && data.some((contact) => contact.id === selected)) {
            setValue('contact_id', selected)
          } else {
            setValue('contact_id', '')
          }
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
  }, [clientId, initial?.contact_id, setValue, getValues])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field id="name" label="Deal name" error={errors.name?.message} {...register('name')} />

      <div>
        <label htmlFor="stage" className="block text-sm font-medium text-ink">
          Stage
        </label>
        <select id="stage" className="input-field mt-1 rounded-md" {...register('stage')}>
          {PIPELINE_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="lead_id" className="block text-sm font-medium text-ink">
          Source lead
        </label>
        <select id="lead_id" className="input-field mt-1 rounded-md" {...register('lead_id')}>
          <option value="">Not linked to a lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.company_name || lead.clients?.name || 'Unlinked lead'}
              {lead.service_interested ? ` · ${lead.service_interested}` : ''}
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
        <Field id="service" label="Service" error={errors.service?.message} {...register('service')} />
        <Field id="source" label="Source" error={errors.source?.message} {...register('source')} />
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="probability"
          label="Win probability (%)"
          type="number"
          min="0"
          max="100"
          error={errors.probability?.message}
          {...register('probability')}
        />
        <Field
          id="expected_close_date"
          label="Expected close date"
          type="date"
          error={errors.expected_close_date?.message}
          {...register('expected_close_date')}
        />
      </div>

      <Field
        id="next_action"
        label="Next action"
        error={errors.next_action?.message}
        {...register('next_action')}
      />

      <Field
        id="next_follow_up_at"
        label="Next follow-up"
        type="date"
        error={errors.next_follow_up_at?.message}
        {...register('next_follow_up_at')}
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
