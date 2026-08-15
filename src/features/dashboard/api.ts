import { getSupabaseClient } from '@/lib/supabase'
import type { Activity, DealStage, LeadStatus, ProjectStatus, Task } from '@/types/database'
import { isFollowUpOverdue, isOpenStage, weightedValue } from '@/features/pipeline/schemas'

export type DashboardMetrics = {
  newLeads: number
  activeOpportunities: number
  openDeals: number
  activeClients: number
  activeProjects: number
  completedProjects: number
  potentialRevenue: number
  expectedRevenue: number
  wonValue: number
  overdueFollowUps: number
  projectRevenue: number
  upcomingMeetings: number
  openProposals: number
  wonThisMonth: number
  lostThisMonth: number
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


const ACTIVE_LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'following_up']

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
    clientsResult,
    projectsResult,
    activitiesResult,
    tasksResult,
    meetingsResult,
    proposalsResult,
  ] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase
      .from('deals')
      .select('stage, estimated_value, proposal_amount, probability, next_follow_up_at, closed_at'),
    supabase.from('clients').select('client_status'),
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
    supabase.from('deal_meetings').select('meeting_at, outcome'),
    supabase.from('deal_proposals').select('status'),
  ])

  if (leadsResult.error) throw new Error(leadsResult.error.message)
  if (dealsResult.error) throw new Error(dealsResult.error.message)
  if (clientsResult.error) throw new Error(clientsResult.error.message)
  if (projectsResult.error) throw new Error(projectsResult.error.message)
  if (activitiesResult.error) throw new Error(activitiesResult.error.message)
  if (tasksResult.error) throw new Error(tasksResult.error.message)
  if (meetingsResult.error) throw new Error(meetingsResult.error.message)
  if (proposalsResult.error) throw new Error(proposalsResult.error.message)

  const leads = (leadsResult.data as { status: LeadStatus }[] | null) ?? []
  const deals =
    (dealsResult.data as
      | {
          stage: DealStage
          estimated_value: number | null
          proposal_amount: number | null
          probability: number | null
          next_follow_up_at: string | null
          closed_at: string | null
        }[]
      | null) ?? []
  const clients = (clientsResult.data as { client_status: string }[] | null) ?? []
  const projects =
    (projectsResult.data as { status: ProjectStatus; project_value: number | null }[] | null) ??
    []

  const openDeals = deals.filter((deal) => isOpenStage(deal.stage))
  const activeProjects = projects.filter((project) =>
    ACTIVE_PROJECT_STATUSES.includes(project.status),
  )
  const completedProjects = projects.filter((project) => project.status === 'completed')
  const monthPrefix = new Date().toISOString().slice(0, 7)
  const inThisMonth = (value: string | null) => Boolean(value && value.startsWith(monthPrefix))
  const meetings =
    (meetingsResult.data as { meeting_at: string; outcome: string | null }[] | null) ?? []
  const proposals = (proposalsResult.data as { status: string }[] | null) ?? []
  const now = Date.now()

  const metrics: DashboardMetrics = {
    newLeads: leads.filter((lead) => lead.status === 'new').length,
    activeOpportunities: leads.filter((lead) => ACTIVE_LEAD_STATUSES.includes(lead.status))
      .length,
    openDeals: openDeals.length,
    activeClients: clients.filter((client) => client.client_status === 'active').length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    potentialRevenue: openDeals.reduce(
      (sum, deal) => sum + money(deal.proposal_amount ?? deal.estimated_value),
      0,
    ),
    expectedRevenue: openDeals.reduce((sum, deal) => sum + weightedValue(deal), 0),
    wonValue: deals
      .filter((deal) => deal.stage === 'won')
      .reduce((sum, deal) => sum + money(deal.proposal_amount ?? deal.estimated_value), 0),
    overdueFollowUps: deals.filter((deal) => isFollowUpOverdue(deal)).length,
    projectRevenue: activeProjects.reduce((sum, project) => sum + money(project.project_value), 0),
    upcomingMeetings: meetings.filter(
      (row) => !row.outcome && new Date(row.meeting_at).getTime() >= now,
    ).length,
    openProposals: proposals.filter((row) => row.status === 'draft' || row.status === 'sent').length,
    wonThisMonth: deals.filter((deal) => deal.stage === 'won' && inThisMonth(deal.closed_at)).length,
    lostThisMonth: deals.filter((deal) => deal.stage === 'lost' && inThisMonth(deal.closed_at)).length,
  }

  const recentActivities =
    (activitiesResult.data as DashboardActivity[] | null)?.map((row) => ({
      ...row,
      clients: Array.isArray(row.clients) ? (row.clients[0] ?? null) : row.clients,
    })) ?? []

  const upcomingTasks = (tasksResult.data as DashboardTask[] | null) ?? []

  return { metrics, recentActivities, upcomingTasks }
}
