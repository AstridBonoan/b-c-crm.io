import { z } from 'zod'
import type { ProjectStatus } from '@/types/database'

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_development', label: 'In Development' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
]

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  client_id: z.string().uuid('Select a client'),
  deal_id: z.string().optional(),
  project_type: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  completion_date: z.string().optional(),
  project_value: z.string().optional(),
  status: z.enum(['not_started', 'planning', 'in_development', 'review', 'completed']),
  progress: z.string().optional(),
  notes: z.string().optional(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>

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

export function parseProgress(value: string | undefined): number {
  const trimmed = value?.trim()
  if (!trimmed) return 0
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, Math.round(parsed)))
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

export function statusLabel(status: ProjectStatus): string {
  return PROJECT_STATUSES.find((item) => item.value === status)?.label ?? status
}
