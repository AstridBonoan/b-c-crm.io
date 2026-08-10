import { z } from 'zod'

export const clientSchema = z
  .object({
    client_type: z.enum(['individual', 'organization']),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),
    email: z
      .string()
      .optional()
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: 'Enter a valid email',
      }),
    phone: z.string().optional(),
    address: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.client_type === 'organization') {
      if (!values.name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization name is required',
          path: ['name'],
        })
      }
      return
    }

    if (!values.first_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First name is required',
        path: ['first_name'],
      })
    }
    if (!values.last_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Last name is required',
        path: ['last_name'],
      })
    }
  })

export type ClientFormValues = z.infer<typeof clientSchema>

export function buildClientDisplayName(values: ClientFormValues): string {
  if (values.client_type === 'individual') {
    return `${values.first_name?.trim() ?? ''} ${values.last_name?.trim() ?? ''}`.trim()
  }
  return values.name?.trim() ?? ''
}

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
