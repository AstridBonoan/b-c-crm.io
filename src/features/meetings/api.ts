import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact, Deal, DealMeeting } from '@/types/database'
import { logDealActivity } from '@/features/pipeline/api'
import {
  fromDatetimeLocalValue,
  meetingOutcomeLabel,
  meetingTypeLabel,
  parseOutcome,
  toNullable,
  toNullableUuid,
  type MeetingFormValues,
} from '@/features/meetings/schemas'

export type MeetingWithRelations = DealMeeting & {
  deals: Pick<Deal, 'id' | 'name'> | null
  clients: Pick<Client, 'id' | 'name'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

function toPayload(values: MeetingFormValues, userId: string | undefined, includeCreatedBy: boolean) {
  return {
    deal_id: values.deal_id,
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    meeting_at: fromDatetimeLocalValue(values.meeting_at),
    meeting_type: values.meeting_type,
    location_or_link: toNullable(values.location_or_link),
    notes: toNullable(values.notes),
    outcome: parseOutcome(values.outcome),
    next_action: toNullable(values.next_action),
    ...(includeCreatedBy ? { created_by: userId ?? null } : {}),
  }
}

async function activityForMeeting(
  meeting: DealMeeting,
  summary: string,
  userId?: string,
) {
  await logDealActivity({
    deal: {
      id: meeting.deal_id,
      client_id: meeting.client_id,
      contact_id: meeting.contact_id,
      lead_id: null,
      name: '',
    },
    type: 'meeting',
    summary,
    details: meeting.notes,
    userId,
  })
}

export async function listMeetings(dealId?: string): Promise<MeetingWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('deal_meetings')
    .select('*, deals(id, name), clients(id, name), contacts(id, first_name, last_name)')
    .order('meeting_at', { ascending: false })
  if (dealId) query = query.eq('deal_id', dealId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as MeetingWithRelations[] | null) ?? []
}

export async function createMeeting(
  values: MeetingFormValues,
  userId: string | undefined,
): Promise<DealMeeting> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deal_meetings')
    .insert(toPayload(values, userId, true))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const summary = data.outcome
    ? `Meeting completed: ${meetingTypeLabel(data.meeting_type)} · ${meetingOutcomeLabel(data.outcome)}`
    : `Meeting scheduled: ${meetingTypeLabel(data.meeting_type)}`
  await activityForMeeting(data, summary, userId)
  return data
}

export async function updateMeeting(
  id: string,
  values: MeetingFormValues,
  userId?: string,
): Promise<DealMeeting> {
  const supabase = getSupabaseClient()
  const { data: previous, error: previousError } = await supabase
    .from('deal_meetings')
    .select('*')
    .eq('id', id)
    .single()
  if (previousError) throw new Error(previousError.message)

  const payload = toPayload(values, userId, false)
  const { data, error } = await supabase
    .from('deal_meetings')
    .update({
      deal_id: payload.deal_id,
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      meeting_at: payload.meeting_at,
      meeting_type: payload.meeting_type,
      location_or_link: payload.location_or_link,
      notes: payload.notes,
      outcome: payload.outcome,
      next_action: payload.next_action,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  if (!previous.outcome && data.outcome) {
    await activityForMeeting(
      data,
      `Meeting completed: ${meetingTypeLabel(data.meeting_type)} · ${meetingOutcomeLabel(data.outcome)}`,
      userId,
    )
  }
  return data
}

export async function deleteMeeting(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('deal_meetings').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
