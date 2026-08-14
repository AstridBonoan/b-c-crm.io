import { getSupabaseClient } from '@/lib/supabase'
import type {
  Client,
  Contact,
  Deal,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/types/database'
import { toNullable, toNullableUuid, type TaskFormValues } from '@/features/tasks/schemas'

export type TaskWithRelations = Task & {
  clients: Pick<Client, 'id' | 'name'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
  deals: Pick<Deal, 'id' | 'name'> | null
  projects: Pick<Project, 'id' | 'name'> | null
}

export type TaskFilters = {
  search: string
  status: TaskStatus | 'all'
  priority: TaskPriority | 'all'
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

export async function listTasks(filters: TaskFilters): Promise<TaskWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('tasks')
    .select(
      '*, clients(id, name), contacts(id, first_name, last_name), deals(id, name), projects(id, name)',
    )
    .order('due_date', { ascending: true })
    .order('updated_at', { ascending: false })

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as TaskWithRelations[] | null) ?? []
}

function toPayload(values: TaskFormValues, userId: string | undefined) {
  return {
    title: values.title.trim(),
    description: toNullable(values.description),
    due_date: toNullable(values.due_date),
    priority: values.priority,
    status: values.status,
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    deal_id: toNullableUuid(values.deal_id),
    project_id: toNullableUuid(values.project_id),
    assigned_to: userId ?? null,
    created_by: userId ?? null,
  }
}

export async function createTask(
  values: TaskFormValues,
  userId: string | undefined,
): Promise<Task> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateTask(id: string, values: TaskFormValues): Promise<Task> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: payload.title,
      description: payload.description,
      due_date: payload.due_date,
      priority: payload.priority,
      status: payload.status,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      deal_id: payload.deal_id,
      project_id: payload.project_id,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
