export const SEARCH_MODULES = [
  { id: 'clients', label: 'Clients', path: '/clients' },
  { id: 'contacts', label: 'Contacts', path: '/contacts' },
  { id: 'leads', label: 'Leads', path: '/leads' },
  { id: 'deals', label: 'Deals', path: '/deals' },
  { id: 'projects', label: 'Projects', path: '/projects' },
  { id: 'tasks', label: 'Tasks', path: '/tasks' },
  { id: 'activities', label: 'Activities', path: '/activities' },
  { id: 'notes', label: 'Notes', path: '/notes' },
  { id: 'documents', label: 'Documents', path: '/documents' },
] as const

export type SearchModuleId = (typeof SEARCH_MODULES)[number]['id']

export type SearchHit = {
  id: string
  module: SearchModuleId
  title: string
  subtitle: string
  href: string
}

export function modulePath(module: SearchModuleId, query: string): string {
  const base = SEARCH_MODULES.find((item) => item.id === module)?.path ?? '/'
  const trimmed = query.trim()
  if (!trimmed) return base
  return `${base}?q=${encodeURIComponent(trimmed)}`
}

export function moduleLabel(module: SearchModuleId): string {
  return SEARCH_MODULES.find((item) => item.id === module)?.label ?? module
}
