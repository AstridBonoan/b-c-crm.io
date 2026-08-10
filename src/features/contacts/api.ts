import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact } from '@/types/database'
import { toNullable, type ContactFormValues } from '@/features/contacts/schemas'

export type ContactWithClient = Contact & {
  clients: Pick<Client, 'id' | 'name' | 'client_type'> | null
}

export type ContactFilters = {
  search: string
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

export async function listContacts(filters: ContactFilters): Promise<ContactWithClient[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('contacts')
    .select('*, clients(id, name, client_type)')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (filters.clientId !== 'all') {
    query = query.eq('client_id', filters.clientId)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,job_title.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as ContactWithClient[] | null) ?? []
}

function toPayload(values: ContactFormValues, userId: string | undefined) {
  return {
    client_id: values.client_id,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    job_title: toNullable(values.job_title),
    email: toNullable(values.email),
    phone: toNullable(values.phone),
    notes: toNullable(values.notes),
    created_by: userId ?? null,
  }
}

export async function createContact(
  values: ContactFormValues,
  userId: string | undefined,
): Promise<Contact> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateContact(id: string, values: ContactFormValues): Promise<Contact> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('contacts')
    .update({
      client_id: payload.client_id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      job_title: payload.job_title,
      email: payload.email,
      phone: payload.phone,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
