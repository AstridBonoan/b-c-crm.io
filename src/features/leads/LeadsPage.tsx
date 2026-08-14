import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { LeadForm } from '@/features/leads/LeadForm'
import { ConvertLeadForm } from '@/features/leads/ConvertLeadForm'
import {
  convertLeadToClient,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
  type LeadWithRelations,
} from '@/features/leads/api'
import {
  formatMoney,
  statusLabel,
  type LeadFormValues,
} from '@/features/leads/schemas'
import type { ClientFormValues } from '@/features/clients/schemas'
import type { Lead, LeadStatus } from '@/types/database'

function statusTone(status: LeadStatus): 'neutral' | 'brand' | 'success' | 'danger' {
  if (status === 'converted') return 'success'
  if (status === 'lost') return 'danger'
  if (status === 'following_up') return 'brand'
  if (status === 'new' || status === 'contacted') return 'brand'
  return 'neutral'
}

function leadTitle(lead: LeadWithRelations): string {
  return (
    lead.company_name ||
    lead.clients?.name ||
    lead.service_interested ||
    lead.source ||
    'New lead'
  )
}

type LeadTableProps = {
  title: string
  leads: LeadWithRelations[]
  showTrash?: boolean
  onConvert: (lead: LeadWithRelations) => void
  onEdit: (lead: Lead) => void
  onDelete?: (lead: LeadWithRelations) => void
}

function LeadTable({ title, leads, showTrash, onConvert, onEdit, onDelete }: LeadTableProps) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-ink">
        {title}
        <span className="ml-2 font-normal text-ink-muted">({leads.length})</span>
      </h2>
      <Panel className="overflow-x-auto">
        {leads.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No leads in this list.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead</th>
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
                    <p className="font-medium text-ink">{leadTitle(lead)}</p>
                    <p className="text-xs text-ink-muted">
                      {lead.clients?.name ? `Client: ${lead.clients.name}` : 'Not a client yet'}
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
                    <div className="flex flex-wrap items-center gap-2">
                      {lead.status !== 'converted' ? (
                        <Button variant="secondary" size="sm" onClick={() => onConvert(lead)}>
                          Convert
                        </Button>
                      ) : null}
                      <Button variant="secondary" size="sm" onClick={() => onEdit(lead)}>
                        Edit
                      </Button>
                      {showTrash && onDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-lg leading-none text-danger hover:bg-danger-soft"
                          aria-label={`Delete ${leadTitle(lead)} for good`}
                          title="Delete for good"
                          onClick={() => onDelete(lead)}
                        >
                          🗑️
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </section>
  )
}

export function LeadsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState<LeadWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<LeadWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [converting, setConverting] = useState<LeadWithRelations | null>(null)
  const [convertBusy, setConvertBusy] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listLeads({ search, status: 'all', clientId: 'all' })
      setLeads(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [load])

  const contactedLeads = useMemo(
    () => leads.filter((lead) => lead.status === 'contacted'),
    [leads],
  )
  const followingUpLeads = useMemo(
    () => leads.filter((lead) => lead.status === 'following_up'),
    [leads],
  )
  const lostLeads = useMemo(
    () => leads.filter((lead) => lead.status === 'lost'),
    [leads],
  )

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
        await updateLead(editing.id, values, editing)
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

  const openConvert = (lead: LeadWithRelations) => {
    setConverting(lead)
    setConvertError(null)
  }

  const handleConvert = async (values: ClientFormValues) => {
    if (!converting) return
    setConvertBusy(true)
    setConvertError(null)
    try {
      const result = await convertLeadToClient(converting, values, user?.id)
      setConverting(null)
      await load()
      navigate(`/clients?status=active&q=${encodeURIComponent(result.client.name)}`)
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Failed to convert lead')
    } finally {
      setConvertBusy(false)
    }
  }

  const hasAnyTableRows = leads.length > 0

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Capture interest first. When they’re ready, convert the lead into a client."
        actions={<Button onClick={openCreate}>Add lead</Button>}
      />

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company, source, service, notes…"
          className="input-field rounded-md lg:max-w-sm"
        />
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading leads…</Panel>
      ) : !hasAnyTableRows ? (
        search.trim() ? (
          <EmptyState
            title="No matching leads"
            description="Try clearing search to see all leads."
            action={
              <Button variant="secondary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No leads yet"
            description="Capture inbound interest here, then convert a lead into a client."
            action={<Button onClick={openCreate}>Add lead</Button>}
          />
        )
      ) : (
        <>
          <LeadTable
            title="All leads"
            leads={leads}
            onConvert={openConvert}
            onEdit={openEdit}
          />
          {contactedLeads.length > 0 ? (
            <LeadTable
              title="Contacted"
              leads={contactedLeads}
              onConvert={openConvert}
              onEdit={openEdit}
            />
          ) : null}
          {followingUpLeads.length > 0 ? (
            <LeadTable
              title="Following Up"
              leads={followingUpLeads}
              onConvert={openConvert}
              onEdit={openEdit}
            />
          ) : null}
          {lostLeads.length > 0 ? (
            <LeadTable
              title="Lost"
              leads={lostLeads}
              showTrash
              onConvert={openConvert}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ) : null}
        </>
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
          linkedClientName={
            editing
              ? leads.find((lead) => lead.id === editing.id)?.clients?.name ?? null
              : null
          }
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

      <Modal
        open={Boolean(converting)}
        title="Convert lead to client"
        onClose={() => {
          if (!convertBusy) {
            setConverting(null)
            setConvertError(null)
          }
        }}
      >
        {converting ? (
          <ConvertLeadForm
            lead={converting}
            submitting={convertBusy}
            formError={convertError}
            onSubmit={handleConvert}
            onCancel={() => {
              if (!convertBusy) {
                setConverting(null)
                setConvertError(null)
              }
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete lead for good"
        message={`Permanently delete “${deleting ? leadTitle(deleting) : 'this lead'}”? This cannot be undone.`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
