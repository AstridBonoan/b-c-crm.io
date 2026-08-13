import type { ProspectFinding } from '@/features/lead-finder/scoring'

export type ProspectPipelineStatus =
  | 'new'
  | 'researching'
  | 'contacted'
  | 'responded'
  | 'meeting'
  | 'proposal'
  | 'won'
  | 'lost'

export type Prospect = {
  id: string
  search_id: string | null
  external_id: string | null
  business_name: string
  industry: string | null
  category: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
  google_business_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  linkedin_url: string | null
  yelp_url: string | null
  has_website: boolean
  opportunity_score: number
  website_score: number
  mobile_score: number
  seo_score: number
  performance_score: number
  online_presence_score: number
  lead_gen_score: number
  score_breakdown: unknown
  findings: ProspectFinding[]
  recommended_services: string[]
  pipeline_status: ProspectPipelineStatus
  saved_to_crm: boolean
  crm_lead_id: string | null
  crm_client_id: string | null
  notes: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  analyzed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ProspectSearch = {
  id: string
  query_label: string
  industry: string | null
  category: string | null
  city: string | null
  state: string | null
  zip: string | null
  radius_miles: number | null
  requires_website: boolean | null
  business_size: string | null
  result_count: number
  created_by: string | null
  created_at: string
}

export type ProspectList = {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ProspectNote = {
  id: string
  prospect_id: string
  body: string
  next_follow_up_at: string | null
  created_by: string | null
  created_at: string
}

export const PIPELINE_STATUSES: { value: ProspectPipelineStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'researching', label: 'Researching' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]
