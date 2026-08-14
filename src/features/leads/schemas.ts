import { z } from 'zod'
import type { LeadStatus } from '@/types/database'

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'following_up', label: 'Following Up' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

/** Statuses you can set on the lead form (conversion happens via Convert). */
export const LEAD_FORM_STATUSES = LEAD_STATUSES.filter(
  (status) => status.value !== 'converted',
)

export const leadSchema = z.object({
  company_name: z.string().optional(),
  source: z.string().optional(),
  service_interested: z.string().optional(),
  status: z.enum(['new', 'contacted', 'following_up', 'lost']),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
  last_contacted_at: z.string().optional(),
  next_follow_up_at: z.string().optional(),
})

export type LeadFormValues = z.infer<typeof leadSchema>

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

export function statusLabel(status: LeadStatus): string {
  return LEAD_STATUSES.find((item) => item.value === status)?.label ?? status
}
