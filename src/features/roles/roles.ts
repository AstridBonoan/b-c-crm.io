import type { Profile, UserRole } from '@/types/database'

export const USER_ROLES: {
  value: UserRole
  title: string
  shortTitle: string
  primaryLane: 'delivery' | 'growth'
  summary: string
}[] = [
  {
    value: 'founder_cto',
    title: 'Founder & CTO',
    shortTitle: 'CTO · Delivery',
    primaryLane: 'delivery',
    summary:
      'Primary lane: projects and delivery (status, progress, completion). Full access to everything else.',
  },
  {
    value: 'founder_cmo',
    title: 'Co-Founder & CMO',
    shortTitle: 'CMO · Growth',
    primaryLane: 'growth',
    summary:
      'Primary lane: marketing and leads (finding and securing demand). Full access to everything else.',
  },
]

export function roleTitle(role: UserRole | string | null | undefined): string {
  return USER_ROLES.find((item) => item.value === role)?.title ?? 'Team member'
}

export function roleShortTitle(role: UserRole | string | null | undefined): string {
  return USER_ROLES.find((item) => item.value === role)?.shortTitle ?? 'Team'
}

export function roleSummary(role: UserRole | string | null | undefined): string {
  return (
    USER_ROLES.find((item) => item.value === role)?.summary ??
    'Shared ownership across the CRM.'
  )
}

export function isDeliveryPrimary(role: UserRole | string | null | undefined): boolean {
  return role === 'founder_cto'
}

export function isGrowthPrimary(role: UserRole | string | null | undefined): boolean {
  return role === 'founder_cmo'
}

/** Soft default: prefer CMO for leads/marketing assignments. */
export function preferGrowthAssignee(profiles: Pick<Profile, 'id' | 'role' | 'is_active'>[]): string | undefined {
  return profiles.find((profile) => profile.is_active && profile.role === 'founder_cmo')?.id
}

/** Soft default: prefer CTO for project/delivery assignments. */
export function preferDeliveryAssignee(
  profiles: Pick<Profile, 'id' | 'role' | 'is_active'>[],
): string | undefined {
  return profiles.find((profile) => profile.is_active && profile.role === 'founder_cto')?.id
}

export function displayName(profile: Pick<Profile, 'full_name' | 'email'>): string {
  return profile.full_name?.trim() || profile.email
}
