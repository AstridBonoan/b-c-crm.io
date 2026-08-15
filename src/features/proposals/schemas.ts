import { z } from 'zod'
import type { ProposalStatus } from '@/types/database'

export const PROPOSAL_STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
]

export const proposalSchema = z.object({
  deal_id: z.string().min(1, 'Deal is required'),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  service: z.string().optional(),
  amount: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  sent_at: z.string().optional(),
  notes: z.string().optional(),
  move_deal_to_proposal_sent: z.boolean().optional(),
})

export type ProposalFormValues = z.infer<typeof proposalSchema>

export function proposalStatusLabel(status: ProposalStatus): string {
  return PROPOSAL_STATUSES.find((item) => item.value === status)?.label ?? status
}

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
