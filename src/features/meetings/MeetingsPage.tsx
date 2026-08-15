import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { MeetingForm } from '@/features/meetings/MeetingForm'
import {
  createMeeting,
  deleteMeeting,
  listMeetings,
  updateMeeting,
  type MeetingWithRelations,
} from '@/features/meetings/api'
import {
  formatMeetingAt,
  meetingOutcomeLabel,
  meetingTypeLabel,
  type MeetingFormValues,
} from '@/features/meetings/schemas'
import { listClientOptions, listDealOptions } from '@/features/pipeline/api'
import type { Client, Deal, DealMeeting } from '@/types/database'

export function MeetingsPage() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<MeetingWithRelations[]>([])
  const [deals, setDeals] = useState<Pick<Deal, 'id' | 'name' | 'client_id' | 'contact_id'>[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DealMeeting | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MeetingWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, dealRows, clientRows] = await Promise.all([
        listMeetings(),
        listDealOptions(),
        listClientOptions(),
      ])
      setMeetings(rows)
      setDeals(dealRows)
      setClients(clientRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return meetings.filter((row) => new Date(row.meeting_at).getTime() >= now && !row.outcome).length
  }, [meetings])

  const handleSubmit = async (values: MeetingFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) await updateMeeting(editing.id, values, user?.id)
      else await createMeeting(values, user?.id)
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save meeting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Sales meetings attached to pipeline deals. Outreach stays on Leads."
        actions={<Button onClick={() => { setEditing(null); setFormError(null); setEditorOpen(true) }}>Log meeting</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Meetings</p>
          <p className="mt-1 text-xl font-semibold text-ink">{meetings.length}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">Upcoming</p>
          <p className="mt-1 text-xl font-semibold text-ink">{upcoming}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">With outcome</p>
          <p className="mt-1 text-xl font-semibold text-ink">{meetings.filter((row) => row.outcome).length}</p>
        </Panel>
      </div>

      {error ? <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading meetings…</Panel>
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No sales meetings yet"
          description="Log a discovery call or follow-up against a deal."
          action={<Button onClick={() => setEditorOpen(true)}>Log meeting</Button>}
        />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs tracking-[0.08em] text-ink-muted uppercase">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Deal</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Next action</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id} className="border-t border-line">
                  <td className="px-3 py-2">{formatMeetingAt(meeting.meeting_at)}</td>
                  <td className="px-3 py-2">
                    {meeting.deals?.name ?? 'Deal'}
                    {meeting.clients?.name ? <span className="block text-xs text-ink-muted">{meeting.clients.name}</span> : null}
                  </td>
                  <td className="px-3 py-2">{meetingTypeLabel(meeting.meeting_type)}</td>
                  <td className="px-3 py-2">
                    <Badge>{meetingOutcomeLabel(meeting.outcome)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{meeting.next_action || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="secondary" size="sm" onClick={() => { setEditing(meeting); setFormError(null); setEditorOpen(true) }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-1" onClick={() => setDeleting(meeting)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editorOpen} title={editing ? 'Edit meeting' : 'Log meeting'} onClose={() => !submitting && setEditorOpen(false)}>
        <MeetingForm
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
        title="Delete meeting"
        message="Delete this meeting?"
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          setDeleteBusy(true)
          void deleteMeeting(deleting.id)
            .then(() => { setDeleting(null); return load() })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to delete'))
            .finally(() => setDeleteBusy(false))
        }}
      />
    </div>
  )
}
