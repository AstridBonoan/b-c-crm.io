import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/features/auth/useAuth'
import { InvoicePrintView } from '@/features/finance/InvoicePrintView'
import { downloadInvoicePdf } from '@/features/finance/downloadInvoicePdf'
import { InvoiceForm } from '@/features/finance/InvoiceForm'
import { PaymentForm } from '@/features/finance/PaymentForm'
import { InvoiceStatusBadge } from '@/features/finance/InvoiceStatusBadge'
import {
  cancelInvoice,
  getInvoice,
  issueInvoice,
  listClientOptions,
  listPaymentMethods,
  recordPayment,
  updateInvoice,
  type InvoiceWithRelations,
} from '@/features/finance/api'
import { formatMoney, type InvoiceFormValues, type PaymentFormValues } from '@/features/finance/schemas'
import type { Client, FinancePaymentMethod } from '@/types/database'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null)
  const [methods, setMethods] = useState<FinancePaymentMethod[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const [row, methodRows, clientRows] = await Promise.all([
        getInvoice(id),
        listPaymentMethods(),
        listClientOptions(),
      ])
      setInvoice(row)
      setMethods(methodRows)
      setClients(clientRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (!id) {
    navigate('/invoices')
    return null
  }

  const saveInvoice = async (values: InvoiceFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await updateInvoice(id, values, user?.id)
      setEditorOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const savePayment = async (values: PaymentFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await recordPayment(id, values, user?.id)
      setPayOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPdf = async () => {
    if (!invoice) return
    setDownloading(true)
    setError(null)
    try {
      await downloadInvoicePdf(invoice, methods)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice')
    } finally {
      setDownloading(false)
    }
  }

  const copySummary = async () => {
    if (!invoice) return
    const text = [
      `B&C Software & Web invoice ${invoice.invoice_number}`,
      `Client: ${invoice.clients?.name ?? ''}`,
      `Total: ${formatMoney(invoice.total)}`,
      `Paid: ${formatMoney(invoice.amount_paid)}`,
      `Balance: ${formatMoney(invoice.balance_due)}`,
      `Due: ${invoice.due_date ?? 'n/a'}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
  }

  return (
    <div>
      <PageHeader
        title={invoice?.invoice_number ?? 'Invoice'}
        description="Download a PDF to attach in Gmail yourself, or print. Record payment only after you confirm the client paid."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/invoices')}>
              Back
            </Button>
            <Button variant="secondary" onClick={() => void downloadPdf()} disabled={!invoice || downloading}>
              {downloading ? 'Downloading…' : 'Download PDF'}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="secondary" onClick={() => void copySummary()}>
              Copy summary
            </Button>
            {invoice && invoice.lifecycle === 'draft' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setBusy(true)
                  void issueInvoice(id, user?.id)
                    .then(() => load())
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed'))
                    .finally(() => setBusy(false))
                }}
                disabled={busy}
              >
                Issue
              </Button>
            ) : null}
            {invoice && invoice.lifecycle === 'issued' && invoice.balance_due > 0 ? (
              <Button onClick={() => { setFormError(null); setPayOpen(true) }}>Record payment</Button>
            ) : null}
          </div>
        }
      />

      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger print:hidden">{error}</p> : null}

      {!invoice ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading invoice…</Panel>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
            <InvoiceStatusBadge status={invoice.status} />
            <Button variant="secondary" size="sm" onClick={() => { setFormError(null); setEditorOpen(true) }}>
              Edit
            </Button>
            {invoice.lifecycle !== 'cancelled' && invoice.amount_paid === 0 ? (
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => setCancelOpen(true)}>
                Cancel invoice
              </Button>
            ) : null}
            {invoice.clients ? (
              <Link to="/clients" className="text-sm text-blue hover:underline">
                {invoice.clients.name}
              </Link>
            ) : null}
          </div>
          <Panel className="overflow-hidden p-0">
            <InvoicePrintView invoice={invoice} methods={methods} />
          </Panel>
        </>
      )}

      <Modal open={editorOpen} title="Edit invoice" onClose={() => !submitting && setEditorOpen(false)} wide>
        {invoice ? (
          <InvoiceForm
            initial={invoice}
            clients={clients}
            submitting={submitting}
            formError={formError}
            onSubmit={saveInvoice}
            onCancel={() => !submitting && setEditorOpen(false)}
          />
        ) : null}
      </Modal>

      <Modal open={payOpen} title="Record payment" onClose={() => !submitting && setPayOpen(false)}>
        {invoice ? (
          <PaymentForm
            invoice={invoice}
            submitting={submitting}
            formError={formError}
            onSubmit={savePayment}
            onCancel={() => !submitting && setPayOpen(false)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel invoice"
        message="Cancelled invoices stay in history but cannot accept payment."
        busy={busy}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => {
          setBusy(true)
          void cancelInvoice(id, user?.id)
            .then(() => { setCancelOpen(false); return load() })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed'))
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}
