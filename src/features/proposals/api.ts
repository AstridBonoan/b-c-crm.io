import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact, Deal, DealProposal, ProposalStatus } from '@/types/database'
import { formatMoney } from '@/features/pipeline/schemas'
import { logDealActivity, updateDealStage } from '@/features/pipeline/api'
import {
  parseMoney,
  proposalStatusLabel,
  toNullable,
  toNullableUuid,
  type ProposalFormValues,
} from '@/features/proposals/schemas'

export type ProposalWithRelations = DealProposal & {
  deals: Pick<Deal, 'id' | 'name' | 'stage'> | null
  clients: Pick<Client, 'id' | 'name'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

const OPEN_BEFORE_PROPOSAL: Deal['stage'][] = [
  'new_lead',
  'contacted',
  'interested',
  'meeting',
]

function toPayload(values: ProposalFormValues, userId: string | undefined, includeCreatedBy: boolean) {
  const status = values.status
  const sentAt =
    status === 'sent' || status === 'accepted' || status === 'rejected' || status === 'expired'
      ? toNullable(values.sent_at) ?? new Date().toISOString().slice(0, 10)
      : toNullable(values.sent_at)
  return {
    deal_id: values.deal_id,
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    service: toNullable(values.service),
    amount: parseMoney(values.amount),
    description: toNullable(values.description),
    status,
    sent_at: status === 'draft' ? toNullable(values.sent_at) : sentAt,
    notes: toNullable(values.notes),
    ...(includeCreatedBy ? { created_by: userId ?? null } : {}),
  }
}

async function activityForProposal(
  proposal: DealProposal,
  summary: string,
  userId?: string,
) {
  await logDealActivity({
    deal: {
      id: proposal.deal_id,
      client_id: proposal.client_id,
      contact_id: proposal.contact_id,
      lead_id: null,
      name: '',
    },
    type: 'other',
    summary,
    details: proposal.amount != null ? formatMoney(proposal.amount) : proposal.notes,
    userId,
  })
}

export async function listProposals(dealId?: string): Promise<ProposalWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('deal_proposals')
    .select('*, deals(id, name, stage), clients(id, name), contacts(id, first_name, last_name)')
    .order('created_at', { ascending: false })
  if (dealId) query = query.eq('deal_id', dealId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as ProposalWithRelations[] | null) ?? []
}

async function maybeMoveDealToProposalSent(
  values: ProposalFormValues,
  userId: string | undefined,
) {
  if (!values.move_deal_to_proposal_sent) return
  if (values.status !== 'sent' && values.status !== 'accepted') return
  const supabase = getSupabaseClient()
  const { data: deal, error } = await supabase
    .from('deals')
    .select('id, stage')
    .eq('id', values.deal_id)
    .single()
  if (error || !deal) return
  if (OPEN_BEFORE_PROPOSAL.includes(deal.stage)) {
    await updateDealStage(deal.id, 'proposal_sent', userId)
  }
}

export async function createProposal(
  values: ProposalFormValues,
  userId: string | undefined,
): Promise<DealProposal> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deal_proposals')
    .insert(toPayload(values, userId, true))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const amountLabel = data.amount != null ? ` ${formatMoney(data.amount)}` : ''
  await activityForProposal(
    data,
    data.status === 'sent'
      ? `Proposal sent:${amountLabel}`
      : `Proposal created (${proposalStatusLabel(data.status as ProposalStatus)})${amountLabel}`,
    userId,
  )
  await maybeMoveDealToProposalSent(values, userId)
  return data
}

export async function updateProposal(
  id: string,
  values: ProposalFormValues,
  userId?: string,
): Promise<DealProposal> {
  const supabase = getSupabaseClient()
  const { data: previous, error: previousError } = await supabase
    .from('deal_proposals')
    .select('*')
    .eq('id', id)
    .single()
  if (previousError) throw new Error(previousError.message)

  const payload = toPayload(values, userId, false)
  const { data, error } = await supabase
    .from('deal_proposals')
    .update({
      deal_id: payload.deal_id,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      service: payload.service,
      amount: payload.amount,
      description: payload.description,
      status: payload.status,
      sent_at: payload.sent_at,
      notes: payload.notes,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  if (previous.status !== data.status) {
    const amountLabel = data.amount != null ? ` ${formatMoney(data.amount)}` : ''
    await activityForProposal(
      data,
      data.status === 'sent'
        ? `Proposal sent:${amountLabel}`
        : `Proposal ${proposalStatusLabel(data.status as ProposalStatus).toLowerCase()}${amountLabel}`,
      userId,
    )
  }
  await maybeMoveDealToProposalSent(values, userId)
  return data
}

export async function deleteProposal(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('deal_proposals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
