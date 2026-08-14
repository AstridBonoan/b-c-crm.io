import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { getSupabaseClient } from '@/lib/supabase'
import { formatMoney, isFollowUpOverdue, isOpenStage, weightedValue } from '@/features/pipeline/schemas'
import type { Deal, Lead } from '@/types/database'

type DashboardStats = {
  newLeads: number
  openDeals: number
  openPipeline: number
  expectedRevenue: number
  overdueFollowUps: number
  wonValue: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const supabase = getSupabaseClient()

    void Promise.all([
      supabase.from('leads').select('id, status'),
      supabase.from('deals').select('*'),
    ]).then(([leadsResult, dealsResult]) => {
      if (!active) return
      if (leadsResult.error) throw new Error(leadsResult.error.message)
      if (dealsResult.error) throw new Error(dealsResult.error.message)

      const leads = (leadsResult.data ?? []) as Pick<Lead, 'id' | 'status'>[]
      const deals = (dealsResult.data ?? []) as Deal[]
      const openDeals = deals.filter((deal) => isOpenStage(deal.stage))

      setStats({
        newLeads: leads.filter((lead) => lead.status === 'new').length,
        openDeals: openDeals.length,
        openPipeline: openDeals.reduce((sum, deal) => sum + Number(deal.estimated_value ?? 0), 0),
        expectedRevenue: openDeals.reduce((sum, deal) => sum + weightedValue(deal), 0),
        overdueFollowUps: deals.filter((deal) => isFollowUpOverdue(deal)).length,
        wonValue: deals
          .filter((deal) => deal.stage === 'won')
          .reduce((sum, deal) => sum + Number(deal.proposal_amount ?? deal.estimated_value ?? 0), 0),
      })
      setError(null)
    }).catch((err: unknown) => {
      if (!active) return
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    })

    return () => {
      active = false
    }
  }, [])

  const metrics = [
    { label: 'New leads', value: stats ? String(stats.newLeads) : '—' },
    { label: 'Open deals', value: stats ? String(stats.openDeals) : '—' },
    { label: 'Open pipeline', value: stats ? formatMoney(stats.openPipeline) : '—' },
    { label: 'Weighted expected', value: stats ? formatMoney(stats.expectedRevenue) : '—' },
    { label: 'Won value', value: stats ? formatMoney(stats.wonValue) : '—' },
    { label: 'Overdue follow-ups', value: stats ? String(stats.overdueFollowUps) : '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of inbound leads and the sales pipeline."
      />

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <Panel
            key={metric.label}
            className="px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 animate-fade-up"
            style={{ animationDelay: `${index * 40}ms` } as CSSProperties}
          >
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
              {metric.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{metric.value}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EmptyState
          title="Work the pipeline"
          description="Drag deals across stages, set follow-ups, and send leads into opportunities."
          action={
            <Link to="/pipeline" className="text-sm font-medium text-teal hover:underline">
              Open pipeline
            </Link>
          }
        />
        <EmptyState
          title="Capture inbound leads"
          description="Log interest first, then convert a lead into a pipeline deal when it is worth pursuing."
          action={
            <Link to="/leads" className="text-sm font-medium text-teal hover:underline">
              Open leads
            </Link>
          }
        />
      </div>
    </div>
  )
}
