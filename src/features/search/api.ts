import { getSupabaseClient } from '@/lib/supabase'
import {
  modulePath,
  type SearchHit,
  type SearchModuleId,
} from '@/features/search/types'

const LIMIT = 8

type NamedClient = { name: string; email?: string | null }

function pattern(query: string): string {
  return `%${query.trim()}%`
}

function clientName(clients: NamedClient | NamedClient[] | null | undefined): string | null {
  if (!clients) return null
  if (Array.isArray(clients)) return clients[0]?.name ?? null
  return clients.name ?? null
}

function leadTitle(lead: {
  service_interested: string | null
  source: string | null
  status: string
}): string {
  return lead.service_interested || lead.source || `Lead (${lead.status})`
}

export async function globalSearch(
  query: string,
  modules: SearchModuleId[],
): Promise<SearchHit[]> {
  const trimmed = query.trim()
  if (!trimmed || modules.length === 0) return []

  const supabase = getSupabaseClient()
  const like = pattern(trimmed)
  const selected = new Set(modules)
  const jobs: Promise<SearchHit[]>[] = []

  if (selected.has('clients')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, email, phone, client_type, industry')
          .or(
            `name.ilike.${like},email.ilike.${like},phone.ilike.${like},industry.ilike.${like},location.ilike.${like}`,
          )
          .order('name', { ascending: true })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                name: string
                email: string | null
                client_type: string
                industry: string | null
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'clients' as const,
          title: row.name,
          subtitle: [row.client_type, row.email, row.industry].filter(Boolean).join(' · '),
          href: modulePath('clients', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('contacts')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, job_title, clients(name)')
          .or(
            `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},job_title.ilike.${like}`,
          )
          .order('last_name', { ascending: true })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                first_name: string
                last_name: string
                email: string | null
                job_title: string | null
                clients: NamedClient | null
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'contacts' as const,
          title: `${row.first_name} ${row.last_name}`.trim(),
          subtitle: [clientName(row.clients), row.job_title, row.email]
            .filter(Boolean)
            .join(' · '),
          href: modulePath('contacts', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('leads')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('leads')
          .select('id, source, service_interested, status, notes, clients(name)')
          .or(`source.ilike.${like},service_interested.ilike.${like},notes.ilike.${like}`)
          .order('updated_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                source: string | null
                service_interested: string | null
                status: string
                clients: NamedClient | null
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'leads' as const,
          title: leadTitle(row),
          subtitle: [row.status, clientName(row.clients)].filter(Boolean).join(' · '),
          href: modulePath('leads', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('deals')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('deals')
          .select('id, name, stage, service, notes, clients(name)')
          .or(`name.ilike.${like},service.ilike.${like},notes.ilike.${like}`)
          .order('updated_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                name: string
                stage: string
                service: string | null
                clients: NamedClient | null
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'deals' as const,
          title: row.name,
          subtitle: [row.stage, clientName(row.clients), row.service]
            .filter(Boolean)
            .join(' · '),
          href: modulePath('deals', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('projects')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, status, project_type, description, clients(name)')
          .or(
            `name.ilike.${like},project_type.ilike.${like},description.ilike.${like},notes.ilike.${like}`,
          )
          .order('updated_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                name: string
                status: string
                project_type: string | null
                clients: NamedClient | null
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'projects' as const,
          title: row.name,
          subtitle: [row.status, clientName(row.clients), row.project_type]
            .filter(Boolean)
            .join(' · '),
          href: modulePath('projects', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('tasks')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, status, priority, description')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order('updated_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                title: string
                status: string
                priority: string
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'tasks' as const,
          title: row.title,
          subtitle: `${row.status} · ${row.priority}`,
          href: modulePath('tasks', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('activities')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('activities')
          .select('id, type, summary, details')
          .or(`summary.ilike.${like},details.ilike.${like},type.ilike.${like}`)
          .order('occurred_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as { id: string; type: string; summary: string }[] | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'activities' as const,
          title: row.summary,
          subtitle: row.type,
          href: modulePath('activities', trimmed),
        }))
      })(),
    )
  }

  if (selected.has('notes')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('notes')
          .select('id, body, clients(name)')
          .ilike('body', like)
          .order('updated_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as { id: string; body: string; clients: NamedClient | null }[] | null) ?? []
        return rows.map((row) => {
          const preview = row.body.trim().slice(0, 80)
          return {
            id: row.id,
            module: 'notes' as const,
            title: preview.length < row.body.trim().length ? `${preview}…` : preview,
            subtitle: clientName(row.clients) ?? 'Note',
            href: modulePath('notes', trimmed),
          }
        })
      })(),
    )
  }

  if (selected.has('documents')) {
    jobs.push(
      (async () => {
        const { data, error } = await supabase
          .from('documents')
          .select('id, name, mime_type, clients(name)')
          .or(`name.ilike.${like},mime_type.ilike.${like}`)
          .order('updated_at', { ascending: false })
          .limit(LIMIT)
        if (error) throw new Error(error.message)
        const rows =
          (data as
            | {
                id: string
                name: string
                mime_type: string | null
                clients: NamedClient | null
              }[]
            | null) ?? []
        return rows.map((row) => ({
          id: row.id,
          module: 'documents' as const,
          title: row.name,
          subtitle: [row.mime_type, clientName(row.clients)].filter(Boolean).join(' · '),
          href: modulePath('documents', trimmed),
        }))
      })(),
    )
  }

  const groups = await Promise.all(jobs)
  return groups.flat()
}
