import { getSupabaseClient } from '@/lib/supabase'
import type {
  Client,
  Contact,
  Deal,
  Lead,
  Note,
  Project,
} from '@/types/database'
import { toNullableUuid, type NoteFormValues } from '@/features/notes/schemas'

export type NoteWithRelations = Note & {
  clients: Pick<Client, 'id' | 'name'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
  leads: Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'> | null
  deals: Pick<Deal, 'id' | 'name'> | null
  projects: Pick<Project, 'id' | 'name'> | null
}

export type NoteFilters = {
  search: string
}

export async function listClientOptions(): Promise<Pick<Client, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

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

export async function listDealsForClient(
  clientId: string,
): Promise<Pick<Deal, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('id, name')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listProjectsForClient(
  clientId: string,
): Promise<Pick<Project, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listNotes(filters: NoteFilters): Promise<NoteWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('notes')
    .select(
      '*, clients(id, name), contacts(id, first_name, last_name), leads(id, source, service_interested, status), deals(id, name), projects(id, name)',
    )
    .order('updated_at', { ascending: false })

  const search = filters.search.trim()
  if (search) {
    query = query.ilike('body', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as NoteWithRelations[] | null) ?? []
}

function toPayload(values: NoteFormValues, userId: string | undefined) {
  return {
    body: values.body.trim(),
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    lead_id: toNullableUuid(values.lead_id),
    deal_id: toNullableUuid(values.deal_id),
    customer_id: null,
    project_id: toNullableUuid(values.project_id),
    created_by: userId ?? null,
  }
}

export async function createNote(
  values: NoteFormValues,
  userId: string | undefined,
): Promise<Note> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notes')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateNote(id: string, values: NoteFormValues): Promise<Note> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('notes')
    .update({
      body: payload.body,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      lead_id: payload.lead_id,
      deal_id: payload.deal_id,
      customer_id: payload.customer_id,
      project_id: payload.project_id,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
