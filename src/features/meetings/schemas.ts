import { z } from 'zod'
import type { MeetingOutcome, MeetingType } from '@/types/database'

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'discovery', label: 'Discovery Call' },
  { value: 'sales_meeting', label: 'Sales Meeting' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
]

export const MEETING_OUTCOMES: { value: MeetingOutcome; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'needs_follow_up', label: 'Needs Follow-Up' },
  { value: 'proposal_requested', label: 'Proposal Requested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'other', label: 'Other' },
]

export const meetingSchema = z.object({
  deal_id: z.string().min(1, 'Deal is required'),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  meeting_at: z.string().min(1, 'Date and time are required'),
  meeting_type: z.enum([
    'discovery',
    'sales_meeting',
    'consultation',
    'follow_up',
    'presentation',
    'other',
  ]),
  location_or_link: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  next_action: z.string().optional(),
})

export type MeetingFormValues = z.infer<typeof meetingSchema>

export function meetingTypeLabel(value: MeetingType): string {
  return MEETING_TYPES.find((item) => item.value === value)?.label ?? value
}

export function meetingOutcomeLabel(value: MeetingOutcome | null): string {
  if (!value) return 'No outcome yet'
  return MEETING_OUTCOMES.find((item) => item.value === value)?.label ?? value
}

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function parseOutcome(value: string | undefined): MeetingOutcome | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed as MeetingOutcome
}

export function formatMeetingAt(iso: string): string {
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

export function nowDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date().toISOString())
}
