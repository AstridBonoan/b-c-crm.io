import { z } from 'zod'
import type { Deal, DealStage } from '@/types/database'

export const PIPELINE_STAGES: { value: DealStage; label: string }[] = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  new_lead: 10,
  contacted: 20,
  interested: 35,
  meeting: 50,
  proposal_sent: 65,
  negotiating: 80,
  won: 100,
  lost: 0,
}

export const dealSchema = z.object({
  name: z.string().trim().min(1, 'Deal name is required'),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  lead_id: z.string().optional(),
  service: z.string().optional(),
  source: z.string().optional(),
  estimated_value: z.string().optional(),
  proposal_amount: z.string().optional(),
  stage: z.enum([
    'new_lead',
    'contacted',
    'interested',
    'meeting',
    'proposal_sent',
    'negotiating',
    'won',
    'lost',
  ]),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  next_action: z.string().optional(),
  next_follow_up_at: z.string().optional(),
  notes: z.string().optional(),
})

export type DealFormValues = z.infer<typeof dealSchema>

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function parseMoney(value: string | undefined): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseProbability(value: string | undefined, stage: DealStage): number {
  const trimmed = value?.trim()
  if (!trimmed) return STAGE_PROBABILITY[stage]
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return STAGE_PROBABILITY[stage]
  return Math.min(100, Math.max(0, Math.round(parsed)))
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function stageLabel(stage: DealStage): string {
  return PIPELINE_STAGES.find((item) => item.value === stage)?.label ?? stage
}

export function dealAmount(deal: Pick<Deal, 'estimated_value' | 'proposal_amount'>): number {
  return Number(deal.proposal_amount ?? deal.estimated_value ?? 0)
}

export function weightedValue(
  deal: Pick<Deal, 'estimated_value' | 'proposal_amount' | 'probability' | 'stage'>,
): number {
  const probability = deal.probability ?? STAGE_PROBABILITY[deal.stage]
  return (dealAmount(deal) * probability) / 100
}

export function isOpenStage(stage: DealStage): boolean {
  return stage !== 'won' && stage !== 'lost'
}

export function isFollowUpOverdue(
  deal: Pick<Deal, 'next_follow_up_at' | 'stage'>,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  if (!deal.next_follow_up_at || !isOpenStage(deal.stage)) return false
  return deal.next_follow_up_at.slice(0, 10) < today
}
