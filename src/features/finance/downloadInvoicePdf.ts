import { jsPDF } from 'jspdf'
import logoLight from '@/assets/brand/logo-light.png'
import { formatMoney, methodLabel, statusLabel } from '@/features/finance/schemas'
import type { InvoiceWithRelations } from '@/features/finance/api'
import type { FinancePaymentMethod } from '@/types/database'

const MARGIN = 16
const PAGE_W = 210
const PAGE_H = 297
const INK = '#0d1526'
const MUTED = '#6b7280'
const LINE = '#d1d5db'
const BLUE = '#2b76b9'
const CONTENT_W = PAGE_W - MARGIN * 2

async function toDataUrl(src: string): Promise<string> {
  const response = await fetch(src)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function fileName(invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, '-')
  return `${safe || 'invoice'}.pdf`
}

export async function downloadInvoicePdf(
  invoice: InvoiceWithRelations,
  methods: FinancePaymentMethod[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const ensure = (needed: number) => {
    if (y + needed <= PAGE_H - MARGIN) return
    doc.addPage()
    y = MARGIN
  }

  const write = (text: string, x: number, size: number, color: string, options?: { align?: 'left' | 'right'; maxWidth?: number; font?: 'normal' | 'bold' }) => {
    doc.setFont('helvetica', options?.font ?? 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(text, options?.maxWidth ?? CONTENT_W) as string[]
    const align = options?.align ?? 'left'
    for (const line of lines) {
      ensure(6)
      doc.text(line, x, y, { align })
      y += 5
    }
  }

  try {
    const logo = await toDataUrl(logoLight)
    doc.addImage(logo, 'PNG', MARGIN, y, 28, 14)
  } catch {
    // Logo is optional; invoice content still downloads.
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(INK)
  doc.text('INVOICE', PAGE_W - MARGIN, y + 6, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.invoice_number, PAGE_W - MARGIN, y + 12, { align: 'right' })
  doc.setTextColor(MUTED)
  doc.setFontSize(9)
  doc.text(`Status: ${statusLabel(invoice.status)}`, PAGE_W - MARGIN, y + 17, { align: 'right' })

  y += 20
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  doc.text('B&C SOFTWARE & WEB', MARGIN, y)
  y += 6
  doc.setDrawColor(LINE)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 10

  const contactName = invoice.contacts
    ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}`
    : null
  const leftX = MARGIN
  const rightX = PAGE_W - MARGIN
  const startY = y

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  doc.text('BILL TO', leftX, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(INK)
  doc.text(invoice.clients?.name ?? 'Client', leftX, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const billLines = [contactName, invoice.clients?.email, invoice.clients?.phone, invoice.clients?.address].filter(
    (line): line is string => Boolean(line),
  )
  for (const line of billLines) {
    const wrapped = doc.splitTextToSize(line, CONTENT_W / 2 - 4) as string[]
    for (const part of wrapped) {
      doc.text(part, leftX, y)
      y += 5
    }
  }
  const leftBottom = y

  y = startY
  const meta = [
    `Invoice date: ${invoice.invoice_date}`,
    `Due date: ${invoice.due_date || '—'}`,
    invoice.projects?.name ? `Project: ${invoice.projects.name}` : null,
  ].filter((line): line is string => Boolean(line))
  for (const line of meta) {
    doc.text(line, rightX, y, { align: 'right' })
    y += 5
  }
  y = Math.max(leftBottom, y) + 8

  const cols = { desc: MARGIN, qty: 122, unit: 148, total: PAGE_W - MARGIN }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  doc.text('DESCRIPTION', cols.desc, y)
  doc.text('QTY', cols.qty, y)
  doc.text('UNIT', cols.unit, y)
  doc.text('TOTAL', cols.total, y, { align: 'right' })
  y += 3
  doc.setDrawColor(LINE)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(INK)
  for (const item of invoice.items) {
    const descLines = doc.splitTextToSize(item.description, 100) as string[]
    ensure(descLines.length * 5 + 3)
    let rowY = y
    for (const part of descLines) {
      doc.text(part, cols.desc, rowY)
      rowY += 5
    }
    doc.text(String(item.quantity), cols.qty, y)
    doc.text(formatMoney(item.unit_price), cols.unit, y)
    doc.text(formatMoney(item.line_total), cols.total, y, { align: 'right' })
    y = Math.max(rowY, y + 5)
    doc.setDrawColor(LINE)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 6
  }

  const totals = [
    ['Subtotal', formatMoney(invoice.subtotal)],
    ['Discount', formatMoney(invoice.discount_amount)],
    ['Tax', formatMoney(invoice.tax_amount)],
    ['Total', formatMoney(invoice.total)],
    ['Amount paid', formatMoney(invoice.amount_paid)],
    ['Balance due', formatMoney(invoice.balance_due)],
  ]
  ensure(totals.length * 6 + 4)
  for (const [label, value] of totals) {
    const bold = label === 'Total' || label === 'Balance due'
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 11 : 10)
    doc.text(label, 120, y)
    doc.text(value, PAGE_W - MARGIN, y, { align: 'right' })
    y += 6
  }

  const enabled = methods.filter((method) => method.enabled)
  if (enabled.length > 0) {
    y += 6
    ensure(16)
    write('PAYMENT OPTIONS', MARGIN, 8, MUTED, { font: 'bold' })
    write(
      'These are instructions only. Payment is recorded in the CRM after B&C confirms it.',
      MARGIN,
      8,
      MUTED,
    )
    y += 2
    for (const method of enabled) {
      const bits = [
        method.display_name,
        method.username,
        method.email_or_phone,
        method.payment_url,
        method.instructions,
      ].filter((line): line is string => Boolean(line))
      ensure(bits.length * 5 + 6)
      doc.setDrawColor(LINE)
      doc.rect(MARGIN, y - 4, CONTENT_W, bits.length * 5 + 4)
      for (const bit of bits) {
        const isUrl = bit === method.payment_url
        doc.setFont('helvetica', bit === method.display_name ? 'bold' : 'normal')
        doc.setFontSize(10)
        doc.setTextColor(isUrl ? BLUE : INK)
        const wrapped = doc.splitTextToSize(bit, CONTENT_W - 8) as string[]
        for (const part of wrapped) {
          ensure(6)
          doc.text(part, MARGIN + 3, y)
          y += 5
        }
      }
      y += 6
    }
  }

  const completed = invoice.payments.filter((row) => row.status === 'completed')
  if (completed.length > 0) {
    y += 4
    write('PAYMENT HISTORY', MARGIN, 8, MUTED, { font: 'bold' })
    for (const payment of completed) {
      const line = `${payment.paid_at} · ${methodLabel(payment.method)} · ${formatMoney(payment.amount)}${payment.reference ? ` · ${payment.reference}` : ''}`
      write(line, MARGIN, 10, INK)
    }
  }

  if (invoice.notes) {
    y += 4
    write('NOTES', MARGIN, 8, MUTED, { font: 'bold' })
    write(invoice.notes, MARGIN, 10, INK)
  }

  doc.save(fileName(invoice.invoice_number))
}
