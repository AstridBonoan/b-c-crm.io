import { z } from 'zod'

export const contactSchema = z.object({
  client_id: z.string().uuid('Select a client'),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  job_title: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email',
    }),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export type ContactFormValues = z.infer<typeof contactSchema>

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
