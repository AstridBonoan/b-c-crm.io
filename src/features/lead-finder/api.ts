import { getSupabaseClient } from '@/lib/supabase'
import { discoverBusinesses, type DiscoveryQuery } from '@/features/lead-finder/discovery'
import type { ProspectSearchFormValues } from '@/features/lead-finder/schemas'
import type {
  Prospect,
  ProspectList,
  ProspectNote,
  ProspectSearch,
} from '@/features/lead-finder/types'
import type { ProspectRow } from '@/types/database'
import { createLead } from '@/features/leads/api'
import { createClient } from '@/features/clients/api'

export type ProspectFilters = {
  search: string
  industry: string | 'all'
  hasWebsite: 'all' | 'yes' | 'no'
  sort: 'name_asc' | 'newest'
  /** When set, only show prospects from this search run. */
  searchId?: string | null
}

function mapProspect(row: Record<string, unknown>): Prospect {
  return row as unknown as Prospect
}

export async function listProspects(filters: ProspectFilters): Promise<Prospect[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('prospects').select('*')

  if (filters.searchId) query = query.eq('search_id', filters.searchId)
  if (filters.industry !== 'all') query = query.ilike('industry', `%${filters.industry}%`)
  if (filters.hasWebsite === 'yes') query = query.eq('has_website', true)
  if (filters.hasWebsite === 'no') query = query.eq('has_website', false)

  if (filters.sort === 'name_asc') query = query.order('business_name', { ascending: true })
  else query = query.order('created_at', { ascending: false })

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,city.ilike.%${search}%,industry.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => mapProspect(row as Record<string, unknown>))
}

export async function getProspect(id: string): Promise<Prospect> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('prospects').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return mapProspect(data as Record<string, unknown>)
}

export async function listProspectNotes(prospectId: string): Promise<ProspectNote[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('prospect_notes')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ProspectNote[]) ?? []
}

export async function addProspectNote(
  prospectId: string,
  body: string,
  nextFollowUp: string | undefined,
  userId: string | undefined,
): Promise<ProspectNote> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('prospect_notes')
    .insert({
      prospect_id: prospectId,
      body: body.trim(),
      next_follow_up_at: nextFollowUp?.trim() || null,
      created_by: userId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  if (nextFollowUp?.trim()) {
    await supabase
      .from('prospects')
      .update({ next_follow_up_at: nextFollowUp.trim() })
      .eq('id', prospectId)
  }

  return data as ProspectNote
}

export async function updateProspectNotesField(id: string, notes: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('prospects').update({ notes }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function runProspectSearch(
  values: ProspectSearchFormValues,
  userId: string | undefined,
): Promise<{ search: ProspectSearch; prospects: Prospect[]; warning?: string }> {
  const supabase = getSupabaseClient()
  const requiresWebsite =
    values.requires_website === 'any' ? null : values.requires_website === 'yes'

  const discoveryQuery: DiscoveryQuery = {
    industry: values.industry,
    city: values.city,
    state: values.state.toUpperCase(),
    zip: values.zip,
    radiusMiles: values.radius_miles,
    requiresWebsite,
  }

  const label = `${values.industry} near ${values.city}, ${values.state.toUpperCase()} (${values.radius_miles} mi)`

  const { data: searchRow, error: searchError } = await supabase
    .from('prospect_searches')
    .insert({
      query_label: label,
      industry: values.industry,
      category: null,
      city: values.city,
      state: values.state.toUpperCase(),
      zip: values.zip || null,
      radius_miles: values.radius_miles,
      requires_website: requiresWebsite,
      business_size: values.business_size || null,
      created_by: userId ?? null,
    })
    .select('*')
    .single()

  if (searchError) throw new Error(searchError.message)

  const { businesses, warning } = await discoverBusinesses(discoveryQuery)

  const rows: ProspectRow[] = businesses.map((biz) => ({
    id: crypto.randomUUID(),
    search_id: searchRow.id,
    external_id: biz.externalId,
    business_name: biz.businessName,
    industry: biz.industry,
    category: biz.category,
    address: biz.address,
    city: biz.city,
    state: biz.state,
    zip: biz.zip,
    phone: biz.phone,
    website: biz.website,
    latitude: biz.latitude,
    longitude: biz.longitude,
    google_business_url: null,
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    yelp_url: null,
    has_website: Boolean(biz.website),
    pipeline_status: 'new',
    saved_to_crm: false,
    crm_lead_id: null,
    crm_client_id: null,
    notes: null,
    last_contacted_at: null,
    next_follow_up_at: null,
    created_by: userId ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('prospects').insert(
      rows.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest),
    )
    if (insertError) throw new Error(insertError.message)
  }

  await supabase
    .from('prospect_searches')
    .update({ result_count: rows.length })
    .eq('id', searchRow.id)

  const prospects = await listProspects({
    search: '',
    industry: 'all',
    hasWebsite: 'all',
    sort: 'newest',
    searchId: searchRow.id,
  })

  return {
    search: searchRow as ProspectSearch,
    prospects,
    warning,
  }
}

export async function saveProspectToCrm(
  prospect: Prospect,
  userId: string | undefined,
): Promise<{ leadId: string; clientId: string }> {
  const client = await createClient(
    {
      client_type: 'organization',
      client_status: 'prospect',
      name: prospect.business_name,
      first_name: '',
      last_name: '',
      industry: prospect.industry ?? undefined,
      website: prospect.website ?? undefined,
      email: undefined,
      phone: prospect.phone ?? undefined,
      address: prospect.address ?? undefined,
      location: [prospect.city, prospect.state].filter(Boolean).join(', ') || undefined,
      notes: 'Imported from Lead Finder.',
    },
    userId,
  )

  const lead = await createLead(
    {
      source: 'Lead Finder',
      service_interested: prospect.industry ?? '',
      status: 'new',
      estimated_value: '',
      notes: prospect.website
        ? `Website: ${prospect.website}`
        : 'Website not found in map/company data — verify manually.',
      last_contacted_at: '',
      next_follow_up_at: prospect.next_follow_up_at ?? '',
    },
    userId,
  )

  const supabase = getSupabaseClient()
  const { error: leadUpdateError } = await supabase
    .from('leads')
    .update({ client_id: client.id, source: 'Lead Finder' })
    .eq('id', lead.id)
  if (leadUpdateError) throw new Error(leadUpdateError.message)

  const { error } = await supabase
    .from('prospects')
    .update({
      saved_to_crm: true,
      crm_lead_id: lead.id,
      crm_client_id: client.id,
      pipeline_status: 'researching',
    })
    .eq('id', prospect.id)
  if (error) throw new Error(error.message)

  return { leadId: lead.id, clientId: client.id }
}

export async function listProspectLists(): Promise<ProspectList[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('prospect_lists')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ProspectList[]) ?? []
}

export async function createProspectList(
  name: string,
  description: string | undefined,
  userId: string | undefined,
): Promise<ProspectList> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('prospect_lists')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      created_by: userId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as ProspectList
}

export async function addProspectToList(listId: string, prospectId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('prospect_list_items').upsert({
    list_id: listId,
    prospect_id: prospectId,
  })
  if (error) throw new Error(error.message)
}

export function prospectsToCsv(prospects: Prospect[]): string {
  const header = [
    'business_name',
    'industry',
    'city',
    'state',
    'phone',
    'website',
  ]
  const lines = [header.join(',')]
  for (const p of prospects) {
    const row = [
      p.business_name,
      p.industry ?? '',
      p.city ?? '',
      p.state ?? '',
      p.phone ?? '',
      p.website ?? '',
    ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
    lines.push(row.join(','))
  }
  return lines.join('\n')
}
