import { getSupabaseClient } from '@/lib/supabase'
import type { Client, Contact, Lead, LeadStatus } from '@/types/database'
import { createClient, setClientStatus } from '@/features/clients/api'
import { createContact } from '@/features/contacts/api'
import { buildClientDisplayName, type ClientFormValues } from '@/features/clients/schemas'
import {
  parseMoney,
  toNullable,
  type LeadFormValues,
} from '@/features/leads/schemas'

export type LeadWithRelations = Lead & {
  clients: Pick<Client, 'id' | 'name' | 'client_type' | 'client_status'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null
}

export type LeadFilters = {
  search: string
  status: LeadStatus | 'all'
  clientId: string | 'all'
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

export async function listLeads(filters: LeadFilters): Promise<LeadWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('leads')
    .select(
      '*, clients(id, name, client_type, client_status), contacts(id, first_name, last_name, email, phone)',
    )
    .order('created_at', { ascending: false })

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.clientId !== 'all') {
    query = query.eq('client_id', filters.clientId)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `source.ilike.%${search}%,service_interested.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as LeadWithRelations[] | null) ?? []
}

function toPayload(
  values: LeadFormValues,
  userId: string | undefined,
  links?: { client_id: string | null; contact_id: string | null },
) {
  return {
    client_id: links?.client_id ?? null,
    contact_id: links?.contact_id ?? null,
    source: toNullable(values.source),
    service_interested: toNullable(values.service_interested),
    status: values.status,
    estimated_value: parseMoney(values.estimated_value),
    notes: toNullable(values.notes),
    last_contacted_at: toNullable(values.last_contacted_at),
    next_follow_up_at: toNullable(values.next_follow_up_at),
    assigned_to: userId ?? null,
    created_by: userId ?? null,
  }
}

export async function createLead(
  values: LeadFormValues,
  userId: string | undefined,
): Promise<Lead> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .insert(toPayload(values, userId))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateLead(id: string, values: LeadFormValues, existing?: Lead): Promise<Lead> {
  const supabase = getSupabaseClient()
  const payload = toPayload(values, undefined, {
    client_id: existing?.client_id ?? null,
    contact_id: existing?.contact_id ?? null,
  })
  const { data, error } = await supabase
    .from('leads')
    .update({
      client_id: payload.client_id,
      contact_id: payload.contact_id,
      source: payload.source,
      service_interested: payload.service_interested,
      status: existing?.status === 'converted' ? 'converted' : payload.status,
      estimated_value: payload.estimated_value,
      notes: payload.notes,
      last_contacted_at: payload.last_contacted_at,
      next_follow_up_at: payload.next_follow_up_at,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

function contactNamesFromClientValues(values: ClientFormValues): {
  first_name: string
  last_name: string
} {
  if (values.client_type === 'individual') {
    return {
      first_name: values.first_name?.trim() || 'Contact',
      last_name: values.last_name?.trim() || 'Unknown',
    }
  }

  const orgName = buildClientDisplayName(values)
  const parts = orgName.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
  }
  return { first_name: orgName || 'Primary', last_name: 'Contact' }
}

export async function convertLeadToClient(
  lead: LeadWithRelations,
  values: ClientFormValues,
  userId: string | undefined,
): Promise<{ client: Client; lead: Lead; contact: Contact | null }> {
  const supabase = getSupabaseClient()
  let client: Client
  let contactId = lead.contact_id
  let contact: Contact | null = null

  if (lead.client_id) {
    client = await setClientStatus(lead.client_id, 'active')
  } else {
    client = await createClient(
      {
        ...values,
        client_status: 'active',
        notes:
          values.notes?.trim() ||
          [lead.service_interested, lead.source, lead.notes].filter(Boolean).join(' · ') ||
          undefined,
      },
      userId,
    )
  }

  const hasContactDetails =
    Boolean(values.email?.trim()) ||
    Boolean(values.phone?.trim()) ||
    Boolean(values.first_name?.trim()) ||
    Boolean(values.last_name?.trim()) ||
    values.client_type === 'individual'

  if (!contactId && hasContactDetails) {
    const names = contactNamesFromClientValues(values)
    contact = await createContact(
      {
        client_id: client.id,
        first_name: names.first_name,
        last_name: names.last_name,
        email: values.email,
        phone: values.phone,
        job_title: undefined,
        notes: 'Created when converting lead to client',
      },
      userId,
    )
    contactId = contact.id
  }

  const { data, error } = await supabase
    .from('leads')
    .update({
      client_id: client.id,
      contact_id: contactId,
      status: 'converted',
      assigned_to: lead.assigned_to ?? userId ?? null,
    })
    .eq('id', lead.id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return { client, lead: data, contact }
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
