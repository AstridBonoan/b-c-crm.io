import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { ProfileForm } from '@/features/roles/ProfileForm'
import {
  loadTeamOverview,
  updateTeamMember,
  type TeamOverview,
} from '@/features/roles/api'
import {
  displayName,
  isDeliveryPrimary,
  isGrowthPrimary,
  roleShortTitle,
  roleSummary,
  roleTitle,
} from '@/features/roles/roles'
import type { ProfileFormValues } from '@/features/roles/schemas'
import type { Profile } from '@/types/database'
import { formatOccurredAt, typeLabel } from '@/features/activities/schemas'

function memberLabel(members: Profile[], id: string | null): string {
  if (!id) return 'Unassigned'
  const member = members.find((item) => item.id === id)
  return member ? displayName(member) : 'Teammate'
}

export function TeamPage() {
  const { user, refreshProfile } = useAuth()
  const [overview, setOverview] = useState<TeamOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOverview(await loadTeamOverview())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const members = overview?.members ?? []
  const cto = members.find((member) => member.role === 'founder_cto')
  const cmo = members.find((member) => member.role === 'founder_cmo')

  const partnerWork = useMemo(() => {
    if (!overview || !user) return { projects: [], leads: [], activities: [] }
    const otherIds = overview.members
      .filter((member) => member.id !== user.id)
      .map((member) => member.id)
    return {
      projects: overview.recentProjects.filter(
        (project) => project.assigned_to && otherIds.includes(project.assigned_to),
      ),
      leads: overview.recentLeads.filter(
        (lead) => lead.assigned_to && otherIds.includes(lead.assigned_to),
      ),
      activities: overview.recentActivities.filter(
        (activity) => activity.created_by && otherIds.includes(activity.created_by),
      ),
    }
  }, [overview, user])

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!editing) return
    setSubmitting(true)
    setFormError(null)
    try {
      await updateTeamMember(editing.id, values)
      if (editing.id === user?.id) {
        await refreshProfile()
      }
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Soft ownership lanes for B&C founders. Both of you can edit everything — titles mark who usually leads each area."
        actions={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Panel className="mb-4 px-4 py-4">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
          Employee allowlist
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Only these emails can be active in the CRM. Add or remove rows in Supabase SQL
          (`employee_allowlist`) — not from this screen.
        </p>
        {overview?.allowlist?.length ? (
          <ul className="mt-3 space-y-1 text-sm text-ink">
            {overview.allowlist.map((row) => (
              <li key={row.email}>
                <span className="font-medium">{row.email}</span>
                {row.note ? <span className="text-ink-muted"> · {row.note}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            {loading
              ? 'Loading allowlist…'
              : 'No allowlist rows yet. Run the employee_allowlist migration, then refresh.'}
          </p>
        )}
      </Panel>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Panel className="px-4 py-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Delivery lane
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">Projects & completion</p>
          <p className="mt-1 text-sm text-ink-muted">
            Primary: {cto ? displayName(cto) : 'Assign Founder & CTO'} · Both can still update
          </p>
        </Panel>
        <Panel className="px-4 py-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Growth lane
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">Marketing & leads</p>
          <p className="mt-1 text-sm text-ink-muted">
            Primary: {cmo ? displayName(cmo) : 'Assign Co-Founder & CMO'} · Both can still update
          </p>
        </Panel>
      </div>

      {loading && !overview ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading team…</Panel>
      ) : members.length === 0 ? (
        <EmptyState
          title="No profiles yet"
          description="Invite founders in Supabase Auth, add their emails to employee_allowlist, then refresh. Edit names and roles here."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {members.map((member) => (
            <Panel key={member.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{displayName(member)}</p>
                  <p className="text-sm text-ink-muted">{member.email}</p>
                </div>
                <Badge tone={member.is_active ? 'success' : 'danger'}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">{roleTitle(member.role)}</Badge>
                <Badge tone="neutral">{roleShortTitle(member.role)}</Badge>
              </div>
              <p className="mt-3 text-sm text-ink-muted">{roleSummary(member.role)}</p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={() => setEditing(member)}>
                  Edit profile
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Partner projects</h2>
            <Link to="/projects" className="text-xs font-medium text-blue hover:underline">
              Open
            </Link>
          </div>
          {!partnerWork.projects.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">
              No projects assigned to your partner yet.
            </p>
          ) : (
            <ul className="divide-y divide-line/70">
              {partnerWork.projects.map((project) => (
                <li key={project.id} className="px-4 py-3">
                  <p className="font-medium text-ink">{project.name}</p>
                  <p className="text-xs text-ink-muted">
                    {project.status.replaceAll('_', ' ')} · {project.progress}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Partner leads</h2>
            <Link to="/leads" className="text-xs font-medium text-blue hover:underline">
              Open
            </Link>
          </div>
          {!partnerWork.leads.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">No leads assigned to your partner yet.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {partnerWork.leads.map((lead) => (
                <li key={lead.id} className="px-4 py-3">
                  <p className="font-medium text-ink">
                    {lead.service_interested || lead.source || `Lead (${lead.status})`}
                  </p>
                  <p className="text-xs text-ink-muted">{lead.status}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Partner activity</h2>
            <Link to="/activities" className="text-xs font-medium text-blue hover:underline">
              Open
            </Link>
          </div>
          {!partnerWork.activities.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">
              No recent activity logged by your partner.
            </p>
          ) : (
            <ul className="divide-y divide-line/70">
              {partnerWork.activities.map((activity) => (
                <li key={activity.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{activity.summary}</p>
                      <p className="text-xs text-ink-muted">
                        {formatOccurredAt(activity.occurred_at)} ·{' '}
                        {memberLabel(members, activity.created_by)}
                      </p>
                    </div>
                    <Badge tone="brand">{typeLabel(activity.type)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-4 px-4 py-4 text-sm text-ink-muted">
        Soft ownership reminder: {isDeliveryPrimary(user ? members.find((m) => m.id === user.id)?.role : null)
          ? 'Your primary lane is delivery/projects.'
          : isGrowthPrimary(user ? members.find((m) => m.id === user.id)?.role : null)
            ? 'Your primary lane is growth/leads.'
            : 'Set your founder role to see your primary lane.'}{' '}
        You can still update your partner’s records anytime so you both stay in sync.
      </Panel>

      <Modal
        open={Boolean(editing)}
        title={editing ? `Edit ${displayName(editing)}` : 'Edit profile'}
        onClose={() => {
          if (!submitting) setEditing(null)
        }}
      >
        {editing ? (
          <ProfileForm
            initial={editing}
            submitting={submitting}
            formError={formError}
            onSubmit={handleSubmit}
            onCancel={() => {
              if (!submitting) setEditing(null)
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}
