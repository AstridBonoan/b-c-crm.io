import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { globalSearch } from '@/features/search/api'
import {
  SEARCH_MODULES,
  moduleLabel,
  modulePath,
  type SearchHit,
  type SearchModuleId,
} from '@/features/search/types'

const ALL_MODULE_IDS = SEARCH_MODULES.map((item) => item.id)

export function SearchPage() {
  const [query, setQuery] = useSearchQuery()
  const [selected, setSelected] = useState<SearchModuleId[]>([...ALL_MODULE_IDS])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const load = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setHits([])
      setSearched(false)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await globalSearch(trimmed, selected)
      setHits(data)
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setHits([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [query, selected])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 300)
    return () => window.clearTimeout(handle)
  }, [load])

  const grouped = useMemo(() => {
    const map = new Map<SearchModuleId, SearchHit[]>()
    for (const hit of hits) {
      const list = map.get(hit.module) ?? []
      list.push(hit)
      map.set(hit.module, list)
    }
    return SEARCH_MODULES.filter((module) => map.has(module.id)).map((module) => ({
      module: module.id,
      label: module.label,
      items: map.get(module.id) ?? [],
    }))
  }, [hits])

  const toggleModule = (id: SearchModuleId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  const selectAll = () => setSelected([...ALL_MODULE_IDS])
  const clearModules = () => setSelected([ALL_MODULE_IDS[0]])

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find clients, contacts, deals, projects, and other CRM records in one place."
      />

      <Panel className="mb-4 px-4 py-4">
        <label htmlFor="global-search" className="block text-sm font-medium text-ink">
          Search query
        </label>
        <input
          id="global-search"
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email, deal, note text…"
          className="input-field mt-1 rounded-md"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
            Modules
          </span>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearModules}>
            Clients only
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SEARCH_MODULES.map((module) => {
            const active = selected.includes(module.id)
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => toggleModule(module.id)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-blue bg-blue/10 text-ink'
                    : 'border-line bg-surface-elevated text-ink-muted hover:bg-surface-muted'
                }`}
              >
                {module.label}
              </button>
            )
          })}
        </div>
      </Panel>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!query.trim() ? (
        <EmptyState
          title="Start typing to search"
          description="Results update as you type. Open a hit to jump into that module with the same query applied."
        />
      ) : loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Searching…</Panel>
      ) : searched && hits.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different term or enable more modules."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            {hits.length} result{hits.length === 1 ? '' : 's'} across {grouped.length} module
            {grouped.length === 1 ? '' : 's'}
          </p>
          {grouped.map((group) => (
            <Panel key={group.module} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">{group.label}</h2>
                  <Badge tone="neutral">{group.items.length}</Badge>
                </div>
                <Link
                  to={modulePath(group.module, query)}
                  className="text-xs font-medium text-blue hover:underline"
                >
                  Open module
                </Link>
              </div>
              <ul className="divide-y divide-line/70">
                {group.items.map((hit) => (
                  <li key={`${hit.module}-${hit.id}`}>
                    <Link
                      to={hit.href}
                      className="block px-4 py-3 transition-colors hover:bg-surface-muted/70"
                    >
                      <p className="font-medium text-ink">{hit.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {moduleLabel(hit.module)}
                        {hit.subtitle ? ` · ${hit.subtitle}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
