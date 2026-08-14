import { getSupabaseClient } from '@/lib/supabase'
import { PIPELINE_STAGES } from '@/features/pipeline/schemas'
import { LEAD_STATUSES } from '@/features/leads/schemas'
import { PROJECT_STATUSES } from '@/features/projects/schemas'
import { ACTIVITY_TYPES } from '@/features/activities/schemas'
import type { DealStage, LeadStatus, ProjectStatus } from '@/types/database'

export type NamedCount = {
  key: string
  label: string
  count: number
}

export type NamedValue = {
  key: string
  label: string
  value: number
}

export type MonthPoint = {
  month: string
  label: string
  leads: number
  deals: number
  wonValue: number
}

export type AnalyticsSummary = {
  winRate: number
  openPipelineValue: number
  wonRevenue: number
  activeProjects: number
}

export type AnalyticsData = {
  summary: AnalyticsSummary
  dealsByStage: NamedCount[]
  pipelineValueByStage: NamedValue[]
  leadsByStatus: NamedCount[]
  projectsByStatus: NamedCount[]
  activitiesByType: NamedCount[]
  monthlyTrend: MonthPoint[]
}

function money(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function monthKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleString(undefined, { month: 'short', year: '2-digit' })
}

function lastSixMonthKeys(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    keys.push(`${y}-${m}`)
  }
  return keys
}

export function formatAnalyticsMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export async function loadAnalytics(): Promise<AnalyticsData> {
  const supabase = getSupabaseClient()

  const [leadsResult, dealsResult, projectsResult, activitiesResult] = await Promise.all([
    supabase.from('leads').select('status, created_at'),
    supabase
      .from('deals')
      .select('stage, estimated_value, proposal_amount, created_at'),
    supabase.from('projects').select('status'),
    supabase.from('activities').select('type'),
  ])

  if (leadsResult.error) throw new Error(leadsResult.error.message)
  if (dealsResult.error) throw new Error(dealsResult.error.message)
  if (projectsResult.error) throw new Error(projectsResult.error.message)
  if (activitiesResult.error) throw new Error(activitiesResult.error.message)

  const leads =
    (leadsResult.data as { status: LeadStatus; created_at: string }[] | null) ?? []
  const deals =
    (dealsResult.data as
      | {
          stage: DealStage
          estimated_value: number | null
          proposal_amount: number | null
          created_at: string
        }[]
      | null) ?? []
  const projects = (projectsResult.data as { status: ProjectStatus }[] | null) ?? []
  const activities = (activitiesResult.data as { type: string }[] | null) ?? []

  const leadStatusCounts = new Map<string, number>()
  for (const lead of leads) {
    leadStatusCounts.set(lead.status, (leadStatusCounts.get(lead.status) ?? 0) + 1)
  }

  const dealStageCounts = new Map<string, number>()
  const dealStageValues = new Map<string, number>()
  for (const deal of deals) {
    dealStageCounts.set(deal.stage, (dealStageCounts.get(deal.stage) ?? 0) + 1)
    const amount = money(deal.proposal_amount ?? deal.estimated_value)
    dealStageValues.set(deal.stage, (dealStageValues.get(deal.stage) ?? 0) + amount)
  }

  const projectStatusCounts = new Map<string, number>()
  for (const project of projects) {
    projectStatusCounts.set(
      project.status,
      (projectStatusCounts.get(project.status) ?? 0) + 1,
    )
  }

  const activityTypeCounts = new Map<string, number>()
  for (const activity of activities) {
    activityTypeCounts.set(
      activity.type,
      (activityTypeCounts.get(activity.type) ?? 0) + 1,
    )
  }

  const months = lastSixMonthKeys()
  const leadsByMonth = new Map<string, number>()
  const dealsByMonth = new Map<string, number>()
  const wonByMonth = new Map<string, number>()
  for (const key of months) {
    leadsByMonth.set(key, 0)
    dealsByMonth.set(key, 0)
    wonByMonth.set(key, 0)
  }

  for (const lead of leads) {
    const key = monthKey(lead.created_at)
    if (leadsByMonth.has(key)) {
      leadsByMonth.set(key, (leadsByMonth.get(key) ?? 0) + 1)
    }
  }

  for (const deal of deals) {
    const key = monthKey(deal.created_at)
    if (dealsByMonth.has(key)) {
      dealsByMonth.set(key, (dealsByMonth.get(key) ?? 0) + 1)
    }
    if (deal.stage === 'won' && wonByMonth.has(key)) {
      wonByMonth.set(
        key,
        (wonByMonth.get(key) ?? 0) + money(deal.proposal_amount ?? deal.estimated_value),
      )
    }
  }

  const closed = deals.filter((deal) => deal.stage === 'won' || deal.stage === 'lost')
  const won = deals.filter((deal) => deal.stage === 'won')
  const open = deals.filter(
    (deal) => deal.stage !== 'won' && deal.stage !== 'lost',
  )

  return {
    summary: {
      winRate: closed.length === 0 ? 0 : Math.round((won.length / closed.length) * 100),
      openPipelineValue: open.reduce(
        (sum, deal) => sum + money(deal.proposal_amount ?? deal.estimated_value),
        0,
      ),
      wonRevenue: won.reduce(
        (sum, deal) => sum + money(deal.proposal_amount ?? deal.estimated_value),
        0,
      ),
      activeProjects: projects.filter((project) => project.status !== 'completed').length,
    },
    dealsByStage: PIPELINE_STAGES.map((stage) => ({
      key: stage.value,
      label: stage.label,
      count: dealStageCounts.get(stage.value) ?? 0,
    })),
    pipelineValueByStage: PIPELINE_STAGES.filter(
      (stage) => stage.value !== 'won' && stage.value !== 'lost',
    ).map((stage) => ({
      key: stage.value,
      label: stage.label,
      value: dealStageValues.get(stage.value) ?? 0,
    })),
    leadsByStatus: LEAD_STATUSES.map((status) => ({
      key: status.value,
      label: status.label,
      count: leadStatusCounts.get(status.value) ?? 0,
    })),
    projectsByStatus: PROJECT_STATUSES.map((status) => ({
      key: status.value,
      label: status.label,
      count: projectStatusCounts.get(status.value) ?? 0,
    })),
    activitiesByType: ACTIVITY_TYPES.map((type) => ({
      key: type.value,
      label: type.label,
      count: activityTypeCounts.get(type.value) ?? 0,
    })).filter((item) => item.count > 0),
    monthlyTrend: months.map((key) => ({
      month: key,
      label: monthLabel(key),
      leads: leadsByMonth.get(key) ?? 0,
      deals: dealsByMonth.get(key) ?? 0,
      wonValue: wonByMonth.get(key) ?? 0,
    })),
  }
}
