import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { LeadForm } from '@/features/leads/LeadForm'
import {
  createLead,
  deleteLead,
  listClientOptions,
  listLeads,
  updateLead,
  type LeadWithRelations,
} from '@/features/leads/api'
import {
  formatMoney,
  LEAD_STATUSES,
  statusLabel,
  type LeadFormValues,
} from '@/features/leads/schemas'
import type { Client, Lead, LeadStatus } from '@/types/database'

function statusTone(status: LeadStatus): 'neutral' | 'brand' | 'success' | 'danger' {
  if (status === 'converted' || status === 'qualified') return 'success'
  if (status === 'lost' || status === 'unqualified') return 'danger'
  if (status === 'new' || status === 'contacted') return 'brand'
  return 'neutral'
}

export function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<LeadWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'client_type'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeadStatus | 'all'>('all')
  const [clientId, setClientId] = useState<string | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<LeadWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listLeads({ search, status, clientId })
      setLeads(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [search, status, clientId])

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

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (lead: Lead) => {
    setEditing(lead)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: LeadFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateLead(editing.id, values)
      } else {
        await createLead(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save lead')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteLead(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track potential customers before they become deals or customers."
        actions={<Button onClick={openCreate}>Add lead</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search source, service, notes…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as LeadStatus | 'all')}
          className="input-field rounded-md lg:w-auto"
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={clientId}
          onChange={(event) => setClientId(event.target.value as string | 'all')}
          className="input-field rounded-md lg:w-auto"
        >
          <option value="all">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
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
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading leads…</Panel>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Capture inbound interest and follow-ups here before converting to a deal or customer."
          action={<Button onClick={openCreate}>Add lead</Button>}
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Client / Contact</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Est. value</th>
                <th className="px-4 py-3 font-semibold">Follow-up</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{lead.clients?.name ?? 'Unlinked lead'}</p>
                    <p className="text-xs text-ink-muted">
                      {lead.contacts
                        ? `${lead.contacts.first_name} ${lead.contacts.last_name}`
                        : 'No contact'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(lead.status)}>{statusLabel(lead.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{lead.source ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{lead.service_interested ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatMoney(lead.estimated_value)}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(lead)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(lead)}
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
        title={editing ? 'Edit lead' : 'Add lead'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <LeadForm
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
        title="Delete lead"
        message={`Delete this lead${deleting?.clients?.name ? ` for “${deleting.clients.name}”` : ''}?`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
