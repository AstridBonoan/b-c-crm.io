import { getSupabaseClient } from '@/lib/supabase'
import { discoverBusinesses, type DiscoveryQuery } from '@/features/lead-finder/discovery'
import {
  computeOpportunityScore,
  type OpportunityScoreResult,
  type ProspectFinding,
} from '@/features/lead-finder/scoring'
import { analyzeWebsiteUrl } from '@/features/lead-finder/websiteAnalysis'
import type { ProspectSearchFormValues } from '@/features/lead-finder/schemas'
import type {
  Prospect,
  ProspectList,
  ProspectNote,
  ProspectPipelineStatus,
  ProspectSearch,
} from '@/features/lead-finder/types'
import type { ProspectRow } from '@/types/database'
import { createLead } from '@/features/leads/api'
import { createClient } from '@/features/clients/api'

export type ProspectFilters = {
  search: string
  industry: string | 'all'
  minOpportunity: number | 'all'
  hasWebsite: 'all' | 'yes' | 'no'
  hasContactForm: 'all' | 'yes' | 'no'
  service: string | 'all'
  sort: 'opportunity_desc' | 'website_asc' | 'name_asc'
}

function asFindings(value: unknown): ProspectFinding[] {
  return Array.isArray(value) ? (value as ProspectFinding[]) : []
}

function mapProspect(row: Record<string, unknown>): Prospect {
  return {
    ...(row as unknown as Prospect),
    findings: asFindings(row.findings),
    recommended_services: Array.isArray(row.recommended_services)
      ? (row.recommended_services as string[])
      : [],
  }
}

export async function listProspects(filters: ProspectFilters): Promise<Prospect[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('prospects').select('*')

  if (filters.industry !== 'all') query = query.ilike('industry', `%${filters.industry}%`)
  if (filters.minOpportunity !== 'all') {
    query = query.gte('opportunity_score', filters.minOpportunity)
  }
  if (filters.hasWebsite === 'yes') query = query.eq('has_website', true)
  if (filters.hasWebsite === 'no') query = query.eq('has_website', false)
  if (filters.service !== 'all') {
    query = query.contains('recommended_services', [filters.service])
  }

  if (filters.sort === 'website_asc') query = query.order('website_score', { ascending: true })
  else if (filters.sort === 'name_asc') query = query.order('business_name', { ascending: true })
  else query = query.order('opportunity_score', { ascending: false })

  const search = filters.search.trim()
  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,city.ilike.%${search}%,industry.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []).map((row) => mapProspect(row as Record<string, unknown>))

  if (filters.hasContactForm !== 'all') {
    rows = rows.filter((p) => {
      const missing = p.findings.some((f) =>
        f.message.toLowerCase().includes('no contact form'),
      )
      return filters.hasContactForm === 'yes' ? !missing && p.has_website : missing || !p.has_website
    })
  }

  return rows
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

export async function updateProspectStatus(
  id: string,
  pipeline_status: ProspectPipelineStatus,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('prospects').update({ pipeline_status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateProspectNotesField(id: string, notes: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('prospects').update({ notes }).eq('id', id)
  if (error) throw new Error(error.message)
}

function scoreToColumns(score: OpportunityScoreResult) {
  const byKey = Object.fromEntries(score.lines.map((line) => [line.key, line.earned]))
  return {
    opportunity_score: score.total,
    website_score: Math.round(((byKey.websiteQuality ?? 0) / 30) * 100),
    mobile_score: Math.round(((byKey.mobileExperience ?? 0) / 20) * 100),
    seo_score: Math.round(((byKey.seo ?? 0) / 15) * 100),
    performance_score: Math.round(((byKey.performance ?? 0) / 15) * 100),
    online_presence_score: Math.round(((byKey.onlinePresence ?? 0) / 10) * 100),
    lead_gen_score: Math.round(((byKey.leadGeneration ?? 0) / 10) * 100),
    score_breakdown: score,
    findings: score.findings,
    recommended_services: score.recommendedServices,
  }
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
    category: values.category,
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
      category: values.category || null,
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
  const supabaseFn = getSupabaseClient()

  const rows: ProspectRow[] = []
  for (const biz of businesses) {
    const analysis = await analyzeWebsiteUrl(biz.website ?? '', async (name, body) => {
      const result = await supabaseFn.functions.invoke(name, { body })
      return { data: result.data, error: result.error as Error | null }
    })

    const score = computeOpportunityScore(analysis.signals, {})
    const cols = scoreToColumns(score)

    rows.push({
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
      ...cols,
      score_breakdown: cols.score_breakdown as unknown as Record<string, unknown>,
      findings: cols.findings,
      pipeline_status: 'new',
      saved_to_crm: false,
      crm_lead_id: null,
      crm_client_id: null,
      notes: null,
      last_contacted_at: null,
      next_follow_up_at: null,
      analyzed_at: new Date().toISOString(),
      created_by: userId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

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
    minOpportunity: 'all',
    hasWebsite: 'all',
    hasContactForm: 'all',
    service: 'all',
    sort: 'opportunity_desc',
  })

  const forSearch = prospects.filter((p) => p.search_id === searchRow.id)

  return {
    search: searchRow as ProspectSearch,
    prospects: forSearch,
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
      notes: [
        `Imported from Lead Finder (score ${prospect.opportunity_score}).`,
        prospect.recommended_services.length
          ? `Recommended: ${prospect.recommended_services.join(', ')}`
          : null,
        prospect.findings
          .filter((f) => f.severity !== 'info')
          .slice(0, 8)
          .map((f) => `• ${f.message}`)
          .join('\n') || null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
    userId,
  )

  const lead = await createLead(
    {
      source: 'Lead Finder',
      service_interested: prospect.recommended_services[0] ?? prospect.industry ?? '',
      status: 'new',
      estimated_value: '',
      notes: `Prospect score ${prospect.opportunity_score}/100. ${prospect.website ?? 'No website'}.`,
      last_contacted_at: '',
      next_follow_up_at: prospect.next_follow_up_at ?? '',
    },
    userId,
  )

  // Link lead to client
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
    'opportunity_score',
    'website_score',
    'seo_score',
    'recommended_services',
    'pipeline_status',
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
      String(p.opportunity_score),
      String(p.website_score),
      String(p.seo_score),
      p.recommended_services.join('; '),
      p.pipeline_status,
    ].map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
    lines.push(row.join(','))
  }
  return lines.join('\n')
}
