import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Client, Contact, Deal, Project } from '@/types/database'
import {
  formatMoney,
  invoiceSchema,
  parseMoney,
  parseQuantity,
  roundMoney,
  type InvoiceFormValues,
} from '@/features/finance/schemas'
import {
  listContactsForClient,
  listProjectsForClient,
  listWonDeals,
  type InvoiceWithRelations,
} from '@/features/finance/api'
import { Button } from '@/components/ui/Button'

type InvoiceFormProps = {
  initial?: InvoiceWithRelations | null
  clients: Pick<Client, 'id' | 'name'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: InvoiceFormValues) => Promise<void>
  onCancel: () => void
}

const emptyItem = { description: '', quantity: '1', unit_price: '' }

function emptyValues(): InvoiceFormValues {
  return {
    client_id: '',
    contact_id: '',
    project_id: '',
    deal_id: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    discount_amount: '0',
    tax_amount: '0',
    notes: '',
    issue_now: false,
    items: [{ ...emptyItem }],
  }
}

export function InvoiceForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: InvoiceFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name'>[]>([])
  const [deals, setDeals] = useState<
    Pick<Deal, 'id' | 'name' | 'client_id' | 'contact_id' | 'service' | 'estimated_value' | 'proposal_amount'>[]
  >([])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: emptyValues(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const clientId = watch('client_id')
  const dealId = watch('deal_id')
  const items = watch('items')
  const discount = watch('discount_amount')
  const tax = watch('tax_amount')

  useEffect(() => {
    void listWonDeals().then(setDeals).catch(() => setDeals([]))
  }, [])

  useEffect(() => {
    if (!initial) {
      reset(emptyValues())
      return
    }
    reset({
      client_id: initial.client_id,
      contact_id: initial.contact_id ?? '',
      project_id: initial.project_id ?? '',
      deal_id: initial.deal_id ?? '',
      invoice_date: initial.invoice_date,
      due_date: initial.due_date ?? '',
      discount_amount: String(initial.discount_amount),
      tax_amount: String(initial.tax_amount),
      notes: initial.notes ?? '',
      issue_now: initial.lifecycle === 'issued',
      items: initial.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
      })),
    })
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setProjects([])
      return
    }
    let active = true
    void Promise.all([listContactsForClient(clientId), listProjectsForClient(clientId)]).then(
      ([contactRows, projectRows]) => {
        if (!active) return
        setContacts(contactRows)
        setProjects(projectRows)
      },
    )
    return () => {
      active = false
    }
  }, [clientId])

  useEffect(() => {
    if (!dealId || initial) return
    const deal = deals.find((item) => item.id === dealId)
    if (!deal) return
    if (deal.client_id) setValue('client_id', deal.client_id)
    if (deal.contact_id) setValue('contact_id', deal.contact_id)
    const amount = deal.proposal_amount ?? deal.estimated_value
    if (deal.service || amount != null) {
      setValue('items', [
        {
          description: deal.service || deal.name,
          quantity: '1',
          unit_price: amount == null ? '' : String(amount),
        },
      ])
    }
  }, [dealId, deals, initial, setValue])

  const preview = useMemo(() => {
    const subtotal = roundMoney(
      (items ?? []).reduce(
        (sum, item) => sum + roundMoney(parseQuantity(item.quantity) * parseMoney(item.unit_price)),
        0,
      ),
    )
    const discountAmount = parseMoney(discount)
    const taxAmount = parseMoney(tax)
    return {
      subtotal,
      total: roundMoney(Math.max(0, subtotal - discountAmount + taxAmount)),
    }
  }, [items, discount, tax])

  const locked = Boolean(initial && initial.amount_paid > 0)

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="deal_id" className="block text-sm font-medium text-ink">
          Prefill from won deal
        </label>
        <select id="deal_id" className="input-field mt-1 rounded-md" disabled={locked} {...register('deal_id')}>
          <option value="">None</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">Optional. Review line items before saving. Winning a deal does not create an invoice.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-ink">
            Client
          </label>
          <select id="client_id" className="input-field mt-1 rounded-md" disabled={locked} {...register('client_id')}>
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.client_id ? <p className="mt-1 text-xs text-danger">{errors.client_id.message}</p> : null}
        </div>
        <div>
          <label htmlFor="contact_id" className="block text-sm font-medium text-ink">
            Contact
          </label>
          <select id="contact_id" className="input-field mt-1 rounded-md" disabled={!clientId || locked} {...register('contact_id')}>
            <option value="">No contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="project_id" className="block text-sm font-medium text-ink">
          Project
        </label>
        <select id="project_id" className="input-field mt-1 rounded-md" disabled={!clientId || locked} {...register('project_id')}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="invoice_date" className="block text-sm font-medium text-ink">
            Invoice date
          </label>
          <input id="invoice_date" type="date" className="input-field mt-1 rounded-md" {...register('invoice_date')} />
        </div>
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-ink">
            Due date
          </label>
          <input id="due_date" type="date" className="input-field mt-1 rounded-md" {...register('due_date')} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Line items</p>
          {!locked ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ ...emptyItem })}>
              Add line
            </Button>
          ) : null}
        </div>
        {errors.items?.message ? <p className="mb-2 text-xs text-danger">{errors.items.message}</p> : null}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
              <input
                className="input-field rounded-md"
                placeholder="Description"
                disabled={locked}
                {...register(`items.${index}.description`)}
              />
              <input
                className="input-field rounded-md"
                placeholder="Qty"
                disabled={locked}
                {...register(`items.${index}.quantity`)}
              />
              <input
                className="input-field rounded-md"
                placeholder="Price"
                disabled={locked}
                {...register(`items.${index}.unit_price`)}
              />
              {!locked && fields.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  Remove
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="discount_amount" className="block text-sm font-medium text-ink">
            Discount
          </label>
          <input id="discount_amount" className="input-field mt-1 rounded-md" disabled={locked} {...register('discount_amount')} />
        </div>
        <div>
          <label htmlFor="tax_amount" className="block text-sm font-medium text-ink">
            Tax
          </label>
          <input id="tax_amount" className="input-field mt-1 rounded-md" disabled={locked} {...register('tax_amount')} />
        </div>
      </div>

      <p className="text-sm text-ink">
        Subtotal {formatMoney(preview.subtotal)} · Total {formatMoney(preview.total)}
      </p>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={3} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>

      {initial?.lifecycle !== 'issued' ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-1" {...register('issue_now')} />
          Issue now (Unpaid). Leave unchecked to keep as Draft.
        </label>
      ) : null}

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save invoice' : 'Create invoice'}
        </Button>
      </div>
    </form>
  )
}
