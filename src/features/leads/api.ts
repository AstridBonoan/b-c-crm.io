import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact, Lead, LeadStatus } from '@/types/database'
import {
  parseMoney,
  toNullable,
  toNullableUuid,
  type LeadFormValues,
} from '@/features/leads/schemas'

export type LeadWithRelations = Lead & {
  clients: Pick<Client, 'id' | 'name' | 'client_type'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

export type LeadFilters = {
  search: string
  status: LeadStatus | 'all'
  clientId: string | 'all'
}

export async function listClientOptions(): Promise<Pick<Client, 'id' | 'name' | 'client_type'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, client_type')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listContactsForClient(
  clientId: string,
): Promise<Pick<Contact, 'id' | 'first_name' | 'last_name' | 'client_id'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, client_id')
    .eq('client_id', clientId)
    .order('last_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listLeads(filters: LeadFilters): Promise<LeadWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('leads')
    .select('*, clients(id, name, client_type), contacts(id, first_name, last_name)')
    .order('created_at', { ascending: false })

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.clientId !== 'all') {
    query = query.eq('client_id', filters.clientId)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `source.ilike.%${search}%,service_interested.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as LeadWithRelations[] | null) ?? []
}

function toPayload(values: LeadFormValues, userId: string | undefined) {
  return {
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    source: toNullable(values.source),
    service_interested: toNullable(values.service_interested),
    status: values.status,
    estimated_value: parseMoney(values.estimated_value),
    notes: toNullable(values.notes),
    last_contacted_at: toNullable(values.last_contacted_at),
    next_follow_up_at: toNullable(values.next_follow_up_at),
    created_by: userId ?? null,
  }
}

export async function createLead(
  values: LeadFormValues,
  userId: string | undefined,
): Promise<Lead> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateLead(id: string, values: LeadFormValues): Promise<Lead> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('leads')
    .update({
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      source: payload.source,
      service_interested: payload.service_interested,
      status: payload.status,
      estimated_value: payload.estimated_value,
      notes: payload.notes,
      last_contacted_at: payload.last_contacted_at,
      next_follow_up_at: payload.next_follow_up_at,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
