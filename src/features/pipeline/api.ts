import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact, Deal, DealStage } from '@/types/database'
import {
  parseMoney,
  toNullable,
  toNullableUuid,
  type DealFormValues,
} from '@/features/pipeline/schemas'

export type DealWithRelations = Deal & {
  clients: Pick<Client, 'id' | 'name' | 'client_type'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
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

export async function listPipelineDeals(): Promise<DealWithRelations[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('*, clients(id, name, client_type), contacts(id, first_name, last_name)')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as DealWithRelations[] | null) ?? []
}

function toPayload(values: DealFormValues, userId: string | undefined) {
  return {
    name: values.name.trim(),
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    service: toNullable(values.service),
    estimated_value: parseMoney(values.estimated_value),
    proposal_amount: parseMoney(values.proposal_amount),
    stage: values.stage,
    expected_close_date: toNullable(values.expected_close_date),
    notes: toNullable(values.notes),
    created_by: userId ?? null,
  }
}

export async function createDeal(
  values: DealFormValues,
  userId: string | undefined,
): Promise<Deal> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateDeal(id: string, values: DealFormValues): Promise<Deal> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined)
  const { data, error } = await supabase
    .from('deals')
    .update({
      name: payload.name,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      service: payload.service,
      estimated_value: payload.estimated_value,
      proposal_amount: payload.proposal_amount,
      stage: payload.stage,
      expected_close_date: payload.expected_close_date,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateDealStage(id: string, stage: DealStage): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('deals').update({ stage }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDeal(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
