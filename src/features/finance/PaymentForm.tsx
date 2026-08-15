import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import {
  formatMoney,
  methodLabel,
  PAYMENT_METHOD_KEYS,
  paymentSchema,
  type PaymentFormValues,
} from '@/features/finance/schemas'
import type { InvoiceWithRelations } from '@/features/finance/api'

type PaymentFormProps = {
  invoice: InvoiceWithRelations
  submitting: boolean
  formError: string | null
  onSubmit: (values: PaymentFormValues) => Promise<void>
  onCancel: () => void
}

export function PaymentForm({ invoice, submitting, formError, onSubmit, onCancel }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: String(invoice.balance_due),
      method: 'zelle',
      paid_at: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: '',
    },
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-ink-muted">
        {invoice.invoice_number} · Balance {formatMoney(invoice.balance_due)}
      </p>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-ink">
          Amount
        </label>
        <input id="amount" className="input-field mt-1 rounded-md" {...register('amount')} />
        {errors.amount ? <p className="mt-1 text-xs text-danger">{errors.amount.message}</p> : null}
      </div>
      <div>
        <label htmlFor="method" className="block text-sm font-medium text-ink">
          Method
        </label>
        <select id="method" className="input-field mt-1 rounded-md" {...register('method')}>
          {PAYMENT_METHOD_KEYS.map((key) => (
            <option key={key} value={key}>
              {methodLabel(key)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="paid_at" className="block text-sm font-medium text-ink">
          Payment date
        </label>
        <input id="paid_at" type="date" className="input-field mt-1 rounded-md" {...register('paid_at')} />
      </div>
      <div>
        <label htmlFor="reference" className="block text-sm font-medium text-ink">
          Reference
        </label>
        <input id="reference" className="input-field mt-1 rounded-md" {...register('reference')} />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={2} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>
      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Record payment'}
        </Button>
      </div>
    </form>
  )
}
