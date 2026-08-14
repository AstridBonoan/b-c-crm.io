import { z } from 'zod'
import type { TaskPriority, TaskStatus } from '@/types/database'

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  project_id: z.string().optional(),
})

export type TaskFormValues = z.infer<typeof taskSchema>

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((item) => item.value === status)?.label ?? status
}

export function priorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITIES.find((item) => item.value === priority)?.label ?? priority
}
