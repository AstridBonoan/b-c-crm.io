import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Customer, Deal, Lead } from '@/types/database'
import {
  listLeadsForClient,
  listWonDealsForClient,
} from '@/features/customers/api'
import {
  CUSTOMER_STATUSES,
  customerSchema,
  type CustomerFormValues,
} from '@/features/customers/schemas'
import { Button } from '@/components/ui/Button'

type CustomerFormProps = {
  initial?: Customer | null
  clients: Pick<Client, 'id' | 'name' | 'client_type'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: CustomerFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: CustomerFormValues = {
  client_id: '',
  status: 'active',
  total_revenue: '',
  converted_from_deal_id: '',
  converted_from_lead_id: '',
  notes: '',
}

function toFormValues(customer: Customer): CustomerFormValues {
  return {
    client_id: customer.client_id,
    status: customer.status,
    total_revenue: String(customer.total_revenue ?? 0),
    converted_from_deal_id: customer.converted_from_deal_id ?? '',
    converted_from_lead_id: customer.converted_from_lead_id ?? '',
    notes: customer.notes ?? '',
  }
}

export function CustomerForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [deals, setDeals] = useState<
    Pick<Deal, 'id' | 'name' | 'proposal_amount' | 'estimated_value'>[]
  >([])
  const [leads, setLeads] = useState<
    Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'>[]
  >([])
  const [relationError, setRelationError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setDeals([])
      setLeads([])
      setValue('converted_from_deal_id', '')
      setValue('converted_from_lead_id', '')
      return
    }

    let active = true
    Promise.all([listWonDealsForClient(clientId), listLeadsForClient(clientId)])
      .then(([wonDeals, clientLeads]) => {
        if (!active) return
        setDeals(wonDeals)
        setLeads(clientLeads)
        setRelationError(null)

        const dealId = initial?.converted_from_deal_id
        if (dealId && wonDeals.some((deal) => deal.id === dealId)) {
          setValue('converted_from_deal_id', dealId)
        } else if (!initial) {
          setValue('converted_from_deal_id', '')
        }

        const leadId = initial?.converted_from_lead_id
        if (leadId && clientLeads.some((lead) => lead.id === leadId)) {
          setValue('converted_from_lead_id', leadId)
        } else if (!initial) {
          setValue('converted_from_lead_id', '')
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        setDeals([])
        setLeads([])
        setRelationError(err instanceof Error ? err.message : 'Failed to load related records')
      })

    return () => {
      active = false
    }
  }, [clientId, initial, setValue])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-ink">
          Client
        </label>
        <select
          id="client_id"
          className="input-field mt-1 rounded-md"
          disabled={Boolean(initial)}
          {...register('client_id')}
        >
          <option value="">Select a client…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.client_type})
            </option>
          ))}
        </select>
        {errors.client_id ? (
          <p className="mt-1 text-xs text-danger">{errors.client_id.message}</p>
        ) : null}
        {initial ? (
          <p className="mt-1 text-xs text-ink-muted">
            Client cannot be changed after the customer record is created.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select id="status" className="input-field mt-1 rounded-md" {...register('status')}>
          {CUSTOMER_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="total_revenue"
        label="Total revenue (USD)"
        type="number"
        step="0.01"
        min="0"
        error={errors.total_revenue?.message}
        {...register('total_revenue')}
      />

      <div>
        <label htmlFor="converted_from_deal_id" className="block text-sm font-medium text-ink">
          Converted from deal (optional)
        </label>
        <select
          id="converted_from_deal_id"
          className="input-field mt-1 rounded-md"
          disabled={!clientId}
          {...register('converted_from_deal_id')}
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
        <label htmlFor="converted_from_lead_id" className="block text-sm font-medium text-ink">
          Converted from lead (optional)
        </label>
        <select
          id="converted_from_lead_id"
          className="input-field mt-1 rounded-md"
          disabled={!clientId}
          {...register('converted_from_lead_id')}
        >
          <option value="">None</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {(lead.service_interested || lead.source || 'Lead') + ` · ${lead.status}`}
            </option>
          ))}
        </select>
        {relationError ? <p className="mt-1 text-xs text-danger">{relationError}</p> : null}
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
        <Button type="submit" disabled={submitting || clients.length === 0}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create customer'}
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
