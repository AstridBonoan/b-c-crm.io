import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Customer, Deal, Lead } from '@/types/database'
import {
  parseMoney,
  toNullable,
  toNullableUuid,
  type CustomerFormValues,
} from '@/features/customers/schemas'

export type CustomerWithRelations = Customer & {
  clients: Pick<
    Client,
    'id' | 'name' | 'client_type' | 'email' | 'phone' | 'industry' | 'location'
  > | null
  contacts_count: number
  deals_count: number
  projects_count: number
}

export type CustomerFilters = {
  search: string
  status: 'all' | 'active' | 'inactive'
}

export async function listClientOptions(): Promise<
  Pick<Client, 'id' | 'name' | 'client_type'>[]
> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, client_type')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listWonDealsForClient(
  clientId: string,
): Promise<Pick<Deal, 'id' | 'name' | 'proposal_amount' | 'estimated_value'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, proposal_amount, estimated_value')
    .eq('client_id', clientId)
    .eq('stage', 'won')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listLeadsForClient(
  clientId: string,
): Promise<Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, source, service_interested, status')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

async function countForClient(
  table: 'contacts' | 'deals' | 'projects',
  clientId: string,
): Promise<number> {
  const supabase = getSupabaseClient()
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function listCustomers(
  filters: CustomerFilters,
): Promise<CustomerWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('customers')
    .select(
      '*, clients(id, name, client_type, email, phone, industry, location)',
    )
    .order('created_at', { ascending: false })

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(`notes.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  type CustomerRow = Customer & {
    clients: CustomerWithRelations['clients']
  }

  const rows = (data as CustomerRow[] | null) ?? []
  const withCounts = await Promise.all(
    rows.map(async (row) => {
      const clientId = row.client_id
      const [contacts_count, deals_count, projects_count] = await Promise.all([
        countForClient('contacts', clientId),
        countForClient('deals', clientId),
        countForClient('projects', clientId),
      ])

      return {
        ...row,
        contacts_count,
        deals_count,
        projects_count,
      }
    }),
  )

  if (!search) return withCounts

  const lower = search.toLowerCase()
  return withCounts.filter((customer) => {
    const name = customer.clients?.name?.toLowerCase() ?? ''
    const email = customer.clients?.email?.toLowerCase() ?? ''
    const notes = customer.notes?.toLowerCase() ?? ''
    return name.includes(lower) || email.includes(lower) || notes.includes(lower)
  })
}

function toPayload(values: CustomerFormValues, userId: string | undefined) {
  return {
    client_id: values.client_id,
    status: values.status,
    total_revenue: parseMoney(values.total_revenue),
    converted_from_deal_id: toNullableUuid(values.converted_from_deal_id),
    converted_from_lead_id: toNullableUuid(values.converted_from_lead_id),
    notes: toNullable(values.notes),
    created_by: userId ?? null,
  }
}

export async function createCustomer(
  values: CustomerFormValues,
  userId: string | undefined,
): Promise<Customer> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('customers')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCustomer(
  id: string,
  values: CustomerFormValues,
): Promise<Customer> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('customers')
    .update({
      client_id: payload.client_id,
      status: payload.status,
      total_revenue: payload.total_revenue,
      converted_from_deal_id: payload.converted_from_deal_id,
      converted_from_lead_id: payload.converted_from_lead_id,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
