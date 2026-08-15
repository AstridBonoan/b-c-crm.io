import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact, Deal, DealProposal } from '@/types/database'
import { listContactsForClient } from '@/features/pipeline/api'
import {
  PROPOSAL_STATUSES,
  proposalSchema,
  type ProposalFormValues,
} from '@/features/proposals/schemas'
import { Button } from '@/components/ui/Button'

type DealOption = Pick<
  Deal,
  'id' | 'name' | 'client_id' | 'contact_id' | 'service' | 'estimated_value' | 'proposal_amount' | 'stage'
>

type ProposalFormProps = {
  initial?: DealProposal | null
  deals: DealOption[]
  clients: Pick<Client, 'id' | 'name'>[]
  defaultDealId?: string
  submitting: boolean
  formError: string | null
  onSubmit: (values: ProposalFormValues) => Promise<void>
  onCancel: () => void
}

function emptyValues(dealId: string, deals: DealOption[]): ProposalFormValues {
  const deal = deals.find((item) => item.id === dealId)
  const amount = deal?.proposal_amount ?? deal?.estimated_value
  return {
    deal_id: dealId,
    client_id: deal?.client_id ?? '',
    contact_id: deal?.contact_id ?? '',
    service: deal?.service ?? '',
    amount: amount == null ? '' : String(amount),
    description: '',
    status: 'draft',
    sent_at: '',
    notes: '',
    move_deal_to_proposal_sent: true,
  }
}

function toFormValues(proposal: DealProposal): ProposalFormValues {
  return {
    deal_id: proposal.deal_id,
    client_id: proposal.client_id ?? '',
    contact_id: proposal.contact_id ?? '',
    service: proposal.service ?? '',
    amount: proposal.amount == null ? '' : String(proposal.amount),
    description: proposal.description ?? '',
    status: proposal.status,
    sent_at: proposal.sent_at ?? '',
    notes: proposal.notes ?? '',
    move_deal_to_proposal_sent: proposal.status === 'sent',
  }
}

export function ProposalForm({
  initial,
  deals,
  clients,
  defaultDealId = '',
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ProposalFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues(defaultDealId, deals),
  })

  const dealId = watch('deal_id')
  const clientId = watch('client_id')
  const status = watch('status')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues(defaultDealId, deals))
  }, [initial, defaultDealId, deals, reset])

  useEffect(() => {
    if (!dealId || initial) return
    const deal = deals.find((item) => item.id === dealId)
    if (!deal) return
    setValue('client_id', deal.client_id ?? '')
    setValue('contact_id', deal.contact_id ?? '')
    setValue('service', deal.service ?? '')
    const amount = deal.proposal_amount ?? deal.estimated_value
    setValue('amount', amount == null ? '' : String(amount))
  }, [dealId, deals, initial, setValue])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      return
    }
    let active = true
    void listContactsForClient(clientId).then((data) => {
      if (active) setContacts(data)
    })
    return () => {
      active = false
    }
  }, [clientId])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="deal_id" className="block text-sm font-medium text-ink">
          Deal
        </label>
        <select id="deal_id" className="input-field mt-1 rounded-md" {...register('deal_id')}>
          <option value="">Select a deal</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.name}
            </option>
          ))}
        </select>
        {errors.deal_id ? <p className="mt-1 text-xs text-danger">{errors.deal_id.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-ink">
            Client
          </label>
          <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact_id" className="block text-sm font-medium text-ink">
            Contact
          </label>
          <select id="contact_id" className="input-field mt-1 rounded-md" disabled={!clientId} {...register('contact_id')}>
            <option value="">{clientId ? 'No contact' : 'Select a client first'}</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="service" label="Service" error={errors.service?.message} {...register('service')} />
        <Field id="amount" label="Proposal amount (USD)" type="number" step="0.01" min="0" error={errors.amount?.message} {...register('amount')} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink">
          Description / scope
        </label>
        <textarea id="description" rows={3} className="input-field mt-1 rounded-md" {...register('description')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-ink">
            Status
          </label>
          <select id="status" className="input-field mt-1 rounded-md" {...register('status')}>
            {PROPOSAL_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Field id="sent_at" label="Date sent" type="date" error={errors.sent_at?.message} {...register('sent_at')} />
      </div>

      {status === 'sent' || status === 'accepted' ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-1" {...register('move_deal_to_proposal_sent')} />
          Move the deal to Proposal sent if it is still earlier in the pipeline
        </label>
      ) : null}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={2} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save proposal' : 'Create proposal'}
        </Button>
      </div>
    </form>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

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
