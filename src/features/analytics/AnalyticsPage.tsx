import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  formatAnalyticsMoney,
  loadAnalytics,
  type AnalyticsData,
} from '@/features/analytics/api'

const COLORS = {
  blue: '#2b76b9',
  teal: '#36837c',
  bright: '#0096ff',
  navy: '#0d1526',
  muted: '#94a3b8',
}

function ChartCard({
  title,
  description,
  children,
  empty,
}: {
  title: string
  description: string
  children: ReactNode
  empty?: boolean
}) {
  return (
    <Panel className="px-4 py-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
      <div className="mt-4 h-64 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            No data yet
          </div>
        ) : (
          children
        )}
      </div>
    </Panel>
  )
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await loadAnalytics())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const hasAny =
    (data?.dealsByStage.some((item) => item.count > 0) ?? false) ||
    (data?.leadsByStatus.some((item) => item.count > 0) ?? false) ||
    (data?.projectsByStatus.some((item) => item.count > 0) ?? false)

  const summaryCards = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Win rate', value: `${data.summary.winRate}%` },
      {
        label: 'Open pipeline',
        value: formatAnalyticsMoney(data.summary.openPipelineValue),
      },
      {
        label: 'Won revenue',
        value: formatAnalyticsMoney(data.summary.wonRevenue),
      },
      {
        label: 'Active projects',
        value: String(data.summary.activeProjects),
      },
    ]
  }, [data])

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Pipeline, leads, projects, and activity trends across the CRM."
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

      {loading && !data ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">
          Loading analytics…
        </Panel>
      ) : !hasAny ? (
        <EmptyState
          title="Not enough data yet"
          description="Add leads, deals, projects, and activities to see charts populate."
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Panel key={card.label} className="px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-ink">{card.value}</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              title="Deals by stage"
              description="Count of opportunities in each pipeline stage."
              empty={!data?.dealsByStage.some((item) => item.count > 0)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.dealsByStage ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Deals" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Open pipeline value"
              description="Estimated/proposal value by open stage."
              empty={!data?.pipelineValueByStage.some((item) => item.value > 0)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.pipelineValueByStage ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`
                    }
                  />
                  <Tooltip formatter={(value) => formatAnalyticsMoney(Number(value ?? 0))} />
                  <Bar dataKey="value" name="Value" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Leads by status"
              description="Lead funnel distribution."
              empty={!data?.leadsByStatus.some((item) => item.count > 0)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.leadsByStatus ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill={COLORS.bright} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Projects by status"
              description="Delivery workload across project stages."
              empty={!data?.projectsByStatus.some((item) => item.count > 0)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.projectsByStatus ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Projects" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="6-month trend"
              description="New leads and deals created each month."
              empty={
                !data?.monthlyTrend.some((item) => item.leads > 0 || item.deals > 0)
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthlyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke={COLORS.bright}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="deals"
                    name="Deals"
                    stroke={COLORS.teal}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Activity mix"
              description="Logged interaction types."
              empty={!data?.activitiesByType.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.activitiesByType ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Activities" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
