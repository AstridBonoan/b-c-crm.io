import { z } from 'zod'

export const noteSchema = z
  .object({
    body: z.string().trim().min(1, 'Note body is required'),
    client_id: z.string().optional(),
    contact_id: z.string().optional(),
    lead_id: z.string().optional(),
    deal_id: z.string().optional(),
    customer_id: z.string().optional(),
    project_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const parents = [
      values.client_id,
      values.contact_id,
      values.lead_id,
      values.deal_id,
      values.customer_id,
      values.project_id,
    ]
    if (!parents.some((value) => value?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Attach this note to at least one record',
        path: ['client_id'],
      })
    }
  })

export type NoteFormValues = z.infer<typeof noteSchema>

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function formatNoteTime(iso: string): string {
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

export function previewBody(body: string, max = 140): string {
  const trimmed = body.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}
