import { BrandLogo } from '@/components/brand/BrandLogo'
import { formatMoney, methodLabel, statusLabel } from '@/features/finance/schemas'
import type { InvoiceWithRelations } from '@/features/finance/api'
import type { FinancePaymentMethod } from '@/types/database'

export function InvoicePrintView({
  invoice,
  methods,
}: {
  invoice: InvoiceWithRelations
  methods: FinancePaymentMethod[]
}) {
  const enabled = methods.filter((method) => method.enabled)
  const contactName = invoice.contacts
    ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}`
    : null

  return (
    <div className="invoice-print bg-white px-6 py-8 text-ink">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <BrandLogo variant="light" className="h-12 w-auto object-contain" />
          <p className="mt-2 text-xs tracking-[0.16em] text-ink-muted uppercase">B&C Software & Web</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">INVOICE</p>
          <p className="mt-1 text-sm">{invoice.invoice_number}</p>
          <p className="text-xs text-ink-muted">Status: {statusLabel(invoice.status)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Bill to</p>
          <p className="mt-1 font-medium">{invoice.clients?.name ?? 'Client'}</p>
          {contactName ? <p className="text-sm">{contactName}</p> : null}
          {invoice.clients?.email ? <p className="text-sm">{invoice.clients.email}</p> : null}
          {invoice.clients?.phone ? <p className="text-sm">{invoice.clients.phone}</p> : null}
          {invoice.clients?.address ? <p className="text-sm">{invoice.clients.address}</p> : null}
        </div>
        <div className="text-sm sm:text-right">
          <p>Invoice date: {invoice.invoice_date}</p>
          <p>Due date: {invoice.due_date || '—'}</p>
          {invoice.projects?.name ? <p>Project: {invoice.projects.name}</p> : null}
        </div>
      </div>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] tracking-[0.1em] text-ink-muted uppercase">
            <th className="py-2">Description</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Unit</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-line/70">
              <td className="py-2">{item.description}</td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">{formatMoney(item.unit_price)}</td>
              <td className="py-2 text-right">{formatMoney(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>{formatMoney(invoice.discount_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatMoney(invoice.tax_amount)}</span>
        </div>
        <div className="mt-2 flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(invoice.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount paid</span>
          <span>{formatMoney(invoice.amount_paid)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Balance due</span>
          <span>{formatMoney(invoice.balance_due)}</span>
        </div>
      </div>

      {enabled.length > 0 ? (
        <div className="mt-8">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Payment options</p>
          <p className="mt-1 text-xs text-ink-muted">
            These are instructions only. Payment is recorded in the CRM after B&C confirms it.
          </p>
          <ul className="mt-3 space-y-3">
            {enabled.map((method) => (
              <li key={method.id} className="border border-line px-3 py-2">
                <p className="font-medium">{method.display_name}</p>
                {method.username ? <p className="text-sm">{method.username}</p> : null}
                {method.email_or_phone ? <p className="text-sm">{method.email_or_phone}</p> : null}
                {method.payment_url ? (
                  <a href={method.payment_url} className="text-sm text-blue hover:underline" target="_blank" rel="noreferrer">
                    Pay with {method.display_name}
                  </a>
                ) : null}
                {method.instructions ? <p className="text-sm text-ink-muted">{method.instructions}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invoice.payments.filter((row) => row.status === 'completed').length > 0 ? (
        <div className="mt-8">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Payment history</p>
          <ul className="mt-2 space-y-1 text-sm">
            {invoice.payments
              .filter((row) => row.status === 'completed')
              .map((payment) => (
                <li key={payment.id}>
                  {payment.paid_at} · {methodLabel(payment.method)} · {formatMoney(payment.amount)}
                  {payment.reference ? ` · ${payment.reference}` : ''}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {invoice.notes ? (
        <div className="mt-8">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{invoice.notes}</p>
        </div>
      ) : null}
    </div>
  )
}
