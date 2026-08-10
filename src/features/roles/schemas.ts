import { z } from 'zod'

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  role: z.enum(['founder_cto', 'founder_cmo']),
  is_active: z.boolean(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
