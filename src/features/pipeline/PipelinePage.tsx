import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { DealForm } from '@/features/pipeline/DealForm'
import {
  createDeal,
  deleteDeal,
  listClientOptions,
  listPipelineDeals,
  updateDeal,
  updateDealStage,
  type DealWithRelations,
} from '@/features/pipeline/api'
import {
  formatMoney,
  isFollowUpOverdue,
  isOpenStage,
  PIPELINE_STAGES,
  weightedValue,
  type DealFormValues,
} from '@/features/pipeline/schemas'
import type { Client, Deal, DealStage } from '@/types/database'

export function PipelinePage() {
  const { user } = useAuth()
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'client_type'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const [defaultStage, setDefaultStage] = useState<DealStage>('new_lead')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<DealWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropStage, setDropStage] = useState<DealStage | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPipelineDeals()
      setDeals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClients().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    })
    void load()
  }, [load, loadClients])

  const dealsByStage = useMemo(() => {
    const grouped = Object.fromEntries(
      PIPELINE_STAGES.map((stage) => [stage.value, [] as DealWithRelations[]]),
    ) as Record<DealStage, DealWithRelations[]>

    for (const deal of deals) {
      grouped[deal.stage]?.push(deal)
    }
    return grouped
  }, [deals])

  const openPipelineValue = useMemo(() => {
    return deals
      .filter((deal) => isOpenStage(deal.stage))
      .reduce((sum, deal) => sum + Number(deal.estimated_value ?? 0), 0)
  }, [deals])

  const expectedRevenue = useMemo(() => {
    return deals
      .filter((deal) => isOpenStage(deal.stage))
      .reduce((sum, deal) => sum + weightedValue(deal), 0)
  }, [deals])

  const wonValue = useMemo(() => {
    return deals
      .filter((deal) => deal.stage === 'won')
      .reduce((sum, deal) => sum + Number(deal.proposal_amount ?? deal.estimated_value ?? 0), 0)
  }, [deals])

  const lostValue = useMemo(() => {
    return deals
      .filter((deal) => deal.stage === 'lost')
      .reduce((sum, deal) => sum + Number(deal.estimated_value ?? 0), 0)
  }, [deals])

  const overdueCount = useMemo(
    () => deals.filter((deal) => isFollowUpOverdue(deal)).length,
    [deals],
  )

  const openCreate = (stage: DealStage = 'new_lead') => {
    setEditing(null)
    setDefaultStage(stage)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (deal: Deal) => {
    setEditing(deal)
    setDefaultStage(deal.stage)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: DealFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateDeal(editing.id, values, user?.id)
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

  const moveDeal = async (dealId: string, stage: DealStage) => {
    const current = deals.find((deal) => deal.id === dealId)
    if (!current || current.stage === stage) return

    setMovingId(dealId)
    setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)))
    try {
      await updateDealStage(dealId, stage, user?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move deal')
      await load()
    } finally {
      setMovingId(null)
    }
  }

  const onDragStart = (event: DragEvent<HTMLElement>, dealId: string) => {
    event.dataTransfer.setData('text/deal-id', dealId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingId(dealId)
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setDropStage(null)
  }

  const onDragOverColumn = (event: DragEvent<HTMLElement>, stage: DealStage) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropStage(stage)
  }

  const onDropColumn = async (event: DragEvent<HTMLElement>, stage: DealStage) => {
    event.preventDefault()
    const dealId = event.dataTransfer.getData('text/deal-id')
    setDropStage(null)
    setDraggingId(null)
    if (dealId) {
      await moveDeal(dealId, stage)
    }
  }

  return (
    <div>
      <PageHeader
        title="Sales Pipeline"
        description="Deal stages live only on this board. Outreach on Leads does not move these cards. Winning a deal linked to a client marks them active and can start a project."
        actions={<Button onClick={() => openCreate('new_lead')}>Add deal</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Metric label="Open pipeline value" value={formatMoney(openPipelineValue)} />
        <Metric
          label="Weighted expected"
          value={formatMoney(expectedRevenue)}
        />
        <Metric
          label="Active deals"
          value={String(deals.filter((deal) => isOpenStage(deal.stage)).length)}
        />
        <Metric label="Won" value={formatMoney(wonValue)} />
        <Metric label="Closed lost" value={formatMoney(lostValue)} />
        <Metric
          label="Overdue follow-ups"
          value={String(overdueCount)}
          warn={overdueCount > 0}
        />
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading pipeline…</Panel>
      ) : deals.length === 0 ? (
        <EmptyState
          title="No deals in the pipeline"
          description="Create a deal to start tracking opportunities across stages."
          action={<Button onClick={() => openCreate('new_lead')}>Add deal</Button>}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage) => {
            const columnDeals = dealsByStage[stage.value]
            const columnValue = columnDeals.reduce(
              (sum, deal) => sum + Number(deal.estimated_value ?? 0),
              0,
            )
            const isDropTarget = dropStage === stage.value

            return (
              <section
                key={stage.value}
                onDragOver={(event) => onDragOverColumn(event, stage.value)}
                onDragLeave={() => setDropStage((current) => (current === stage.value ? null : current))}
                onDrop={(event) => void onDropColumn(event, stage.value)}
                className={`flex w-72 shrink-0 flex-col border bg-surface-elevated transition-colors ${
                  isDropTarget ? 'border-teal bg-teal/5' : 'border-line'
                }`}
              >
                <header className="border-b border-line px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">{stage.label}</h2>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {columnDeals.length} · {formatMoney(columnValue)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openCreate(stage.value)}>
                      +
                    </Button>
                  </div>
                </header>

                <div className="flex min-h-40 flex-1 flex-col gap-2 p-2">
                  {columnDeals.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-ink-muted">Drop deals here</p>
                  ) : (
                    columnDeals.map((deal) => (
                      <article
                        key={deal.id}
                        draggable
                        onDragStart={(event) => onDragStart(event, deal.id)}
                        onDragEnd={onDragEnd}
                        className={`cursor-grab border border-line bg-surface px-3 py-3 active:cursor-grabbing ${
                          draggingId === deal.id ? 'opacity-50' : ''
                        } ${movingId === deal.id ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ink">{deal.name}</h3>
                          <button
                            type="button"
                            className="text-xs text-ink-muted hover:text-danger"
                            onClick={() => setDeleting(deal)}
                          >
                            Delete
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          {deal.clients?.name ?? 'No client'}
                          {deal.contacts
                            ? ` · ${deal.contacts.first_name} ${deal.contacts.last_name}`
                            : ''}
                        </p>
                        {deal.service ? (
                          <p className="mt-1 text-xs text-ink-muted">{deal.service}</p>
                        ) : null}
                        {deal.source ? (
                          <p className="mt-1 text-[11px] text-ink-muted">Source: {deal.source}</p>
                        ) : null}
                        <p className="mt-2 text-sm font-medium text-ink">
                          {formatMoney(deal.estimated_value)}
                          <span className="ml-1 text-xs font-normal text-ink-muted">
                            · {deal.probability ?? 0}% · {formatMoney(weightedValue(deal))} expected
                          </span>
                        </p>
                        {deal.next_action ? (
                          <p className="mt-1 text-[11px] text-ink">{deal.next_action}</p>
                        ) : null}
                        {deal.expected_close_date ? (
                          <p className="mt-1 text-[11px] text-ink-muted">
                            Close {deal.expected_close_date}
                          </p>
                        ) : null}
                        {deal.next_follow_up_at ? (
                          <p
                            className={`mt-1 text-[11px] ${
                              isFollowUpOverdue(deal) ? 'font-medium text-danger' : 'text-ink-muted'
                            }`}
                          >
                            Follow-up {deal.next_follow_up_at.slice(0, 10)}
                            {isFollowUpOverdue(deal) ? ' · overdue' : ''}
                          </p>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(deal)}>
                            Edit
                          </Button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
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
          defaultStage={defaultStage}
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

function Metric({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <Panel className="px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${warn ? 'text-danger' : 'text-ink'}`}>{value}</p>
    </Panel>
  )
}
