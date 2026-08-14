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
