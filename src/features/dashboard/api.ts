import { getSupabaseClient } from '@/lib/supabase'
import type { Activity, DealStage, LeadStatus, ProjectStatus, Task } from '@/types/database'

export type DashboardMetrics = {
  newLeads: number
  activeOpportunities: number
  openDeals: number
  activeCustomers: number
  activeProjects: number
  completedProjects: number
  potentialRevenue: number
  projectRevenue: number
}

export type DashboardActivity = Pick<
  Activity,
  'id' | 'type' | 'summary' | 'occurred_at' | 'client_id'
> & {
  clients: { name: string } | null
}

export type DashboardTask = Pick<
  Task,
  'id' | 'title' | 'status' | 'priority' | 'due_date'
>

export type DashboardData = {
  metrics: DashboardMetrics
  recentActivities: DashboardActivity[]
  upcomingTasks: DashboardTask[]
}

const OPEN_DEAL_STAGES: DealStage[] = [
  'new_lead',
  'contacted',
  'meeting',
  'proposal_sent',
  'negotiating',
]

const ACTIVE_LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified']

const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  'not_started',
  'planning',
  'in_development',
  'review',
]

function money(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function formatDashboardMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export async function loadDashboard(): Promise<DashboardData> {
  const supabase = getSupabaseClient()

  const [
    leadsResult,
    dealsResult,
    customersResult,
    projectsResult,
    activitiesResult,
    tasksResult,
  ] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.from('deals').select('stage, estimated_value, proposal_amount'),
    supabase.from('customers').select('status'),
    supabase.from('projects').select('status, project_value'),
    supabase
      .from('activities')
      .select('id, type, summary, occurred_at, client_id, clients(name)')
      .order('occurred_at', { ascending: false })
      .limit(6),
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .not('status', 'in', '(done,cancelled)')
      .order('due_date', { ascending: true })
      .limit(6),
  ])

  if (leadsResult.error) throw new Error(leadsResult.error.message)
  if (dealsResult.error) throw new Error(dealsResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)
  if (projectsResult.error) throw new Error(projectsResult.error.message)
  if (activitiesResult.error) throw new Error(activitiesResult.error.message)
  if (tasksResult.error) throw new Error(tasksResult.error.message)

  const leads = (leadsResult.data as { status: LeadStatus }[] | null) ?? []
  const deals =
    (dealsResult.data as
      | {
          stage: DealStage
          estimated_value: number | null
          proposal_amount: number | null
        }[]
      | null) ?? []
  const customers = (customersResult.data as { status: string }[] | null) ?? []
  const projects =
    (projectsResult.data as { status: ProjectStatus; project_value: number | null }[] | null) ??
    []

  const openDeals = deals.filter((deal) => OPEN_DEAL_STAGES.includes(deal.stage))
  const activeProjects = projects.filter((project) =>
    ACTIVE_PROJECT_STATUSES.includes(project.status),
  )
  const completedProjects = projects.filter((project) => project.status === 'completed')

  const metrics: DashboardMetrics = {
    newLeads: leads.filter((lead) => lead.status === 'new').length,
    activeOpportunities: leads.filter((lead) => ACTIVE_LEAD_STATUSES.includes(lead.status))
      .length,
    openDeals: openDeals.length,
    activeCustomers: customers.filter((customer) => customer.status === 'active').length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    potentialRevenue: openDeals.reduce(
      (sum, deal) => sum + money(deal.proposal_amount ?? deal.estimated_value),
      0,
    ),
    projectRevenue: activeProjects.reduce((sum, project) => sum + money(project.project_value), 0),
  }

  const recentActivities =
    (activitiesResult.data as DashboardActivity[] | null)?.map((row) => ({
      ...row,
      clients: Array.isArray(row.clients) ? (row.clients[0] ?? null) : row.clients,
    })) ?? []

  const upcomingTasks = (tasksResult.data as DashboardTask[] | null) ?? []

  return { metrics, recentActivities, upcomingTasks }
}
