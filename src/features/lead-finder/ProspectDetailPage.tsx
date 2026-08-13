import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import {
  addProspectNote,
  getProspect,
  listProspectNotes,
  saveProspectToCrm,
  updateProspectNotesField,
  updateProspectStatus,
} from '@/features/lead-finder/api'
import { PIPELINE_STATUSES, type Prospect, type ProspectNote } from '@/features/lead-finder/types'

export function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [notes, setNotes] = useState<ProspectNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [crmNotes, setCrmNotes] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [p, n] = await Promise.all([getProspect(id), listProspectNotes(id)])
      setProspect(p)
      setNotes(n)
      setCrmNotes(p.notes ?? '')
      setFollowUp(p.next_follow_up_at ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prospect')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading prospect…</Panel>
  }

  if (!prospect) {
    return (
      <div>
        <p className="text-sm text-danger">{error ?? 'Prospect not found'}</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/lead-finder')}>
          Back to Lead Finder
        </Button>
      </div>
    )
  }

  const onSaveCrm = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveProspectToCrm(prospect, user?.id)
      await load()
      navigate(`/leads`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to CRM')
    } finally {
      setBusy(false)
    }
  }

  const onAddNote = async () => {
    if (!noteBody.trim()) return
    setBusy(true)
    try {
      await addProspectNote(prospect.id, noteBody, followUp || undefined, user?.id)
      setNoteBody('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={prospect.business_name}
        description={[prospect.industry, prospect.city, prospect.state].filter(Boolean).join(' · ')}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/lead-finder')}>
              Back
            </Button>
            <Button onClick={() => void onSaveCrm()} disabled={busy || prospect.saved_to_crm}>
              {prospect.saved_to_crm ? 'Saved to CRM' : busy ? 'Saving…' : 'Save lead to CRM'}
            </Button>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Panel className="mb-4 px-4 py-4">
        <h2 className="text-sm font-semibold text-ink">Business information</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink">{prospect.phone ?? '—'}</dd>
          </div>
            <div>
              <dt className="text-ink-muted">Website</dt>
              <dd className="text-ink">
                {prospect.website ? (
                  <a
                    href={prospect.website}
                    className="text-blue hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {prospect.website}
                  </a>
                ) : (
                  <span>
                    Not on file.{' '}
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(
                        `"${prospect.business_name}" ${[prospect.city, prospect.state]
                          .filter(Boolean)
                          .join(' ')} website`,
                      )}`}
                      className="text-blue hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Search to confirm
                    </a>
                  </span>
                )}
              </dd>
            </div>
          <div>
            <dt className="text-ink-muted">Address</dt>
            <dd className="text-ink">
              {[prospect.address, prospect.city, prospect.state, prospect.zip]
                .filter(Boolean)
                .join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Industry</dt>
            <dd className="text-ink">{prospect.industry ?? prospect.category ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Pipeline</dt>
            <dd className="mt-1">
              <select
                className="input-field rounded-md"
                value={prospect.pipeline_status}
                onChange={(e) =>
                  void updateProspectStatus(
                    prospect.id,
                    e.target.value as Prospect['pipeline_status'],
                  ).then(() => load())
                }
              >
                {PIPELINE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </dd>
          </div>
          {prospect.saved_to_crm && prospect.crm_lead_id ? (
            <div>
              <dt className="text-ink-muted">CRM</dt>
              <dd>
                <Link to="/leads" className="text-sm text-blue hover:underline">
                  Open Leads
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <Panel className="mb-4 px-4 py-4">
        <h2 className="text-sm font-semibold text-ink">Notes & follow-ups</h2>
        <textarea
          className="input-field mt-3 rounded-md"
          rows={3}
          value={crmNotes}
          onChange={(e) => setCrmNotes(e.target.value)}
          placeholder="Internal notes…"
        />
        <div className="mt-2 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() =>
              void updateProspectNotesField(prospect.id, crmNotes).then(() => load())
            }
          >
            Save notes
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <textarea
            className="input-field rounded-md sm:col-span-2"
            rows={2}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Owner seems interested in redesign. Follow up next Tuesday."
          />
          <div>
            <label className="text-xs text-ink-muted">Next follow-up</label>
            <input
              type="date"
              className="input-field mt-1 rounded-md"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void onAddNote()} disabled={busy || !noteBody.trim()}>
              Add activity note
            </Button>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-line/70">
          {notes.map((n) => (
            <li key={n.id} className="py-3 text-sm">
              <p className="text-ink">{n.body}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {new Date(n.created_at).toLocaleString()}
                {n.next_follow_up_at ? ` · Follow up ${n.next_follow_up_at}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
