import { z } from 'zod'
import type { DealStage } from '@/types/database'

export const PIPELINE_STAGES: { value: DealStage; label: string }[] = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export const dealSchema = z.object({
  name: z.string().trim().min(1, 'Deal name is required'),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  service: z.string().optional(),
  estimated_value: z.string().optional(),
  proposal_amount: z.string().optional(),
  stage: z.enum([
    'new_lead',
    'contacted',
    'meeting',
    'proposal_sent',
    'negotiating',
    'won',
    'lost',
  ]),
  expected_close_date: z.string().optional(),
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
