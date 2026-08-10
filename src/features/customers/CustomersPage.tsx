import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { CustomerForm } from '@/features/customers/CustomerForm'
import {
  createCustomer,
  deleteCustomer,
  listClientOptions,
  listCustomers,
  updateCustomer,
  type CustomerWithRelations,
} from '@/features/customers/api'
import { formatMoney, type CustomerFormValues } from '@/features/customers/schemas'
import type { Client, Customer } from '@/types/database'

export function CustomersPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'client_type'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CustomerWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listCustomers({ search, status })
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    void loadClients().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    })
  }, [loadClients])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [load])

  const totals = useMemo(() => {
    const active = customers.filter((customer) => customer.status === 'active')
    return {
      activeCount: active.length,
      revenue: customers.reduce((sum, customer) => sum + Number(customer.total_revenue ?? 0), 0),
    }
  }, [customers])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setEditing(customer)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: CustomerFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateCustomer(editing.id, values)
      } else {
        await createCustomer(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save customer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteCustomer(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Clients converted into paying accounts, with revenue and relationship history."
        actions={<Button onClick={openCreate}>Add customer</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Active customers
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.activeCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Total revenue
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatMoney(totals.revenue)}</p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search client name, email, notes…"
          className="input-field rounded-md sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'all' | 'active' | 'inactive')}
          className="input-field rounded-md sm:w-auto"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading customers…</Panel>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description={
            clients.length === 0
              ? 'Add a client first, then convert them into a customer after a won deal.'
              : 'Create a customer from a client account once a deal is won.'
          }
          action={
            clients.length === 0 ? (
              <Link
                to="/clients"
                className="inline-flex items-center justify-center rounded-md bg-btn-primary-bg px-3.5 py-2 text-sm font-medium text-btn-primary-fg hover:bg-btn-primary-hover"
              >
                Go to Clients
              </Link>
            ) : (
              <Button onClick={openCreate}>Add customer</Button>
            )
          }
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Revenue</th>
                <th className="px-4 py-3 font-semibold">Related</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {customer.clients?.name ?? 'Unknown client'}
                    </p>
                    <p className="text-xs capitalize text-ink-muted">
                      {customer.clients?.client_type ?? '—'}
                      {customer.clients?.email ? ` · ${customer.clients.email}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={customer.status === 'active' ? 'success' : 'neutral'}>
                      {customer.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatMoney(customer.total_revenue)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {customer.contacts_count} contacts · {customer.deals_count} deals ·{' '}
                    {customer.projects_count} projects
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(customer)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(customer)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Modal
        open={editorOpen}
        title={editing ? 'Edit customer' : 'Add customer'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <CustomerForm
          initial={editing}
          clients={clients}
          submitting={submitting}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => {
            if (!submitting) {
              setEditorOpen(false)
              setEditing(null)
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete customer"
        message={`Delete customer “${deleting?.clients?.name ?? 'record'}”? Projects linked to this customer may block deletion.`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
