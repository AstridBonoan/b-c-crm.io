import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { InvoiceForm } from '@/features/finance/InvoiceForm'
import { InvoiceStatusBadge } from '@/features/finance/InvoiceStatusBadge'
import {
  createInvoice,
  deleteInvoice,
  duplicateInvoice,
  listClientOptions,
  listInvoices,
  type InvoiceWithRelations,
} from '@/features/finance/api'
import { INVOICE_STATUSES, formatMoney, type InvoiceFormValues } from '@/features/finance/schemas'
import type { Client, InvoiceStatus } from '@/types/database'

export function InvoicesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')
  const [clientId, setClientId] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, clientRows] = await Promise.all([
        listInvoices({ search, status, clientId }),
        listClientOptions(),
      ])
      setInvoices(rows)
      setClients(clientRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [search, status, clientId])

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(handle)
  }, [load])

  const handleSubmit = async (values: InvoiceFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await createInvoice(values, user?.id)
      setEditorOpen(false)
      navigate(`/invoices/${created.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create invoices, record payments, and track balances. Clicking a payment link does not mark an invoice paid."
        actions={<Button onClick={() => { setFormError(null); setEditorOpen(true) }}>Create invoice</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search invoice number…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value as InvoiceStatus | 'all')} className="input-field rounded-md lg:w-auto">
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={clientId} onChange={(event) => setClientId(event.target.value as string | 'all')} className="input-field rounded-md lg:w-auto">
          <option value="all">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading invoices…</Panel>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create an invoice from a client and project. You can prefill from a won deal."
          action={<Button onClick={() => setEditorOpen(true)}>Create invoice</Button>}
        />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs tracking-[0.08em] text-ink-muted uppercase">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <Link to={`/invoices/${invoice.id}`} className="font-medium text-blue hover:underline">
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{invoice.clients?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-muted">{invoice.projects?.name ?? '—'}</td>
                  <td className={`px-3 py-2 ${invoice.status === 'overdue' ? 'font-medium text-danger' : ''}`}>
                    {invoice.due_date || '—'}
                  </td>
                  <td className="px-3 py-2">{formatMoney(invoice.total)}</td>
                  <td className="px-3 py-2">{formatMoney(invoice.amount_paid)}</td>
                  <td className="px-3 py-2">{formatMoney(invoice.balance_due)}</td>
                  <td className="px-3 py-2">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void duplicateInvoice(invoice.id, user?.id)
                          .then((copy) => navigate(`/invoices/${copy.id}`))
                          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to duplicate'))
                      }}
                    >
                      Duplicate
                    </Button>
                    {invoice.lifecycle === 'draft' ? (
                      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setDeleting(invoice)}>
                        Delete
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editorOpen} title="Create invoice" onClose={() => !submitting && setEditorOpen(false)} wide>
        <InvoiceForm
          clients={clients}
          submitting={submitting}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => !submitting && setEditorOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete draft invoice"
        message={`Delete ${deleting?.invoice_number ?? 'this draft'}?`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          setDeleteBusy(true)
          void deleteInvoice(deleting.id)
            .then(() => { setDeleting(null); return load() })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to delete'))
            .finally(() => setDeleteBusy(false))
        }}
      />
    </div>
  )
}
