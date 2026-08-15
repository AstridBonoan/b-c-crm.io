import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { formatMoney, methodLabel } from '@/features/finance/schemas'
import { loadFinanceTotals, type FinanceTotals, type InvoiceWithRelations, type PaymentWithRelations } from '@/features/finance/api'

export function FinanceDashboardPage() {
  const [totals, setTotals] = useState<FinanceTotals | null>(null)
  const [overdue, setOverdue] = useState<InvoiceWithRelations[]>([])
  const [dueSoon, setDueSoon] = useState<InvoiceWithRelations[]>([])
  const [recent, setRecent] = useState<PaymentWithRelations[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadFinanceTotals()
      setTotals(data.totals)
      setOverdue(data.overdue)
      setDueSoon(data.dueSoon)
      setRecent(data.recentPayments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cards = totals
    ? [
        { label: 'Total invoiced', value: formatMoney(totals.invoiced) },
        { label: 'Total paid', value: formatMoney(totals.paid) },
        { label: 'Outstanding', value: formatMoney(totals.outstanding) },
        { label: 'Overdue', value: formatMoney(totals.overdue), warn: totals.overdue > 0 },
        { label: 'Invoices', value: String(totals.invoiceCount) },
        { label: 'Paid', value: String(totals.paidCount) },
        { label: 'Unpaid', value: String(totals.unpaidCount) },
        { label: 'Partially paid', value: String(totals.partialCount) },
        { label: 'Revenue this month', value: formatMoney(totals.revenueThisMonth) },
        { label: 'Revenue this year', value: formatMoney(totals.revenueThisYear) },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Internal invoices, payments, and balances. Payment links are instructions only — record payments after you confirm them."
        actions={
          <div className="flex gap-2">
            <Link to="/finance/settings">
              <Button variant="secondary">Settings</Button>
            </Link>
            <Link to="/invoices">
              <Button>Invoices</Button>
            </Link>
          </div>
        }
      />

      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading && !totals ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading finance…</Panel>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <Panel key={card.label} className="px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">{card.label}</p>
                <p className={`mt-1 text-xl font-semibold ${card.warn ? 'text-danger' : 'text-ink'}`}>{card.value}</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <AlertColumn title="Overdue" warn>
              {overdue.length === 0 ? (
                <p className="text-sm text-ink-muted">None</p>
              ) : (
                overdue.map((row) => (
                  <Link key={row.id} to={`/invoices/${row.id}`} className="block text-sm hover:underline">
                    {row.clients?.name} · {row.invoice_number} · {formatMoney(row.balance_due)}
                  </Link>
                ))
              )}
            </AlertColumn>
            <AlertColumn title="Due soon">
              {dueSoon.length === 0 ? (
                <p className="text-sm text-ink-muted">None</p>
              ) : (
                dueSoon.map((row) => (
                  <Link key={row.id} to={`/invoices/${row.id}`} className="block text-sm hover:underline">
                    {row.clients?.name} · {row.invoice_number} · due {row.due_date}
                  </Link>
                ))
              )}
            </AlertColumn>
            <AlertColumn title="Recent payments">
              {recent.length === 0 ? (
                <p className="text-sm text-ink-muted">None</p>
              ) : (
                recent.map((row) => (
                  <Link key={row.id} to={`/invoices/${row.invoice_id}`} className="block text-sm hover:underline">
                    {row.clients?.name} · {formatMoney(row.amount)} via {methodLabel(row.method)}
                  </Link>
                ))
              )}
            </AlertColumn>
          </div>
        </>
      )}
    </div>
  )
}

function AlertColumn({
  title,
  children,
  warn = false,
}: {
  title: string
  children: ReactNode
  warn?: boolean
}) {
  return (
    <Panel className="px-4 py-3">
      <p className={`text-[11px] font-semibold tracking-[0.1em] uppercase ${warn ? 'text-danger' : 'text-ink-muted'}`}>
        {title}
      </p>
      <div className="mt-2 space-y-2">{children}</div>
    </Panel>
  )
}
