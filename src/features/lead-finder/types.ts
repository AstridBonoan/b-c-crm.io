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
  pipeline_status: ProspectPipelineStatus
  saved_to_crm: boolean
  crm_lead_id: string | null
  crm_client_id: string | null
  notes: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ProspectSearch = {
  id: string
  query_label: string
  industry: string | null
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

export type ProspectOutreachMethod =
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'instagram'
  | 'in_person'
  | 'other'

export type ProspectOutreachResult =
  | 'no_response'
  | 'responded'
  | 'interested'
  | 'not_interested'
  | 'meeting_scheduled'
  | 'proposal_requested'
  | 'follow_up_needed'
  | 'other'

export type ProspectOutreach = {
  id: string
  prospect_id: string
  lead_id: string | null
  method: ProspectOutreachMethod
  contacted_at: string
  result: ProspectOutreachResult
  next_follow_up_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const PROSPECT_PIPELINE_LABELS: Record<ProspectPipelineStatus, string> = {
  new: 'New',
  researching: 'Researching',
  contacted: 'Contacted',
  responded: 'Responded',
  meeting: 'Meeting',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}
