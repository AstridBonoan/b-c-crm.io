import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { listPaymentMethods, updatePaymentMethod } from '@/features/finance/api'
import { paymentMethodSettingsSchema, type PaymentMethodSettingsValues } from '@/features/finance/schemas'
import type { FinancePaymentMethod } from '@/types/database'

export function FinanceSettingsPage() {
  const [methods, setMethods] = useState<FinancePaymentMethod[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setMethods(await listPaymentMethods())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        title="Finance settings"
        description="Configure payment instructions shown on invoices. These are not live payment integrations."
        actions={
          <Link to="/finance">
            <Button variant="secondary">Back to Finance</Button>
          </Link>
        }
      />
      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mb-4 border border-line bg-surface-muted px-3 py-2 text-sm text-ink">{notice}</p> : null}
      <div className="space-y-4">
        {methods.map((method) => (
          <MethodCard
            key={method.id}
            method={method}
            onSaved={(next) => {
              setNotice('Saved')
              setMethods((prev) => prev.map((row) => (row.id === next.id ? next : row)))
            }}
          />
        ))}
      </div>
    </div>
  )
}

function MethodCard({
  method,
  onSaved,
}: {
  method: FinancePaymentMethod
  onSaved: (next: FinancePaymentMethod) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, getValues } = useForm<PaymentMethodSettingsValues>({
    resolver: zodResolver(paymentMethodSettingsSchema),
    defaultValues: {
      display_name: method.display_name,
      enabled: method.enabled,
      instructions: method.instructions ?? '',
      payment_url: method.payment_url ?? '',
      username: method.username ?? '',
      email_or_phone: method.email_or_phone ?? '',
    },
  })

  const persist = async (values: PaymentMethodSettingsValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await updatePaymentMethod(method.id, values)
      onSaved({
        ...method,
        display_name: values.display_name.trim(),
        enabled: values.enabled,
        instructions: values.instructions?.trim() || null,
        payment_url: values.payment_url?.trim() || null,
        username: values.username?.trim() || null,
        email_or_phone: values.email_or_phone?.trim() || null,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel className="px-4 py-4">
      <form
        className="space-y-3"
        onSubmit={handleSubmit((values) => persist(values))}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-ink">{method.method_key}</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register('enabled', {
                onChange: (event) => {
                  const values = getValues()
                  values.enabled = event.target.checked
                  void persist(values)
                },
              })}
            />
            Show on invoices
          </label>
        </div>
        <input className="input-field rounded-md" placeholder="Display name" {...register('display_name')} />
        <input className="input-field rounded-md" placeholder="Payment URL / link" {...register('payment_url')} />
        <input className="input-field rounded-md" placeholder="Username" {...register('username')} />
        <input className="input-field rounded-md" placeholder="Email or phone (Zelle)" {...register('email_or_phone')} />
        <textarea className="input-field rounded-md" rows={2} placeholder="Instructions" {...register('instructions')} />
        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Panel>
  )
}
