import type { CSSProperties } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'

const placeholderMetrics = [
  { label: 'New leads', value: '—' },
  { label: 'Active opportunities', value: '—' },
  { label: 'Open deals', value: '—' },
  { label: 'Active customers', value: '—' },
  { label: 'Active projects', value: '—' },
  { label: 'Completed projects', value: '—' },
  { label: 'Potential revenue', value: '—' },
  { label: 'Current project revenue', value: '—' },
] as const

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of leads, opportunities, customers, and projects. Metrics will populate as CRM modules are connected."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {placeholderMetrics.map((metric, index) => (
          <Panel
            key={metric.label}
            className="px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 animate-fade-up"
            style={{ animationDelay: `${index * 40}ms` } as CSSProperties}
          >
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
              {metric.label}
            </p>
            <p className="font-display mt-2 text-3xl font-semibold tracking-tight text-ink">
              {metric.value}
            </p>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EmptyState
          title="Recent activity"
          description="Activity history will appear here once the activities module is implemented."
        />
        <EmptyState
          title="Upcoming tasks"
          description="Assigned follow-ups and project tasks will appear here once the tasks module is implemented."
        />
      </div>
    </div>
  )
}
