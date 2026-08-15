import { z } from 'zod'
import type { InvoiceStatus } from '@/types/database'

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PAYMENT_METHOD_KEYS = [
  'paypal',
  'venmo',
  'cash_app',
  'zelle',
  'bank_transfer',
  'check',
  'cash',
  'other',
] as const

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit_price: z.string().min(1, 'Unit price is required'),
})

export const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  contact_id: z.string().optional(),
  project_id: z.string().optional(),
  deal_id: z.string().optional(),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().optional(),
  discount_amount: z.string().optional(),
  tax_amount: z.string().optional(),
  notes: z.string().optional(),
  issue_now: z.boolean().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
})

export const paymentSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  method: z.string().min(1, 'Payment method is required'),
  paid_at: z.string().min(1, 'Payment date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export const paymentMethodSettingsSchema = z.object({
  display_name: z.string().trim().min(1, 'Name is required'),
  enabled: z.boolean(),
  instructions: z.string().optional(),
  payment_url: z.string().optional(),
  username: z.string().optional(),
  email_or_phone: z.string().optional(),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>
export type PaymentFormValues = z.infer<typeof paymentSchema>
export type PaymentMethodSettingsValues = z.infer<typeof paymentMethodSettingsSchema>

export function toNullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toNullableUuid(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function parseMoney(value: string | undefined): number {
  const trimmed = value?.trim()
  if (!trimmed) return 0
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseQuantity(value: string | undefined): number {
  const parsed = parseMoney(value)
  return parsed > 0 ? parsed : 1
}

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function statusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUSES.find((item) => item.value === status)?.label ?? status
}

export function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    paypal: 'PayPal',
    venmo: 'Venmo',
    cash_app: 'Cash App',
    zelle: 'Zelle',
    bank_transfer: 'Bank Transfer',
    check: 'Check',
    cash: 'Cash',
    other: 'Other',
  }
  return labels[method] ?? method
}

export function deriveInvoiceStatus(input: {
  lifecycle: 'draft' | 'issued' | 'cancelled'
  total: number
  amountPaid: number
  dueDate: string | null
  today?: string
}): InvoiceStatus {
  if (input.lifecycle === 'draft') return 'draft'
  if (input.lifecycle === 'cancelled') return 'cancelled'
  const paid = roundMoney(input.amountPaid)
  const total = roundMoney(input.total)
  if (total <= 0 && paid <= 0) return 'unpaid'
  if (paid >= total && total > 0) return 'paid'
  if (paid > 0 && paid < total) return 'partially_paid'
  const today = input.today ?? new Date().toISOString().slice(0, 10)
  if (input.dueDate && input.dueDate < today) return 'overdue'
  return 'unpaid'
}

export function remainingBalance(total: number, amountPaid: number): number {
  return roundMoney(Math.max(0, roundMoney(total) - roundMoney(amountPaid)))
}
