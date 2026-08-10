import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

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
        {placeholderMetrics.map((metric) => (
          <div key={metric.label} className="border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{metric.value}</p>
          </div>
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
