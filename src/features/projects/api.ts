import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Deal, Project, ProjectStatus } from '@/types/database'
import {
  parseMoney,
  parseProgress,
  toNullable,
  toNullableUuid,
  type ProjectFormValues,
} from '@/features/projects/schemas'

export type ProjectWithRelations = Project & {
  clients: Pick<Client, 'id' | 'name' | 'client_type' | 'client_status'> | null
  deals: Pick<Deal, 'id' | 'name'> | null
}

export type ProjectFilters = {
  search: string
  status: ProjectStatus | 'all'
}

export async function listClientOptions(): Promise<
  Pick<Client, 'id' | 'name' | 'client_type' | 'client_status'>[]
> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, client_type, client_status')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listDealsForClient(
  clientId: string,
): Promise<Pick<Deal, 'id' | 'name' | 'stage'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, stage')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listProjects(filters: ProjectFilters): Promise<ProjectWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('projects')
    .select('*, clients(id, name, client_type, client_status), deals(id, name)')
    .order('updated_at', { ascending: false })

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,project_type.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as ProjectWithRelations[] | null) ?? []
}

function toPayload(values: ProjectFormValues, userId: string | undefined) {
  const status = values.status
  const completionDate =
    status === 'completed'
      ? toNullable(values.completion_date) ?? new Date().toISOString().slice(0, 10)
      : toNullable(values.completion_date)

  const progress = status === 'completed' ? 100 : parseProgress(values.progress)

  return {
    name: values.name.trim(),
    customer_id: null,
    client_id: values.client_id,
    deal_id: toNullableUuid(values.deal_id),
    project_type: toNullable(values.project_type),
    description: toNullable(values.description),
    start_date: toNullable(values.start_date),
    due_date: toNullable(values.due_date),
    completion_date: completionDate,
    project_value: parseMoney(values.project_value),
    status,
    progress,
    notes: toNullable(values.notes),
    created_by: userId ?? null,
  }
}

export async function createProject(
  values: ProjectFormValues,
  userId: string | undefined,
): Promise<Project> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('projects')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProject(id: string, values: ProjectFormValues): Promise<Project> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: payload.name,
      customer_id: payload.customer_id,
      client_id: payload.client_id,
      deal_id: payload.deal_id,
      project_type: payload.project_type,
      description: payload.description,
      start_date: payload.start_date,
      due_date: payload.due_date,
      completion_date: payload.completion_date,
      project_value: payload.project_value,
      status: payload.status,
      progress: payload.progress,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
