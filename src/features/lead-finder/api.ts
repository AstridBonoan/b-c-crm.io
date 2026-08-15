import { getSupabaseClient } from '@/lib/supabase'
import { discoverBusinesses, type DiscoveryQuery } from '@/features/lead-finder/discovery'
import type { ProspectSearchFormValues } from '@/features/lead-finder/schemas'
import type {
  Prospect,
  ProspectList,
  ProspectNote,
  ProspectOutreach,
  ProspectOutreachMethod,
  ProspectOutreachResult,
  ProspectSearch,
} from '@/features/lead-finder/types'
import type { OutreachFormValues } from '@/features/lead-finder/schemas'
import type { ProspectRow } from '@/types/database'
import { createLead } from '@/features/leads/api'
import type { LeadFormValues } from '@/features/leads/schemas'

export type ProspectOutreachFilter =
  | 'all'
  | 'not_contacted'
  | 'contacted'
  | 'follow_up_due'
  | 'follow_up_overdue'
  | 'interested'
  | 'no_response'
  | 'not_interested'

export type ProspectFilters = {
  search: string
  industry: string | 'all'
  hasWebsite: 'all' | 'yes' | 'no'
  outreach: ProspectOutreachFilter
  sort: 'name_asc' | 'newest'
  /** When false, hide prospects already saved as CRM leads. */
  showInLeads: boolean
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
  if (!filters.showInLeads) query = query.eq('saved_to_crm', false)

  const today = new Date().toISOString().slice(0, 10)
  if (filters.outreach === 'not_contacted') query = query.is('last_contacted_at', null)
  if (filters.outreach === 'contacted') query = query.not('last_contacted_at', 'is', null)
  if (filters.outreach === 'follow_up_due') {
    query = query.not('next_follow_up_at', 'is', null).gte('next_follow_up_at', today)
  }
  if (filters.outreach === 'follow_up_overdue') {
    query = query.not('next_follow_up_at', 'is', null).lt('next_follow_up_at', today)
  }

  if (
    filters.outreach === 'interested' ||
    filters.outreach === 'no_response' ||
    filters.outreach === 'not_interested'
  ) {
    const resultMap: Record<string, ProspectOutreachResult> = {
      interested: 'interested',
      no_response: 'no_response',
      not_interested: 'not_interested',
    }
    const { data: rows, error: outreachError } = await supabase
      .from('prospect_outreach')
      .select('prospect_id')
      .eq('result', resultMap[filters.outreach])
    if (outreachError) throw new Error(outreachError.message)
    const ids = [...new Set((rows ?? []).map((row) => row.prospect_id as string))]
    if (ids.length === 0) return []
    query = query.in('id', ids)
  }

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

export async function getProspectSearch(id: string): Promise<ProspectSearch> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('prospect_searches').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data as ProspectSearch
}

export async function getProspect(id: string): Promise<Prospect> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('prospects').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return mapProspect(data as Record<string, unknown>)
}

export async function deleteProspect(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) throw new Error(error.message)
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

export async function listProspectOutreach(prospectId: string): Promise<ProspectOutreach[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('prospect_outreach')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('contacted_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ProspectOutreach[]) ?? []
}

export async function createProspectOutreach(
  prospect: Prospect,
  values: OutreachFormValues,
  userId: string | undefined,
): Promise<ProspectOutreach> {
  const nextFollowUp = values.next_follow_up_at?.trim() || null
  const crmStatus = leadStatusFromOutreach(values.result)

  let leadId = prospect.crm_lead_id
  if (!prospect.saved_to_crm) {
    const saved = await saveProspectToCrm(
      {
        ...prospect,
        last_contacted_at: values.contacted_at,
        next_follow_up_at: nextFollowUp ?? prospect.next_follow_up_at,
      },
      userId,
      {
        status: crmStatus,
        last_contacted_at: values.contacted_at,
        next_follow_up_at: nextFollowUp,
        pipelineStatus: 'contacted',
      },
    )
    leadId = saved.leadId
  } else if (leadId) {
    await syncCrmLeadFromOutreach(leadId, {
      status: crmStatus,
      last_contacted_at: values.contacted_at,
      next_follow_up_at: nextFollowUp,
    })
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('prospect_outreach')
    .insert({
      prospect_id: prospect.id,
      lead_id: leadId,
      method: values.method as ProspectOutreachMethod,
      contacted_at: values.contacted_at,
      result: values.result as ProspectOutreachResult,
      next_follow_up_at: nextFollowUp,
      notes: values.notes?.trim() || null,
      created_by: userId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  const { error: updateError } = await supabase
    .from('prospects')
    .update({
      last_contacted_at: values.contacted_at,
      ...(nextFollowUp ? { next_follow_up_at: nextFollowUp } : {}),
    })
    .eq('id', prospect.id)
  if (updateError) throw new Error(updateError.message)

  return data as ProspectOutreach
}

function leadStatusFromOutreach(result: ProspectOutreachResult): LeadFormValues['status'] {
  if (result === 'not_interested') return 'lost'
  if (
    result === 'interested' ||
    result === 'meeting_scheduled' ||
    result === 'proposal_requested' ||
    result === 'follow_up_needed'
  ) {
    return 'following_up'
  }
  return 'contacted'
}

async function syncCrmLeadFromOutreach(
  leadId: string,
  values: {
    status: LeadFormValues['status']
    last_contacted_at: string
    next_follow_up_at: string | null
  },
): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: lead, error: loadError } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .maybeSingle()
  if (loadError) throw new Error(loadError.message)
  if (!lead || lead.status === 'converted') return

  const { error } = await supabase
    .from('leads')
    .update({
      status: values.status,
      last_contacted_at: values.last_contacted_at,
      next_follow_up_at: values.next_follow_up_at,
    })
    .eq('id', leadId)
  if (error) throw new Error(error.message)
}

export type LatestOutreach = {
  method: string
  result: string
  contacted_at: string
}

export type OutreachSnapshot = {
  total: number
  notContacted: number
  contacted: number
  followUpsDue: number
  followUpsOverdue: number
  interested: number
  meetingsScheduled: number
  latestByProspectId: Record<string, LatestOutreach>
}

export async function getOutreachSnapshot(prospects: Prospect[]): Promise<OutreachSnapshot> {
  const today = new Date().toISOString().slice(0, 10)
  const ids = prospects.map((p) => p.id)
  let interested = 0
  let meetingsScheduled = 0
  const latestByProspectId: Record<string, LatestOutreach> = {}

  if (ids.length > 0) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('prospect_outreach')
      .select('prospect_id, method, result, contacted_at, created_at')
      .in('prospect_id', ids)
    if (error) throw new Error(error.message)

    const interestedIds = new Set<string>()
    const meetingIds = new Set<string>()
    const ranked = [...(data ?? [])].sort((a, b) => {
      const byDate = String(b.contacted_at).localeCompare(String(a.contacted_at))
      if (byDate !== 0) return byDate
      return String(b.created_at).localeCompare(String(a.created_at))
    })
    for (const row of ranked) {
      if (row.result === 'interested') interestedIds.add(row.prospect_id)
      if (row.result === 'meeting_scheduled') meetingIds.add(row.prospect_id)
      if (!latestByProspectId[row.prospect_id]) {
        latestByProspectId[row.prospect_id] = {
          method: row.method,
          result: row.result,
          contacted_at: row.contacted_at,
        }
      }
    }
    interested = interestedIds.size
    meetingsScheduled = meetingIds.size
  }

  return {
    total: prospects.length,
    notContacted: prospects.filter((p) => !p.last_contacted_at).length,
    contacted: prospects.filter((p) => Boolean(p.last_contacted_at)).length,
    followUpsDue: prospects.filter(
      (p) => p.next_follow_up_at && p.next_follow_up_at.slice(0, 10) >= today,
    ).length,
    followUpsOverdue: prospects.filter(
      (p) => p.next_follow_up_at && p.next_follow_up_at.slice(0, 10) < today,
    ).length,
    interested,
    meetingsScheduled,
    latestByProspectId,
  }
}

export function upcomingFollowUps(prospects: Prospect[], limit = 8): Prospect[] {
  return [...prospects]
    .filter((p) => p.next_follow_up_at)
    .sort((a, b) => (a.next_follow_up_at ?? '').localeCompare(b.next_follow_up_at ?? ''))
    .slice(0, limit)
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
    outreach: 'all',
    sort: 'newest',
    showInLeads: false,
    searchId: searchRow.id,
  })

  return {
    search: searchRow as ProspectSearch,
    prospects,
    warning,
  }
}

function digitsOnly(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

function websiteHost(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toLowerCase()
  if (!raw) return ''
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return raw.replace(/^www\./, '')
  }
}

type CrmBusinessRow = {
  id: string
  name: string
  phone: string | null
  website: string | null
}

function matchesCrmBusiness(row: CrmBusinessRow, prospect: Prospect): boolean {
  if (row.name.trim().toLowerCase() === prospect.business_name.trim().toLowerCase()) return true
  const prospectPhone = digitsOnly(prospect.phone)
  const rowPhone = digitsOnly(row.phone)
  if (prospectPhone.length >= 7 && rowPhone === prospectPhone) return true
  const prospectHost = websiteHost(prospect.website)
  const rowHost = websiteHost(row.website)
  return Boolean(prospectHost && rowHost && prospectHost === rowHost)
}

export type SaveProspectToCrmResult =
  | { status: 'already_saved'; where: 'leads' | 'clients'; leadId: string | null }
  | { status: 'created'; leadId: string }

type SaveProspectExtras = {
  status?: LeadFormValues['status']
  last_contacted_at?: string
  next_follow_up_at?: string | null
  pipelineStatus?: Prospect['pipeline_status']
}

async function findExistingCrmMatch(prospect: Prospect): Promise<{
  where: 'leads' | 'clients'
  leadId: string | null
  clientId: string | null
} | null> {
  const supabase = getSupabaseClient()
  const [{ data: clients, error: clientError }, { data: leads, error: leadError }] = await Promise.all([
    supabase.from('clients').select('id, name, phone, website'),
    supabase.from('leads').select('id, company_name, notes, client_id, clients(id, name, phone, website)'),
  ])
  if (clientError) throw new Error(clientError.message)
  if (leadError) throw new Error(leadError.message)

  type LeadWithClient = {
    id: string
    company_name: string | null
    notes: string | null
    client_id: string | null
    clients: CrmBusinessRow | CrmBusinessRow[] | null
  }

  const matchingLead = ((leads ?? []) as LeadWithClient[]).find((lead) => {
    if (prospect.crm_lead_id && lead.id === prospect.crm_lead_id) return true
    if (
      lead.company_name &&
      lead.company_name.trim().toLowerCase() === prospect.business_name.trim().toLowerCase()
    ) {
      return true
    }
    const linked = Array.isArray(lead.clients) ? lead.clients[0] : lead.clients
    return linked ? matchesCrmBusiness(linked, prospect) : false
  })
  if (matchingLead) {
    return { where: 'leads', leadId: matchingLead.id, clientId: matchingLead.client_id }
  }

  const matchingClient = ((clients ?? []) as CrmBusinessRow[]).find((client) =>
    matchesCrmBusiness(client, prospect),
  )
  if (matchingClient) {
    return { where: 'clients', leadId: null, clientId: matchingClient.id }
  }

  return null
}

export async function saveProspectToCrm(
  prospect: Prospect,
  userId: string | undefined,
  extras?: SaveProspectExtras,
): Promise<SaveProspectToCrmResult> {
  const existing = await findExistingCrmMatch(prospect)
  if (existing) {
    const supabase = getSupabaseClient()
    const { error: linkError } = await supabase
      .from('prospects')
      .update({
        saved_to_crm: true,
        crm_lead_id: existing.leadId,
        crm_client_id: existing.clientId,
      })
      .eq('id', prospect.id)
    if (linkError) throw new Error(linkError.message)
    if (existing.leadId && extras?.last_contacted_at) {
      await syncCrmLeadFromOutreach(existing.leadId, {
        status: extras.status ?? 'contacted',
        last_contacted_at: extras.last_contacted_at,
        next_follow_up_at: extras.next_follow_up_at ?? prospect.next_follow_up_at,
      })
    }
    return { status: 'already_saved', where: existing.where, leadId: existing.leadId }
  }

  const address = [prospect.address, prospect.city, prospect.state, prospect.zip]
    .filter(Boolean)
    .join(', ')
  const notes = [
    prospect.phone ? `Phone: ${prospect.phone}` : null,
    prospect.website ? `Website: ${prospect.website}` : 'Website not found in map/company data — verify manually.',
    address ? `Address: ${address}` : null,
    'Imported from Lead Finder.',
  ]
    .filter(Boolean)
    .join('\n')

  const lead = await createLead(
    {
      company_name: prospect.business_name,
      source: 'Lead Finder',
      service_interested: prospect.industry ?? '',
      status: extras?.status ?? 'new',
      estimated_value: '',
      notes,
      last_contacted_at: extras?.last_contacted_at ?? prospect.last_contacted_at ?? '',
      next_follow_up_at: extras?.next_follow_up_at ?? prospect.next_follow_up_at ?? '',
    },
    userId,
  )

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('prospects')
    .update({
      saved_to_crm: true,
      crm_lead_id: lead.id,
      crm_client_id: null,
      pipeline_status: extras?.pipelineStatus ?? 'researching',
    })
    .eq('id', prospect.id)
  if (error) throw new Error(error.message)

  return { status: 'created', leadId: lead.id }
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

export function prospectGoogleSearchUrl(prospect: {
  business_name: string
  industry?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
}): string {
  const place = [prospect.city, prospect.state].filter(Boolean).join(', ')
  const query = [prospect.business_name, prospect.industry, place, prospect.phone]
    .filter(Boolean)
    .join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
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
