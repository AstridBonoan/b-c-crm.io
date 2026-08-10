import { getSupabaseClient } from '@/lib/supabase'
import type { Client, ClientType } from '@/types/database'
import {
  buildClientDisplayName,
  toNullable,
  type ClientFormValues,
} from '@/features/clients/schemas'

export type ClientFilters = {
  search: string
  clientType: 'all' | ClientType
}

export async function listClients(filters: ClientFilters): Promise<Client[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('clients').select('*').order('name', { ascending: true })

  if (filters.clientType !== 'all') {
    query = query.eq('client_type', filters.clientType)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,industry.ilike.%${search}%,location.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

function toPayload(values: ClientFormValues, userId: string | undefined) {
  const name = buildClientDisplayName(values)
  return {
    client_type: values.client_type,
    name,
    first_name:
      values.client_type === 'individual' ? toNullable(values.first_name) : null,
    last_name: values.client_type === 'individual' ? toNullable(values.last_name) : null,
    industry: values.client_type === 'organization' ? toNullable(values.industry) : null,
    website: toNullable(values.website),
    email: toNullable(values.email),
    phone: toNullable(values.phone),
    address: toNullable(values.address),
    location: toNullable(values.location),
    notes: toNullable(values.notes),
    created_by: userId ?? null,
  }
}

export async function createClient(
  values: ClientFormValues,
  userId: string | undefined,
): Promise<Client> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateClient(
  id: string,
  values: ClientFormValues,
): Promise<Client> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('clients')
    .update({
      client_type: payload.client_type,
      name: payload.name,
      first_name: payload.first_name,
      last_name: payload.last_name,
      industry: payload.industry,
      website: payload.website,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      location: payload.location,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
