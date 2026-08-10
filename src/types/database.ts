export type UserRole = 'admin' | 'manager' | 'sales' | 'developer'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Company = {
  id: string
  name: string
  industry: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type Contact = {
  id: string
  company_id: string
  first_name: string
  last_name: string
  job_title: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'converted'
  | 'lost'

export type Lead = {
  id: string
  company_id: string | null
  contact_id: string | null
  source: string | null
  service_interested: string | null
  status: LeadStatus
  estimated_value: number | null
  notes: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type DealStage =
  | 'new_lead'
  | 'contacted'
  | 'meeting'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'

export type Deal = {
  id: string
  name: string
  company_id: string | null
  contact_id: string | null
  lead_id: string | null
  service: string | null
  estimated_value: number | null
  proposal_amount: number | null
  stage: DealStage
  expected_close_date: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type Customer = {
  id: string
  company_id: string
  converted_from_deal_id: string | null
  converted_from_lead_id: string | null
  status: 'active' | 'inactive'
  total_revenue: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type ProjectStatus =
  | 'not_started'
  | 'planning'
  | 'in_development'
  | 'review'
  | 'completed'

export type Project = {
  id: string
  name: string
  customer_id: string
  company_id: string
  deal_id: string | null
  project_type: string | null
  description: string | null
  start_date: string | null
  due_date: string | null
  completion_date: string | null
  project_value: number | null
  assigned_to: string | null
  status: ProjectStatus
  progress: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'

export type Task = {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  company_id: string | null
  contact_id: string | null
  deal_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type Activity = {
  id: string
  type: string
  summary: string
  details: string | null
  company_id: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  customer_id: string | null
  project_id: string | null
  task_id: string | null
  occurred_at: string
  created_at: string
  created_by: string | null
}

export type Note = {
  id: string
  body: string
  company_id: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  customer_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type DocumentRecord = {
  id: string
  name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  company_id: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  customer_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

type TableDef<Row> = {
  Row: Row
  Insert: Partial<Row> & { id?: string }
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>
      companies: TableDef<Company>
      contacts: TableDef<Contact>
      leads: TableDef<Lead>
      deals: TableDef<Deal>
      customers: TableDef<Customer>
      projects: TableDef<Project>
      tasks: TableDef<Task>
      activities: TableDef<Activity>
      notes: TableDef<Note>
      documents: TableDef<DocumentRecord>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      lead_status: LeadStatus
      deal_stage: DealStage
      project_status: ProjectStatus
      task_priority: TaskPriority
      task_status: TaskStatus
    }
    CompositeTypes: Record<string, never>
  }
}
