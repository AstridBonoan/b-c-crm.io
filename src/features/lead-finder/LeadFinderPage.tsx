import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/useAuth'
import {
  getProspectSearch,
  listProspects,
  prospectGoogleSearchUrl,
  prospectsToCsv,
  runProspectSearch,
  type ProspectFilters,
} from '@/features/lead-finder/api'
import {
  prospectSearchSchema,
  type ProspectSearchFormValues,
} from '@/features/lead-finder/schemas'
import type { Prospect } from '@/features/lead-finder/types'
import {
  consumeLeadFinderFreshLogin,
  readLeadFinderSearchId,
  writeLeadFinderSearchId,
} from '@/features/lead-finder/session'

export function LeadFinderPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchFromUrl = searchParams.get('s')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProspectFilters>({
    search: '',
    industry: 'all',
    hasWebsite: 'all',
    sort: 'newest',
    searchId: null,
  })
  const [activeSearchLabel, setActiveSearchLabel] = useState<string | null>(null)
  const [sessionSearchId, setSessionSearchId] = useState<string | null>(null)
  const [showAllSearches, setShowAllSearches] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProspectSearchFormValues>({
    resolver: zodResolver(prospectSearchSchema),
    defaultValues: {
      industry: '',
      city: '',
      state: '',
      zip: '',
      radius_miles: undefined,
      requires_website: 'any',
      business_size: '',
    },
  })

  const load = async (nextFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      setProspects(await listProspects(nextFilters))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prospects')
    } finally {
      setLoading(false)
    }
  }

  const restoreSearch = async (searchId: string) => {
    setLoading(true)
    setError(null)
    try {
      const [search, rows] = await Promise.all([
        getProspectSearch(searchId),
        listProspects({
          search: '',
          industry: 'all',
          hasWebsite: 'all',
          sort: 'newest',
          searchId,
        }),
      ])
      setActiveSearchLabel(search.query_label)
      setSessionSearchId(search.id)
      setFilters({
        search: '',
        industry: 'all',
        hasWebsite: 'all',
        sort: 'newest',
        searchId: search.id,
      })
      setProspects(rows)
      reset({
        industry: search.industry ?? '',
        city: search.city ?? '',
        state: search.state ?? '',
        zip: search.zip ?? '',
        radius_miles: search.radius_miles != null ? Number(search.radius_miles) : undefined,
        requires_website:
          search.requires_website === true ? 'yes' : search.requires_website === false ? 'no' : 'any',
        business_size: search.business_size ?? '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore search')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (consumeLeadFinderFreshLogin()) {
      setSearchParams({}, { replace: true })
      return
    }
    if (searchFromUrl) {
      writeLeadFinderSearchId(searchFromUrl)
      void restoreSearch(searchFromUrl)
      return
    }
    const stored = readLeadFinderSearchId()
    if (stored) {
      setSearchParams({ s: stored }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFromUrl])

  const onSearch = handleSubmit(async (values) => {
    setSearching(true)
    setError(null)
    setWarning(null)
    setShowAllSearches(false)
    try {
      const result = await runProspectSearch(values, user?.id)
      setWarning(result.warning ?? null)
      setActiveSearchLabel(result.search.query_label)
      setSessionSearchId(result.search.id)
      const next = { ...filters, sort: 'newest' as const, searchId: result.search.id }
      setFilters(next)
      setProspects(result.prospects)
      writeLeadFinderSearchId(result.search.id)
      setSearchParams({ s: result.search.id }, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  })

  const applyFilters = async (patch: Partial<ProspectFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    if (!showAllSearches && !next.searchId) {
      setProspects([])
      return
    }
    await load(next)
  }

  const toggleShowAll = async () => {
    const nextShow = !showAllSearches
    setShowAllSearches(nextShow)
    if (nextShow) {
      const next = { ...filters, searchId: null }
      setFilters(next)
      await load(next)
      return
    }
    if (!sessionSearchId) {
      setProspects([])
      setFilters({ ...filters, searchId: null })
      return
    }
    const next = { ...filters, searchId: sessionSearchId }
    setFilters(next)
    await load(next)
  }

  const exportCsv = () => {
    const csv = prospectsToCsv(prospects)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lead-finder-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Lead Finder"
        description="Search local businesses and save prospects into the CRM. Both founders have full access."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={prospects.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Panel className="mb-4 px-4 py-4">
        <h2 className="text-sm font-semibold text-ink">Prospect search</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Live OpenStreetMap results only. Search is clipped to the city/borough boundary and
          state you enter — neighboring places like Maspeth are not included in a Brooklyn search.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={onSearch}>
          <div>
            <label className="text-xs font-medium text-ink-muted">Industry</label>
            <input className="input-field mt-1 rounded-md" {...register('industry')} />
            {errors.industry ? (
              <p className="mt-1 text-xs text-danger">{errors.industry.message}</p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">City/Borough</label>
            <input className="input-field mt-1 rounded-md" {...register('city')} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">State</label>
            <input className="input-field mt-1 rounded-md uppercase" maxLength={2} {...register('state')} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">ZIP</label>
            <input className="input-field mt-1 rounded-md" {...register('zip')} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Radius (miles)</label>
            <input
              type="number"
              min={1}
              max={50}
              className="input-field mt-1 rounded-md"
              {...register('radius_miles')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Website</label>
            <select className="input-field mt-1 rounded-md" {...register('requires_website')}>
              <option value="any">Any</option>
              <option value="yes">Has website found</option>
              <option value="no">No website found</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={searching} className="w-full">
              {searching ? 'Searching…' : 'Search prospects'}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => void applyFilters({ search: e.target.value })}
          placeholder="Filter by name, city/borough, industry…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select
          className="input-field rounded-md lg:w-auto"
          value={filters.hasWebsite}
          onChange={(e) =>
            void applyFilters({ hasWebsite: e.target.value as ProspectFilters['hasWebsite'] })
          }
        >
          <option value="all">Website: any</option>
          <option value="yes">Website found</option>
          <option value="no">Website unknown</option>
        </select>
        <select
          className="input-field rounded-md lg:w-auto"
          value={filters.sort}
          onChange={(e) =>
            void applyFilters({ sort: e.target.value as ProspectFilters['sort'] })
          }
        >
          <option value="newest">Newest</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <Button variant="secondary" type="button" onClick={() => void toggleShowAll()}>
          {showAllSearches ? 'Show latest search only' : 'Show all saved prospects'}
        </Button>
      </div>

      {activeSearchLabel && !showAllSearches ? (
        <p className="mb-3 text-xs text-ink-muted">Showing results for: {activeSearchLabel}</p>
      ) : null}

      {warning ? (
        <p
          role="status"
          className="mb-4 border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-ink"
        >
          {warning}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {loading || searching ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">
          {searching ? 'Discovering businesses…' : 'Loading prospects…'}
        </Panel>
      ) : prospects.length === 0 ? (
        <EmptyState
          title="No search yet"
          description="Run a search to find local businesses. Nothing is loaded until you search."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Website</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <Link to={`/lead-finder/${p.id}`} className="font-medium text-ink hover:underline">
                      {p.business_name}
                    </Link>
                    <p className="text-xs text-ink-muted">{p.industry}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {[p.city, p.state].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {p.website ? (
                      <a
                        href={p.website}
                        className="text-blue hover:underline"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit
                      </a>
                    ) : (
                      <a
                        href={prospectGoogleSearchUrl(p)}
                        className="text-ink-muted hover:underline"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="We don’t have a website on file. Search to confirm one."
                      >
                        Search to confirm
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  )
}
