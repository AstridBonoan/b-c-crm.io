import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { ProposalForm } from '@/features/proposals/ProposalForm'
import {
  createProposal,
  deleteProposal,
  listProposals,
  updateProposal,
  type ProposalWithRelations,
} from '@/features/proposals/api'
import { proposalStatusLabel, type ProposalFormValues } from '@/features/proposals/schemas'
import { formatMoney, stageLabel } from '@/features/pipeline/schemas'
import { listClientOptions, listDealOptions, updateDealStage } from '@/features/pipeline/api'
import type { Client, Deal, DealProposal } from '@/types/database'

export function ProposalsPage() {
  const { user } = useAuth()
  const [proposals, setProposals] = useState<ProposalWithRelations[]>([])
  const [deals, setDeals] = useState<
    Pick<Deal, 'id' | 'name' | 'client_id' | 'contact_id' | 'service' | 'estimated_value' | 'proposal_amount' | 'stage'>[]
  >([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DealProposal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ProposalWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [winningId, setWinningId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, dealRows, clientRows] = await Promise.all([
        listProposals(),
        listDealOptions(),
        listClientOptions(),
      ])
      setProposals(rows)
      setDeals(dealRows)
      setClients(clientRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCount = useMemo(
    () => proposals.filter((row) => row.status === 'draft' || row.status === 'sent').length,
    [proposals],
  )

  const handleSubmit = async (values: ProposalFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) await updateProposal(editing.id, values, user?.id)
      else await createProposal(values, user?.id)
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save proposal')
    } finally {
      setSubmitting(false)
    }
  }

  const markDealWon = async (proposal: ProposalWithRelations) => {
    setWinningId(proposal.id)
    try {
      await updateDealStage(proposal.deal_id, 'won', user?.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark deal won')
    } finally {
      setWinningId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Lightweight proposals linked to deals. Sending does not email the client."
        actions={<Button onClick={() => { setEditing(null); setFormError(null); setEditorOpen(true) }}>Create proposal</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Proposals</p>
          <p className="mt-1 text-xl font-semibold text-ink">{proposals.length}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Open</p>
          <p className="mt-1 text-xl font-semibold text-ink">{openCount}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Accepted</p>
          <p className="mt-1 text-xl font-semibold text-ink">{proposals.filter((row) => row.status === 'accepted').length}</p>
        </Panel>
      </div>

      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading proposals…</Panel>
      ) : proposals.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          description="Create a draft from a deal. Amount, client, and service prefill from the opportunity."
          action={<Button onClick={() => setEditorOpen(true)}>Create proposal</Button>}
        />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs tracking-[0.08em] text-ink-muted uppercase">
              <tr>
                <th className="px-3 py-2">Deal</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sent</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    {proposal.deals?.name ?? 'Deal'}
                    {proposal.deals?.stage ? (
                      <span className="block text-xs text-ink-muted">{stageLabel(proposal.deals.stage)}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{proposal.service || '—'}</td>
                  <td className="px-3 py-2">{formatMoney(proposal.amount)}</td>
                  <td className="px-3 py-2">
                    <Badge>{proposalStatusLabel(proposal.status)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{proposal.sent_at || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {proposal.status === 'accepted' && proposal.deals?.stage !== 'won' ? (
                      <Button
                        size="sm"
                        className="mr-1"
                        disabled={winningId === proposal.id}
                        onClick={() => void markDealWon(proposal)}
                      >
                        {winningId === proposal.id ? 'Marking…' : 'Mark deal won'}
                      </Button>
                    ) : null}
                    <Button variant="secondary" size="sm" onClick={() => { setEditing(proposal); setFormError(null); setEditorOpen(true) }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-1" onClick={() => setDeleting(proposal)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editorOpen} title={editing ? 'Edit proposal' : 'Create proposal'} onClose={() => !submitting && setEditorOpen(false)}>
        <ProposalForm
          initial={editing}
          deals={deals}
          clients={clients}
          submitting={submitting}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => !submitting && setEditorOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete proposal"
        message="Delete this proposal?"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          setDeleteBusy(true)
          void deleteProposal(deleting.id)
            .then(() => { setDeleting(null); return load() })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to delete'))
            .finally(() => setDeleteBusy(false))
        }}
      />
    </div>
  )
}
