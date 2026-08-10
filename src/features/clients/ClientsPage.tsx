import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { ClientForm } from '@/features/clients/ClientForm'
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
} from '@/features/clients/api'
import {
  CLIENT_STATUSES,
  statusLabel,
  type ClientFormValues,
} from '@/features/clients/schemas'
import type { Client, ClientStatus, ClientType } from '@/types/database'

function statusTone(status: ClientStatus): 'neutral' | 'brand' | 'success' | 'danger' {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'danger'
  return 'brand'
}

export function ClientsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [clientType, setClientType] = useState<'all' | ClientType>('all')
  const statusParam = searchParams.get('status')
  const status: 'all' | ClientStatus =
    statusParam === 'prospect' || statusParam === 'active' || statusParam === 'inactive'
      ? statusParam
      : 'all'
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const setStatus = (next: 'all' | ClientStatus) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'all') params.delete('status')
        else params.set('status', next)
        return params
      },
      { replace: true },
    )
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClients({ search, clientType, status })
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [search, clientType, status])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditing(client)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: ClientFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateClient(editing.id, values)
      } else {
        await createClient(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save client')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteClient(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="People and companies you work with. Convert a lead into a client when they’re ready to move forward."
        actions={<Button onClick={openCreate}>Add client</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone, industry…"
          className="input-field sm:max-w-sm"
        />
        <select
          value={clientType}
          onChange={(event) => setClientType(event.target.value as 'all' | ClientType)}
          className="input-field sm:w-auto"
        >
          <option value="all">All types</option>
          <option value="organization">Organizations</option>
          <option value="individual">Individuals</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'all' | ClientStatus)}
          className="input-field sm:w-auto"
        >
          <option value="all">All statuses</option>
          {CLIENT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading clients…</Panel>
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Convert a qualified lead into a client, or add a client directly."
          action={<Button onClick={openCreate}>Add client</Button>}
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3 font-medium text-ink">{client.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={client.client_type === 'individual' ? 'brand' : 'neutral'}>
                      {client.client_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(client.client_status)}>
                      {statusLabel(client.client_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{client.email ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{client.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(client)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(client)}
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
        title={editing ? 'Edit client' : 'Add client'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <ClientForm
          initial={editing}
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
        title="Delete client"
        message={`Delete “${deleting?.name ?? 'this client'}”? Related contacts may also be removed.`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
