import { z } from 'zod'

export const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'note', label: 'Note' },
  { value: 'other', label: 'Other' },
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]['value']

export const activitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other']),
  summary: z.string().trim().min(1, 'Summary is required'),
  details: z.string().optional(),
  occurred_at: z.string().min(1, 'Date/time is required'),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  lead_id: z.string().optional(),
  deal_id: z.string().optional(),
  customer_id: z.string().optional(),
  project_id: z.string().optional(),
  task_id: z.string().optional(),
})

export type ActivityFormValues = z.infer<typeof activitySchema>

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function typeLabel(type: string): string {
  return ACTIVITY_TYPES.find((item) => item.value === type)?.label ?? type
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

export function formatOccurredAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date().toISOString())
}
