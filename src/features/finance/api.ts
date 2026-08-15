import { getSupabaseClient } from '@/lib/supabase'
import type {
  Client,
  Contact,
  Deal,
  FinancePaymentMethod,
  Invoice,
  InvoiceItem,
  Payment,
  Project,
} from '@/types/database'
import {
  deriveInvoiceStatus,
  parseMoney,
  parseQuantity,
  remainingBalance,
  roundMoney,
  toNullable,
  toNullableUuid,
  type InvoiceFormValues,
  type PaymentFormValues,
  type PaymentMethodSettingsValues,
} from '@/features/finance/schemas'

export type InvoiceWithRelations = Invoice & {
  clients: Pick<Client, 'id' | 'name' | 'email' | 'phone' | 'address'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null
  projects: Pick<Project, 'id' | 'name'> | null
  items: InvoiceItem[]
  payments: Payment[]
  amount_paid: number
  balance_due: number
  status: ReturnType<typeof deriveInvoiceStatus>
}

export type PaymentWithRelations = Payment & {
  invoices: Pick<Invoice, 'id' | 'invoice_number'> | null
  clients: Pick<Client, 'id' | 'name'> | null
  projects: Pick<Project, 'id' | 'name'> | null
}

export type InvoiceFilters = {
  search: string
  status: ReturnType<typeof deriveInvoiceStatus> | 'all'
  clientId: string | 'all'
}

export type PaymentFilters = {
  search: string
  method: string | 'all'
}

export type FinanceTotals = {
  invoiced: number
  paid: number
  outstanding: number
  overdue: number
  invoiceCount: number
  paidCount: number
  unpaidCount: number
  partialCount: number
  overdueCount: number
  revenueThisMonth: number
  revenueThisYear: number
}

export type ClientFinanceSummary = {
  billed: number
  paid: number
  outstanding: number
  overdue: number
  invoices: InvoiceWithRelations[]
}

function money(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

async function logFinanceActivity(input: {
  summary: string
  details?: string | null
  clientId?: string | null
  contactId?: string | null
  projectId?: string | null
  dealId?: string | null
  userId?: string
}) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('activities').insert({
    type: 'note',
    summary: input.summary,
    details: input.details ?? null,
    client_id: input.clientId ?? null,
    contact_id: input.contactId ?? null,
    project_id: input.projectId ?? null,
    deal_id: input.dealId ?? null,
    occurred_at: new Date().toISOString(),
    created_by: input.userId ?? null,
  })
  if (error) console.warn('Could not log finance activity:', error.message)
}

function hydrateInvoice(
  invoice: Invoice & {
    clients?: InvoiceWithRelations['clients']
    contacts?: InvoiceWithRelations['contacts']
    projects?: InvoiceWithRelations['projects']
    invoice_items?: InvoiceItem[] | null
    payments?: Payment[] | null
  },
): InvoiceWithRelations {
  const items = invoice.invoice_items ?? []
  const payments = (invoice.payments ?? []).filter((row) => row.status === 'completed')
  const amountPaid = roundMoney(payments.reduce((sum, row) => sum + money(row.amount), 0))
  const total = money(invoice.total)
  return {
    ...invoice,
    clients: invoice.clients ?? null,
    contacts: invoice.contacts ?? null,
    projects: invoice.projects ?? null,
    items,
    payments: invoice.payments ?? [],
    amount_paid: amountPaid,
    balance_due: remainingBalance(total, amountPaid),
    status: deriveInvoiceStatus({
      lifecycle: invoice.lifecycle,
      total,
      amountPaid,
      dueDate: invoice.due_date,
    }),
  }
}

const INVOICE_SELECT =
  '*, clients(id, name, email, phone, address), contacts(id, first_name, last_name, email, phone), projects(id, name), invoice_items(*), payments(*)'

export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  const last = data?.[0]?.invoice_number ?? `${prefix}000`
  const seq = Number(last.slice(prefix.length))
  const next = Number.isFinite(seq) ? seq + 1 : 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

function totalsFromItems(
  items: { quantity: number; unit_price: number }[],
  discount: number,
  tax: number,
) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + roundMoney(item.quantity * item.unit_price), 0))
  const discountAmount = roundMoney(Math.max(0, discount))
  const taxAmount = roundMoney(Math.max(0, tax))
  const total = roundMoney(Math.max(0, subtotal - discountAmount + taxAmount))
  return { subtotal, discountAmount, taxAmount, total }
}

export async function listInvoices(filters: InvoiceFilters): Promise<InvoiceWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('invoices').select(INVOICE_SELECT).order('invoice_date', { ascending: false })
  if (filters.clientId !== 'all') query = query.eq('client_id', filters.clientId)
  const search = filters.search.trim()
  if (search) query = query.or(`invoice_number.ilike.%${search}%,notes.ilike.%${search}%`)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  let rows = ((data as InvoiceWithRelations[] | null) ?? []).map((row) =>
    hydrateInvoice(row as Parameters<typeof hydrateInvoice>[0]),
  )
  if (filters.status !== 'all') rows = rows.filter((row) => row.status === filters.status)
  return rows
}

export async function getInvoice(id: string): Promise<InvoiceWithRelations> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', id).single()
  if (error) throw new Error(error.message)
  return hydrateInvoice(data as Parameters<typeof hydrateInvoice>[0])
}

export async function createInvoice(
  values: InvoiceFormValues,
  userId: string | undefined,
): Promise<Invoice> {
  const items = values.items.map((item, index) => {
    const quantity = parseQuantity(item.quantity)
    const unitPrice = parseMoney(item.unit_price)
    return {
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      line_total: roundMoney(quantity * unitPrice),
      sort_order: index,
    }
  })
  const moneyTotals = totalsFromItems(items, parseMoney(values.discount_amount), parseMoney(values.tax_amount))
  const supabase = getSupabaseClient()
  const number = await nextInvoiceNumber()
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: number,
      client_id: values.client_id,
      contact_id: toNullableUuid(values.contact_id),
      project_id: toNullableUuid(values.project_id),
      deal_id: toNullableUuid(values.deal_id),
      invoice_date: values.invoice_date,
      due_date: toNullable(values.due_date),
      lifecycle: values.issue_now ? 'issued' : 'draft',
      subtotal: moneyTotals.subtotal,
      discount_amount: moneyTotals.discountAmount,
      tax_amount: moneyTotals.taxAmount,
      total: moneyTotals.total,
      notes: toNullable(values.notes),
      created_by: userId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  const { error: itemsError } = await supabase.from('invoice_items').insert(
    items.map((item) => ({ ...item, invoice_id: data.id })),
  )
  if (itemsError) throw new Error(itemsError.message)

  await logFinanceActivity({
    summary: `Invoice ${data.invoice_number} created`,
    clientId: data.client_id,
    contactId: data.contact_id,
    projectId: data.project_id,
    dealId: data.deal_id,
    userId,
  })
  return data
}

export async function updateInvoice(
  id: string,
  values: InvoiceFormValues,
  userId?: string,
): Promise<Invoice> {
  const current = await getInvoice(id)
  if (current.lifecycle === 'cancelled') throw new Error('Cancelled invoices cannot be edited')
  if (current.amount_paid > 0) throw new Error('Invoices with payments cannot change line items. Record additional payments instead.')

  const items = values.items.map((item, index) => {
    const quantity = parseQuantity(item.quantity)
    const unitPrice = parseMoney(item.unit_price)
    return {
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      line_total: roundMoney(quantity * unitPrice),
      sort_order: index,
    }
  })
  const moneyTotals = totalsFromItems(items, parseMoney(values.discount_amount), parseMoney(values.tax_amount))
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .update({
      client_id: values.client_id,
      contact_id: toNullableUuid(values.contact_id),
      project_id: toNullableUuid(values.project_id),
      deal_id: toNullableUuid(values.deal_id),
      invoice_date: values.invoice_date,
      due_date: toNullable(values.due_date),
      lifecycle: values.issue_now ? 'issued' : current.lifecycle,
      subtotal: moneyTotals.subtotal,
      discount_amount: moneyTotals.discountAmount,
      tax_amount: moneyTotals.taxAmount,
      total: moneyTotals.total,
      notes: toNullable(values.notes),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
  if (deleteError) throw new Error(deleteError.message)
  const { error: itemsError } = await supabase.from('invoice_items').insert(
    items.map((item) => ({ ...item, invoice_id: id })),
  )
  if (itemsError) throw new Error(itemsError.message)

  await logFinanceActivity({
    summary: `Invoice ${data.invoice_number} updated`,
    clientId: data.client_id,
    projectId: data.project_id,
    userId,
  })
  return data
}

export async function issueInvoice(id: string, userId?: string): Promise<void> {
  const invoice = await getInvoice(id)
  if (invoice.lifecycle !== 'draft') throw new Error('Only drafts can be issued')
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('invoices').update({ lifecycle: 'issued' }).eq('id', id)
  if (error) throw new Error(error.message)
  await logFinanceActivity({
    summary: `Invoice ${invoice.invoice_number} issued`,
    clientId: invoice.client_id,
    projectId: invoice.project_id,
    userId,
  })
}

export async function cancelInvoice(id: string, userId?: string): Promise<void> {
  const invoice = await getInvoice(id)
  if (invoice.amount_paid > 0) throw new Error('Invoices with payments cannot be cancelled. Void payments first if needed.')
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('invoices').update({ lifecycle: 'cancelled' }).eq('id', id)
  if (error) throw new Error(error.message)
  await logFinanceActivity({
    summary: `Invoice ${invoice.invoice_number} cancelled`,
    clientId: invoice.client_id,
    projectId: invoice.project_id,
    userId,
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  const invoice = await getInvoice(id)
  if (invoice.lifecycle !== 'draft') throw new Error('Only draft invoices can be deleted')
  if (invoice.payments.length > 0) throw new Error('This invoice has payment records')
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function duplicateInvoice(id: string, userId: string | undefined): Promise<Invoice> {
  const source = await getInvoice(id)
  return createInvoice(
    {
      client_id: source.client_id,
      contact_id: source.contact_id ?? '',
      project_id: source.project_id ?? '',
      deal_id: source.deal_id ?? '',
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: source.due_date ?? '',
      discount_amount: String(source.discount_amount),
      tax_amount: String(source.tax_amount),
      notes: source.notes ?? '',
      issue_now: false,
      items: source.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
      })),
    },
    userId,
  )
}

export async function recordPayment(
  invoiceId: string,
  values: PaymentFormValues,
  userId: string | undefined,
): Promise<Payment> {
  const invoice = await getInvoice(invoiceId)
  if (invoice.lifecycle === 'draft') throw new Error('Issue the invoice before recording payment')
  if (invoice.lifecycle === 'cancelled') throw new Error('Cancelled invoices cannot accept payment')
  const amount = roundMoney(parseMoney(values.amount))
  if (amount <= 0) throw new Error('Payment amount must be greater than zero')
  if (amount > invoice.balance_due + 0.001) {
    throw new Error(`Payment exceeds the remaining balance of ${invoice.balance_due.toFixed(2)}`)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      client_id: invoice.client_id,
      project_id: invoice.project_id,
      amount,
      method: values.method,
      paid_at: values.paid_at,
      reference: toNullable(values.reference),
      notes: toNullable(values.notes),
      status: 'completed',
      created_by: userId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  const next = await getInvoice(invoiceId)
  await logFinanceActivity({
    summary:
      next.status === 'paid'
        ? `Invoice ${invoice.invoice_number} paid`
        : `Payment recorded on ${invoice.invoice_number}`,
    details: `${amount} via ${values.method}`,
    clientId: invoice.client_id,
    projectId: invoice.project_id,
    userId,
  })
  return data
}

export async function listPayments(filters: PaymentFilters): Promise<PaymentWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('payments')
    .select('*, invoices(id, invoice_number), clients(id, name), projects(id, name)')
    .eq('status', 'completed')
    .order('paid_at', { ascending: false })
  if (filters.method !== 'all') query = query.eq('method', filters.method)
  const search = filters.search.trim()
  if (search) query = query.or(`reference.ilike.%${search}%,notes.ilike.%${search}%`)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as PaymentWithRelations[] | null) ?? []
}

export async function loadFinanceTotals(): Promise<{
  totals: FinanceTotals
  overdue: InvoiceWithRelations[]
  dueSoon: InvoiceWithRelations[]
  recentPayments: PaymentWithRelations[]
}> {
  const [invoices, payments] = await Promise.all([
    listInvoices({ search: '', status: 'all', clientId: 'all' }),
    listPayments({ search: '', method: 'all' }),
  ])
  const active = invoices.filter((row) => row.status !== 'cancelled' && row.status !== 'draft')
  const month = new Date().toISOString().slice(0, 7)
  const year = new Date().toISOString().slice(0, 4)
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const totals: FinanceTotals = {
    invoiced: roundMoney(active.reduce((sum, row) => sum + row.total, 0)),
    paid: roundMoney(active.reduce((sum, row) => sum + row.amount_paid, 0)),
    outstanding: roundMoney(active.reduce((sum, row) => sum + row.balance_due, 0)),
    overdue: roundMoney(
      invoices.filter((row) => row.status === 'overdue').reduce((sum, row) => sum + row.balance_due, 0),
    ),
    invoiceCount: active.length,
    paidCount: invoices.filter((row) => row.status === 'paid').length,
    unpaidCount: invoices.filter((row) => row.status === 'unpaid').length,
    partialCount: invoices.filter((row) => row.status === 'partially_paid').length,
    overdueCount: invoices.filter((row) => row.status === 'overdue').length,
    revenueThisMonth: roundMoney(
      payments.filter((row) => row.paid_at.startsWith(month)).reduce((sum, row) => sum + money(row.amount), 0),
    ),
    revenueThisYear: roundMoney(
      payments.filter((row) => row.paid_at.startsWith(year)).reduce((sum, row) => sum + money(row.amount), 0),
    ),
  }

  return {
    totals,
    overdue: invoices.filter((row) => row.status === 'overdue').slice(0, 6),
    dueSoon: invoices
      .filter(
        (row) =>
          (row.status === 'unpaid' || row.status === 'partially_paid') &&
          row.due_date &&
          row.due_date >= today &&
          row.due_date <= soon,
      )
      .slice(0, 6),
    recentPayments: payments.slice(0, 6),
  }
}

export async function getClientFinanceSummary(clientId: string): Promise<ClientFinanceSummary> {
  const invoices = await listInvoices({ search: '', status: 'all', clientId })
  const active = invoices.filter((row) => row.status !== 'cancelled' && row.status !== 'draft')
  return {
    billed: roundMoney(active.reduce((sum, row) => sum + row.total, 0)),
    paid: roundMoney(active.reduce((sum, row) => sum + row.amount_paid, 0)),
    outstanding: roundMoney(active.reduce((sum, row) => sum + row.balance_due, 0)),
    overdue: roundMoney(
      invoices.filter((row) => row.status === 'overdue').reduce((sum, row) => sum + row.balance_due, 0),
    ),
    invoices,
  }
}

export async function getProjectFinanceSummary(projectId: string): Promise<ClientFinanceSummary> {
  const invoices = (await listInvoices({ search: '', status: 'all', clientId: 'all' })).filter(
    (row) => row.project_id === projectId,
  )
  const active = invoices.filter((row) => row.status !== 'cancelled' && row.status !== 'draft')
  return {
    billed: roundMoney(active.reduce((sum, row) => sum + row.total, 0)),
    paid: roundMoney(active.reduce((sum, row) => sum + row.amount_paid, 0)),
    outstanding: roundMoney(active.reduce((sum, row) => sum + row.balance_due, 0)),
    overdue: roundMoney(
      invoices.filter((row) => row.status === 'overdue').reduce((sum, row) => sum + row.balance_due, 0),
    ),
    invoices,
  }
}

export async function listPaymentMethods(): Promise<FinancePaymentMethod[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('finance_payment_methods')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updatePaymentMethod(
  id: string,
  values: PaymentMethodSettingsValues,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('finance_payment_methods')
    .update({
      display_name: values.display_name.trim(),
      enabled: values.enabled,
      instructions: toNullable(values.instructions),
      payment_url: toNullable(values.payment_url),
      username: toNullable(values.username),
      email_or_phone: toNullable(values.email_or_phone),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listWonDeals(): Promise<
  Pick<Deal, 'id' | 'name' | 'client_id' | 'contact_id' | 'service' | 'estimated_value' | 'proposal_amount'>[]
> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, client_id, contact_id, service, estimated_value, proposal_amount')
    .eq('stage', 'won')
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listProjectsForClient(clientId: string): Promise<Pick<Project, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listContactsForClient(
  clientId: string,
): Promise<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('client_id', clientId)
    .order('last_name', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listClientOptions(): Promise<Pick<Client, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('clients').select('id, name').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}
