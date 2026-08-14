import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact, Deal, DealStage, Lead } from '@/types/database'
import {
  parseMoney,
  parseProbability,
  STAGE_PROBABILITY,
  stageLabel,
  toNullable,
  toNullableUuid,
  type DealFormValues,
} from '@/features/pipeline/schemas'
import type { LeadWithRelations } from '@/features/leads/api'

export type DealWithRelations = Deal & {
  clients: Pick<Client, 'id' | 'name' | 'client_type'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

export type LeadOption = Pick<
  Lead,
  'id' | 'client_id' | 'contact_id' | 'source' | 'service_interested' | 'status' | 'estimated_value'
> & {
  clients: Pick<Client, 'id' | 'name'> | null
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

export async function listLeadOptions(): Promise<LeadOption[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, client_id, contact_id, source, service_interested, status, estimated_value, clients(id, name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return (data as LeadOption[] | null) ?? []
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

function toPayload(values: DealFormValues, userId: string | undefined, includeCreatedBy: boolean) {
  const probability = parseProbability(values.probability, values.stage)
  return {
    name: values.name.trim(),
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    lead_id: toNullableUuid(values.lead_id),
    service: toNullable(values.service),
    source: toNullable(values.source),
    estimated_value: parseMoney(values.estimated_value),
    proposal_amount: parseMoney(values.proposal_amount),
    stage: values.stage,
    probability,
    expected_close_date: toNullable(values.expected_close_date),
    next_action: toNullable(values.next_action),
    next_follow_up_at: toNullable(values.next_follow_up_at),
    assigned_to: userId ?? null,
    notes: toNullable(values.notes),
    ...(includeCreatedBy ? { created_by: userId ?? null } : {}),
  }
}

async function logDealActivity(input: {
  deal: Pick<Deal, 'id' | 'client_id' | 'contact_id' | 'lead_id' | 'name'>
  summary: string
  details?: string | null
  userId?: string
}) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('activities').insert({
    type: 'note',
    summary: input.summary,
    details: input.details ?? null,
    deal_id: input.deal.id,
    client_id: input.deal.client_id,
    contact_id: input.deal.contact_id,
    lead_id: input.deal.lead_id,
    occurred_at: new Date().toISOString(),
    created_by: input.userId ?? null,
  })
  if (error) {
    console.warn('Could not log deal activity:', error.message)
  }
}

async function applyWonSideEffects(deal: Deal, userId: string | undefined) {
  const supabase = getSupabaseClient()

  if (deal.lead_id) {
    const { error } = await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', deal.lead_id)
    if (error) console.warn('Could not mark lead converted:', error.message)
  }

  if (!deal.client_id) return

  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from('customers')
    .select('id')
    .eq('client_id', deal.client_id)
    .maybeSingle()

  if (customerLookupError) {
    console.warn('Could not look up customer:', customerLookupError.message)
    return
  }

  let customerId = existingCustomer?.id as string | undefined
  if (!customerId) {
    const { data: created, error: createCustomerError } = await supabase
      .from('customers')
      .insert({
        client_id: deal.client_id,
        converted_from_deal_id: deal.id,
        converted_from_lead_id: deal.lead_id,
        status: 'active',
        created_by: userId ?? null,
      })
      .select('id')
      .single()

    if (createCustomerError) {
      console.warn('Could not create customer from won deal:', createCustomerError.message)
      return
    }
    customerId = created.id
  }

  const { data: existingProject, error: projectLookupError } = await supabase
    .from('projects')
    .select('id')
    .eq('deal_id', deal.id)
    .maybeSingle()

  if (projectLookupError) {
    console.warn('Could not look up project:', projectLookupError.message)
    return
  }

  if (existingProject) return

  const { error: createProjectError } = await supabase.from('projects').insert({
    name: deal.name,
    customer_id: customerId,
    client_id: deal.client_id,
    deal_id: deal.id,
    project_type: deal.service,
    project_value: deal.proposal_amount ?? deal.estimated_value,
    status: 'not_started',
    created_by: userId ?? null,
  })

  if (createProjectError) {
    console.warn('Could not create project from won deal:', createProjectError.message)
  }
}

export async function createDeal(
  values: DealFormValues,
  userId: string | undefined,
): Promise<Deal> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .insert(toPayload(values, userId, true))
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await logDealActivity({
    deal: data,
    summary: `Deal created in ${stageLabel(data.stage)}`,
    userId,
  })

  if (data.stage === 'won') {
    await applyWonSideEffects(data, userId)
  }

  return data
}

export async function updateDeal(
  id: string,
  values: DealFormValues,
  userId?: string,
): Promise<Deal> {
  const supabase = getSupabaseClient()
  const { data: previous, error: previousError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .single()

  if (previousError) throw new Error(previousError.message)

  const payload = toPayload(values, userId, false)
  const { data, error } = await supabase
    .from('deals')
    .update({
      name: payload.name,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      lead_id: payload.lead_id,
      service: payload.service,
      source: payload.source,
      estimated_value: payload.estimated_value,
      proposal_amount: payload.proposal_amount,
      stage: payload.stage,
      probability: payload.probability,
      expected_close_date: payload.expected_close_date,
      next_action: payload.next_action,
      next_follow_up_at: payload.next_follow_up_at,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  if (previous.stage !== data.stage) {
    await logDealActivity({
      deal: data,
      summary: `Deal moved from ${stageLabel(previous.stage)} to ${stageLabel(data.stage)}`,
      userId,
    })
  }

  if (data.stage === 'won' && previous.stage !== 'won') {
    await applyWonSideEffects(data, userId)
  }

  return data
}

export async function updateDealStage(
  id: string,
  stage: DealStage,
  userId?: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: previous, error: previousError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .single()

  if (previousError) throw new Error(previousError.message)
  if (previous.stage === stage) return

  const { data, error } = await supabase
    .from('deals')
    .update({
      stage,
      probability: STAGE_PROBABILITY[stage],
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await logDealActivity({
    deal: data,
    summary: `Deal moved from ${stageLabel(previous.stage)} to ${stageLabel(stage)}`,
    userId,
  })

  if (stage === 'won') {
    await applyWonSideEffects(data, userId)
  }
}

export async function findDealByLeadId(leadId: string): Promise<Deal | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function createDealFromLead(
  lead: LeadWithRelations,
  userId: string | undefined,
): Promise<Deal> {
  const existing = await findDealByLeadId(lead.id)
  if (existing) return existing

  const company = lead.clients?.name?.trim()
  const service = lead.service_interested?.trim()
  const name = [company, service].filter(Boolean).join(' — ') || company || service || 'New opportunity'

  const stage: DealStage =
    lead.status === 'qualified' || lead.status === 'converted'
      ? 'interested'
      : lead.status === 'contacted'
        ? 'contacted'
        : 'new_lead'

  const deal = await createDeal(
    {
      name,
      client_id: lead.client_id ?? '',
      contact_id: lead.contact_id ?? '',
      lead_id: lead.id,
      service: service ?? '',
      source: lead.source ?? '',
      estimated_value:
        lead.estimated_value === null || lead.estimated_value === undefined
          ? ''
          : String(lead.estimated_value),
      proposal_amount: '',
      stage,
      probability: String(STAGE_PROBABILITY[stage]),
      expected_close_date: '',
      next_action: '',
      next_follow_up_at: lead.next_follow_up_at?.slice(0, 10) ?? '',
      notes: lead.notes ?? '',
    },
    userId,
  )

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('leads').update({ status: 'converted' }).eq('id', lead.id)
  if (error) console.warn('Could not mark lead converted:', error.message)

  return deal
}

export async function deleteDeal(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
