import { z } from 'zod'

const relationFields = {
  name: z.string().trim().min(1, 'Name is required'),
  client_id: z.string().optional(),
  contact_id: z.string().optional(),
  lead_id: z.string().optional(),
  deal_id: z.string().optional(),
  customer_id: z.string().optional(),
  project_id: z.string().optional(),
}

export const documentMetaSchema = z.object(relationFields)

export type DocumentMetaValues = z.infer<typeof documentMetaSchema>

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

export const uploadDocumentSchema = z.object({
  ...relationFields,
  fileName: z.string().min(1, 'Choose at least one file to upload'),
  fileSize: z
    .number()
    .positive('Choose at least one file to upload')
    .max(MAX_DOCUMENT_BYTES, 'Each file must be 20 MB or smaller'),
  fileCount: z.number().int().min(1, 'Choose at least one file to upload'),
})

export type UploadDocumentFormValues = z.infer<typeof uploadDocumentSchema>

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function formatBytes(size: number | null | undefined): string {
  if (size == null || Number.isNaN(size)) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDocumentTime(iso: string): string {
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

export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
}

export function buildStoragePath(userId: string | undefined, fileName: string): string {
  const safeName = sanitizeFileName(fileName) || 'file'
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const owner = userId ?? 'shared'
  return `${owner}/${stamp}-${safeName}`
}
