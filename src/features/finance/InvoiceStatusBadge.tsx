import { Badge } from '@/components/ui/Badge'
import { statusLabel } from '@/features/finance/schemas'
import type { InvoiceStatus } from '@/types/database'

function invoiceStatusTone(status: InvoiceStatus): 'neutral' | 'brand' | 'success' | 'danger' {
  if (status === 'paid') return 'success'
  if (status === 'overdue' || status === 'cancelled') return 'danger'
  if (status === 'partially_paid' || status === 'unpaid') return 'brand'
  return 'neutral'
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={invoiceStatusTone(status)}>{statusLabel(status)}</Badge>
}
