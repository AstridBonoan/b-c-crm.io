import { Link } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import { formatMoney } from '@/features/finance/schemas'
import { InvoiceStatusBadge } from '@/features/finance/InvoiceStatusBadge'
import type { ClientFinanceSummary } from '@/features/finance/api'

export function FinanceSummaryPanel({
  title,
  summary,
}: {
  title: string
  summary: ClientFinanceSummary
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Total billed</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(summary.billed)}</p>
        </Panel>
        <Panel className="px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Total paid</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(summary.paid)}</p>
        </Panel>
        <Panel className="px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Outstanding</p>
          <p className="mt-1 text-lg font-semibold">{formatMoney(summary.outstanding)}</p>
        </Panel>
        <Panel className="px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Overdue</p>
          <p className={`mt-1 text-lg font-semibold ${summary.overdue > 0 ? 'text-danger' : ''}`}>
            {formatMoney(summary.overdue)}
          </p>
        </Panel>
      </div>
      {summary.invoices.length === 0 ? (
        <p className="text-sm text-ink-muted">No invoices yet.</p>
      ) : (
        <ul className="space-y-2">
          {summary.invoices.slice(0, 8).map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between gap-2 text-sm">
              <Link to={`/invoices/${invoice.id}`} className="font-medium text-blue hover:underline">
                {invoice.invoice_number}
              </Link>
              <span className="text-ink-muted">{formatMoney(invoice.balance_due)}</span>
              <InvoiceStatusBadge status={invoice.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
