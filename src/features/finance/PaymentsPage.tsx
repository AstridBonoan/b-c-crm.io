import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { listPayments, type PaymentWithRelations } from '@/features/finance/api'
import { PAYMENT_METHOD_KEYS, formatMoney, methodLabel } from '@/features/finance/schemas'

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithRelations[]>([])
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPayments(await listPayments({ search, method }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [search, method])

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(handle)
  }, [load])

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Manually recorded payments. These are not imported from PayPal, Venmo, Cash App, or Zelle."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reference or notes…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select value={method} onChange={(event) => setMethod(event.target.value)} className="input-field rounded-md lg:w-auto">
          <option value="all">All methods</option>
          {PAYMENT_METHOD_KEYS.map((key) => (
            <option key={key} value={key}>
              {methodLabel(key)}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading payments…</Panel>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments recorded"
          description="Open an issued invoice and record a payment after you confirm the client paid."
          action={
            <Link to="/invoices">
              <Button>Open invoices</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs tracking-[0.08em] text-ink-muted uppercase">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-line">
                  <td className="px-3 py-2">{payment.paid_at}</td>
                  <td className="px-3 py-2">{payment.clients?.name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Link to={`/invoices/${payment.invoice_id}`} className="text-blue hover:underline">
                      {payment.invoices?.invoice_number ?? 'Invoice'}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{formatMoney(payment.amount)}</td>
                  <td className="px-3 py-2">{methodLabel(payment.method)}</td>
                  <td className="px-3 py-2 text-ink-muted">{payment.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
