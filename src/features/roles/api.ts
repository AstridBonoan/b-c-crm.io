import { getSupabaseClient } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import type { ProfileFormValues } from '@/features/roles/schemas'

export type TeamMemberActivity = {
  id: string
  type: string
  summary: string
  occurred_at: string
  created_by: string | null
}

export type TeamMemberProject = {
  id: string
  name: string
  status: string
  progress: number
  updated_at: string
  assigned_to: string | null
}

export type TeamMemberLead = {
  id: string
  status: string
  source: string | null
  service_interested: string | null
  updated_at: string
  assigned_to: string | null
}

export type TeamOverview = {
  members: Profile[]
  allowlist: { email: string; note: string | null }[]
  recentActivities: TeamMemberActivity[]
  recentProjects: TeamMemberProject[]
  recentLeads: TeamMemberLead[]
}

export async function listTeamMembers(): Promise<Profile[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listEmployeeAllowlist(): Promise<{ email: string; note: string | null }[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('employee_allowlist')
    .select('email, note')
    .order('email', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateTeamMember(
  id: string,
  values: ProfileFormValues,
): Promise<Profile> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: values.full_name.trim(),
      role: values.role,
      is_active: values.is_active,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function loadTeamOverview(): Promise<TeamOverview> {
  const supabase = getSupabaseClient()

  const [membersResult, allowlistResult, activitiesResult, projectsResult, leadsResult] =
    await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('employee_allowlist').select('email, note').order('email', { ascending: true }),
      supabase
        .from('activities')
        .select('id, type, summary, occurred_at, created_by')
        .order('occurred_at', { ascending: false })
        .limit(12),
      supabase
        .from('projects')
        .select('id, name, status, progress, updated_at, assigned_to')
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('leads')
        .select('id, status, source, service_interested, updated_at, assigned_to')
        .order('updated_at', { ascending: false })
        .limit(8),
    ])

  if (membersResult.error) throw new Error(membersResult.error.message)
  if (allowlistResult.error) throw new Error(allowlistResult.error.message)
  if (activitiesResult.error) throw new Error(activitiesResult.error.message)
  if (projectsResult.error) throw new Error(projectsResult.error.message)
  if (leadsResult.error) throw new Error(leadsResult.error.message)

  return {
    members: membersResult.data ?? [],
    allowlist: allowlistResult.data ?? [],
    recentActivities: (activitiesResult.data as TeamMemberActivity[] | null) ?? [],
    recentProjects: (projectsResult.data as TeamMemberProject[] | null) ?? [],
    recentLeads: (leadsResult.data as TeamMemberLead[] | null) ?? [],
  }
}
