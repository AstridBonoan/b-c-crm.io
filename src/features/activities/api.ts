import { getSupabaseClient } from '@/lib/supabase'
import type {
  Activity,
  Client,
  Contact,
  Customer,
  Deal,
  Lead,
  Project,
  Task,
} from '@/types/database'
import {
  fromDatetimeLocalValue,
  toNullable,
  toNullableUuid,
  type ActivityFormValues,
  type ActivityType,
} from '@/features/activities/schemas'

export type ActivityWithRelations = Activity & {
  clients: Pick<Client, 'id' | 'name'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
  leads: Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'> | null
  deals: Pick<Deal, 'id' | 'name'> | null
  customers: Pick<Customer, 'id' | 'status'> | null
  projects: Pick<Project, 'id' | 'name'> | null
  tasks: Pick<Task, 'id' | 'title'> | null
}

export type ActivityFilters = {
  search: string
  type: ActivityType | 'all'
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

export async function listTasksForClient(
  clientId: string,
): Promise<Pick<Task, 'id' | 'title'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listActivities(
  filters: ActivityFilters,
): Promise<ActivityWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('activities')
    .select(
      '*, clients(id, name), contacts(id, first_name, last_name), leads(id, source, service_interested, status), deals(id, name), customers(id, status), projects(id, name), tasks(id, title)',
    )
    .order('occurred_at', { ascending: false })

  if (filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(`summary.ilike.%${search}%,details.ilike.%${search}%,type.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as ActivityWithRelations[] | null) ?? []
}

function toPayload(values: ActivityFormValues, userId: string | undefined) {
  return {
    type: values.type,
    summary: values.summary.trim(),
    details: toNullable(values.details),
    occurred_at: fromDatetimeLocalValue(values.occurred_at),
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    lead_id: toNullableUuid(values.lead_id),
    deal_id: toNullableUuid(values.deal_id),
    customer_id: null,
    project_id: toNullableUuid(values.project_id),
    task_id: toNullableUuid(values.task_id),
    created_by: userId ?? null,
  }
}

export async function createActivity(
  values: ActivityFormValues,
  userId: string | undefined,
): Promise<Activity> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('activities')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateActivity(
  id: string,
  values: ActivityFormValues,
): Promise<Activity> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('activities')
    .update({
      type: payload.type,
      summary: payload.summary,
      details: payload.details,
      occurred_at: payload.occurred_at,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      lead_id: payload.lead_id,
      deal_id: payload.deal_id,
      customer_id: payload.customer_id,
      project_id: payload.project_id,
      task_id: payload.task_id,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteActivity(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
