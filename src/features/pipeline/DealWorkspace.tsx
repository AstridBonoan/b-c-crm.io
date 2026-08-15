import { useCallback, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/features/auth/useAuth'
import type { DealMeeting, DealProposal } from '@/types/database'
import { listActivitiesForDeal, type ActivityWithRelations } from '@/features/activities/api'
import { formatOccurredAt, typeLabel } from '@/features/activities/schemas'
import { listMeetings, createMeeting, updateMeeting, type MeetingWithRelations } from '@/features/meetings/api'
import { MeetingForm } from '@/features/meetings/MeetingForm'
import {
  formatMeetingAt,
  meetingOutcomeLabel,
  meetingTypeLabel,
  type MeetingFormValues,
} from '@/features/meetings/schemas'
import { listProposals, createProposal, updateProposal, type ProposalWithRelations } from '@/features/proposals/api'
import { ProposalForm } from '@/features/proposals/ProposalForm'
import { proposalStatusLabel, type ProposalFormValues } from '@/features/proposals/schemas'
import { createTask, listTasksForDeal, type TaskWithRelations } from '@/features/tasks/api'
import { formatMoney, stageLabel } from '@/features/pipeline/schemas'
import { listClientOptions, listDealOptions, updateDealStage, type DealWithRelations } from '@/features/pipeline/api'
import type { Client, Deal } from '@/types/database'

type Tab = 'timeline' | 'meetings' | 'proposals' | 'tasks'

type DealWorkspaceProps = {
  deal: DealWithRelations | null
  open: boolean
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DealWorkspace({ deal, open, onClose, onChanged }: DealWorkspaceProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('timeline')
  const [activities, setActivities] = useState<ActivityWithRelations[]>([])
  const [meetings, setMeetings] = useState<MeetingWithRelations[]>([])
  const [proposals, setProposals] = useState<ProposalWithRelations[]>([])
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [deals, setDeals] = useState<
    Pick<Deal, 'id' | 'name' | 'client_id' | 'contact_id' | 'service' | 'estimated_value' | 'proposal_amount' | 'stage'>[]
  >([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<DealMeeting | null>(null)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<DealProposal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [winning, setWinning] = useState(false)

  const loadRelated = useCallback(async () => {
    if (!deal) return
    setError(null)
    try {
      const [activityRows, meetingRows, proposalRows, taskRows, dealRows, clientRows] = await Promise.all([
        listActivitiesForDeal(deal.id),
        listMeetings(deal.id),
        listProposals(deal.id),
        listTasksForDeal(deal.id),
        listDealOptions(),
        listClientOptions(),
      ])
      setActivities(activityRows)
      setMeetings(meetingRows)
      setProposals(proposalRows)
      setTasks(taskRows)
      setDeals(dealRows)
      setClients(clientRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deal workspace')
    }
  }, [deal])

  useEffect(() => {
    if (open && deal) void loadRelated()
  }, [open, deal, loadRelated])

  useEffect(() => {
    if (open) setTab('timeline')
  }, [open, deal?.id])

  if (!deal) return null

  const saveMeeting = async (values: MeetingFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingMeeting) await updateMeeting(editingMeeting.id, values, user?.id)
      else await createMeeting(values, user?.id)
      setMeetingOpen(false)
      setEditingMeeting(null)
      await loadRelated()
      await onChanged()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save meeting')
    } finally {
      setSubmitting(false)
    }
  }

  const saveProposal = async (values: ProposalFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingProposal) await updateProposal(editingProposal.id, values, user?.id)
      else await createProposal(values, user?.id)
      setProposalOpen(false)
      setEditingProposal(null)
      await loadRelated()
      await onChanged()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save proposal')
    } finally {
      setSubmitting(false)
    }
  }

  const addTask = async () => {
    if (!taskTitle.trim()) return
    try {
      await createTask(
        {
          title: taskTitle.trim(),
          description: '',
          due_date: taskDue,
          priority: 'medium',
          status: 'todo',
          client_id: deal.client_id ?? '',
          contact_id: deal.contact_id ?? '',
          deal_id: deal.id,
          project_id: '',
        },
        user?.id,
      )
      setTaskTitle('')
      setTaskDue('')
      await loadRelated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task')
    }
  }

  return (
    <>
      <Modal
        open={open}
        title={deal.name}
        onClose={onClose}
        wide
      >
        <p className="mb-3 text-sm text-ink-muted">
          {deal.clients?.name ?? 'No client'} · {stageLabel(deal.stage)} · {formatMoney(deal.estimated_value)}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['timeline', 'meetings', 'proposals', 'tasks'] as Tab[]).map((item) => (
            <Button key={item} variant={tab === item ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(item)}>
              {item === 'timeline' ? 'Timeline' : item === 'meetings' ? 'Meetings' : item === 'proposals' ? 'Proposals' : 'Tasks'}
            </Button>
          ))}
        </div>
        {error ? <p className="mb-3 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        {tab === 'timeline' ? (
          activities.length === 0 ? (
            <p className="text-sm text-ink-muted">No activity on this deal yet.</p>
          ) : (
            <ol className="space-y-3">
              {activities.map((row) => (
                <li key={row.id} className="border-l-2 border-line pl-3">
                  <p className="text-xs text-ink-muted">{formatOccurredAt(row.occurred_at)} · {typeLabel(row.type)}</p>
                  <p className="text-sm text-ink">{row.summary}</p>
                  {row.details ? <p className="text-xs text-ink-muted">{row.details}</p> : null}
                </li>
              ))}
            </ol>
          )
        ) : null}

        {tab === 'meetings' ? (
          <div>
            <Button size="sm" className="mb-3" onClick={() => { setEditingMeeting(null); setFormError(null); setMeetingOpen(true) }}>
              Log meeting
            </Button>
            {meetings.length === 0 ? (
              <p className="text-sm text-ink-muted">No meetings on this deal.</p>
            ) : (
              <ul className="space-y-2">
                {meetings.map((meeting) => (
                  <li key={meeting.id} className="border border-line px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{meetingTypeLabel(meeting.meeting_type)}</p>
                        <p className="text-xs text-ink-muted">{formatMeetingAt(meeting.meeting_at)}</p>
                        <p className="mt-1 text-xs">{meetingOutcomeLabel(meeting.outcome)}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingMeeting(meeting); setFormError(null); setMeetingOpen(true) }}>
                        Edit
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'proposals' ? (
          <div>
            <Button size="sm" className="mb-3" onClick={() => { setEditingProposal(null); setFormError(null); setProposalOpen(true) }}>
              Create proposal
            </Button>
            {proposals.length === 0 ? (
              <p className="text-sm text-ink-muted">No proposals on this deal.</p>
            ) : (
              <ul className="space-y-2">
                {proposals.map((proposal) => (
                  <li key={proposal.id} className="border border-line px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{formatMoney(proposal.amount)} · {proposal.service || 'Proposal'}</p>
                        <Badge>{proposalStatusLabel(proposal.status)}</Badge>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {proposal.status === 'accepted' && deal.stage !== 'won' ? (
                          <Button
                            size="sm"
                            disabled={winning}
                            onClick={() => {
                              setWinning(true)
                              void updateDealStage(deal.id, 'won', user?.id)
                                .then(() => Promise.all([loadRelated(), onChanged()]))
                                .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed'))
                                .finally(() => setWinning(false))
                            }}
                          >
                            Mark deal won
                          </Button>
                        ) : null}
                        <Button variant="secondary" size="sm" onClick={() => { setEditingProposal(proposal); setFormError(null); setProposalOpen(true) }}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === 'tasks' ? (
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="input-field flex-1 rounded-md"
                placeholder="Follow-up title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
              <input
                type="date"
                className="input-field rounded-md sm:w-40"
                value={taskDue}
                onChange={(event) => setTaskDue(event.target.value)}
              />
              <Button size="sm" onClick={() => void addTask()}>
                Add
              </Button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-ink-muted">No tasks on this deal. Existing Tasks still work from the Tasks page.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex justify-between border border-line px-3 py-2 text-sm">
                    <span>{task.title}</span>
                    <span className="text-xs text-ink-muted">{task.due_date || 'No date'} · {task.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal open={meetingOpen} title={editingMeeting ? 'Edit meeting' : 'Log meeting'} onClose={() => !submitting && setMeetingOpen(false)}>
        <MeetingForm
          initial={editingMeeting}
          deals={deals}
          clients={clients}
          defaultDealId={deal.id}
          submitting={submitting}
          formError={formError}
          onSubmit={saveMeeting}
          onCancel={() => !submitting && setMeetingOpen(false)}
        />
      </Modal>

      <Modal open={proposalOpen} title={editingProposal ? 'Edit proposal' : 'Create proposal'} onClose={() => !submitting && setProposalOpen(false)}>
        <ProposalForm
          initial={editingProposal}
          deals={deals}
          clients={clients}
          defaultDealId={deal.id}
          submitting={submitting}
          formError={formError}
          onSubmit={saveProposal}
          onCancel={() => !submitting && setProposalOpen(false)}
        />
      </Modal>
    </>
  )
}
