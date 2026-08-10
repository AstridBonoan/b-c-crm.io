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
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { DealForm } from '@/features/pipeline/DealForm'
import {
  createDeal,
  deleteDeal,
  listClientOptions,
  listDeals,
  updateDeal,
  type DealWithRelations,
} from '@/features/deals/api'
import {
  DEAL_STAGES,
  formatMoney,
  stageLabel,
  type DealFormValues,
} from '@/features/deals/schemas'
import type { Client, Deal, DealStage } from '@/types/database'

function stageTone(stage: DealStage): 'neutral' | 'brand' | 'success' | 'danger' {
  if (stage === 'won') return 'success'
  if (stage === 'lost') return 'danger'
  if (stage === 'negotiating' || stage === 'proposal_sent') return 'brand'
  return 'neutral'
}

export function DealsPage() {
  const { user } = useAuth()
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'client_type'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [stage, setStage] = useState<DealStage | 'all'>('all')
  const [clientId, setClientId] = useState<string | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<DealWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listDeals({ search, stage, clientId })
      setDeals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [search, stage, clientId])

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
    const open = deals.filter((deal) => deal.stage !== 'won' && deal.stage !== 'lost')
    const won = deals.filter((deal) => deal.stage === 'won')
    return {
      openValue: open.reduce((sum, deal) => sum + Number(deal.estimated_value ?? 0), 0),
      wonValue: won.reduce(
        (sum, deal) => sum + Number(deal.proposal_amount ?? deal.estimated_value ?? 0),
        0,
      ),
      openCount: open.length,
      wonCount: won.length,
    }
  }, [deals])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (deal: Deal) => {
    setEditing(deal)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: DealFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateDeal(editing.id, values)
      } else {
        await createDeal(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save deal')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteDeal(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deal')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Individual sales opportunities. Use Pipeline for a Kanban view of the same records."
        actions={
          <div className="flex gap-2">
            <Link
              to="/pipeline"
              className="inline-flex items-center justify-center rounded-md border border-line bg-surface-elevated px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              Open pipeline
            </Link>
            <Button onClick={openCreate}>Add deal</Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Open deals
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.openCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Open value
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatMoney(totals.openValue)}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Won deals
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.wonCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Won value
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatMoney(totals.wonValue)}</p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search deal name, service, notes…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select
          value={stage}
          onChange={(event) => setStage(event.target.value as DealStage | 'all')}
          className="input-field rounded-md lg:w-auto"
        >
          <option value="all">All stages</option>
          {DEAL_STAGES.map((item) => (
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
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading deals…</Panel>
      ) : deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Create a deal to track an opportunity, or manage stages on the pipeline board."
          action={<Button onClick={openCreate}>Add deal</Button>}
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Deal</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Est. value</th>
                <th className="px-4 py-3 font-semibold">Proposal</th>
                <th className="px-4 py-3 font-semibold">Close date</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{deal.name}</p>
                    <p className="text-xs text-ink-muted">{deal.service ?? 'No service set'}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    <p>{deal.clients?.name ?? '—'}</p>
                    {deal.contacts ? (
                      <p className="text-xs">
                        {deal.contacts.first_name} {deal.contacts.last_name}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={stageTone(deal.stage)}>{stageLabel(deal.stage)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatMoney(deal.estimated_value)}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatMoney(deal.proposal_amount)}</td>
                  <td className="px-4 py-3 text-ink-muted">{deal.expected_close_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(deal)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(deal)}
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
        title={editing ? 'Edit deal' : 'Add deal'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <DealForm
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
        title="Delete deal"
        message={`Delete “${deleting?.name ?? 'this deal'}”?`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
