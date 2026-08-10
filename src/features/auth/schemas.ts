import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid work email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().optional(),
  role: z.enum(['founder_cto', 'founder_cmo']).optional(),
})

export const signupSchema = z.object({
  email: z.string().email('Enter a valid work email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().trim().min(1, 'Enter your name'),
  role: z.enum(['founder_cto', 'founder_cmo'], {
    errorMap: () => ({ message: 'Select your position' }),
  }),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignupFormValues = z.infer<typeof signupSchema>
