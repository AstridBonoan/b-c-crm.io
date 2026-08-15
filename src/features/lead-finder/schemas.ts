import { z } from 'zod'

export const prospectSearchSchema = z.object({
  industry: z.string().trim().min(1, 'Industry is required'),
  city: z.string().trim().min(1, 'City/Borough is required'),
  state: z.string().trim().min(2, 'State is required').max(2, 'Use 2-letter state'),
  zip: z.string().optional(),
  radius_miles: z.coerce.number().min(1, 'Min 1 mile').max(50, 'Max 50 miles'),
  requires_website: z.enum(['any', 'yes', 'no']),
  business_size: z.string().optional(),
})

export type ProspectSearchFormValues = z.infer<typeof prospectSearchSchema>

export const prospectNoteSchema = z.object({
  body: z.string().trim().min(1, 'Note is required'),
  next_follow_up_at: z.string().optional(),
})

export type ProspectNoteFormValues = z.infer<typeof prospectNoteSchema>

export const OUTREACH_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'in_person', label: 'In Person' },
  { value: 'other', label: 'Other' },
] as const

export const OUTREACH_RESULTS = [
  { value: 'no_response', label: 'No Response' },
  { value: 'responded', label: 'Responded' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_requested', label: 'Proposal Requested' },
  { value: 'follow_up_needed', label: 'Follow-Up Needed' },
  { value: 'other', label: 'Other' },
] as const

export const outreachSchema = z.object({
  method: z.enum(['email', 'phone', 'linkedin', 'instagram', 'in_person', 'other']),
  contacted_at: z.string().trim().min(1, 'Date contacted is required'),
  result: z.enum([
    'no_response',
    'responded',
    'interested',
    'not_interested',
    'meeting_scheduled',
    'proposal_requested',
    'follow_up_needed',
    'other',
  ]),
  next_follow_up_at: z.string().optional(),
  notes: z.string().optional(),
})

export type OutreachFormValues = z.infer<typeof outreachSchema>

export function outreachMethodLabel(value: string): string {
  return OUTREACH_METHODS.find((item) => item.value === value)?.label ?? value
}

export function outreachResultLabel(value: string): string {
  return OUTREACH_RESULTS.find((item) => item.value === value)?.label ?? value
}

export function formatOutreachDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
