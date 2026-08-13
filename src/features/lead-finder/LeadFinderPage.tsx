import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/useAuth'
import {
  listProspects,
  prospectsToCsv,
  runProspectSearch,
  type ProspectFilters,
} from '@/features/lead-finder/api'
import {
  prospectSearchSchema,
  type ProspectSearchFormValues,
} from '@/features/lead-finder/schemas'
import { scoreBandLabel } from '@/features/lead-finder/scoring'
import type { Prospect } from '@/features/lead-finder/types'

function bandFromScore(score: number) {
  if (score >= 80) return 'high'
  if (score >= 60) return 'good'
  if (score >= 40) return 'moderate'
  return 'low'
}

function toneForScore(score: number): 'success' | 'brand' | 'neutral' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 60) return 'brand'
  if (score >= 40) return 'neutral'
  return 'danger'
}

export function LeadFinderPage() {
  const { user } = useAuth()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProspectFilters>({
    search: '',
    industry: 'all',
    minOpportunity: 'all',
    hasWebsite: 'all',
    hasContactForm: 'all',
    service: 'all',
    sort: 'opportunity_desc',
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProspectSearchFormValues>({
    resolver: zodResolver(prospectSearchSchema),
    defaultValues: {
      industry: 'Construction',
      category: '',
      city: 'Newark',
      state: 'NJ',
      zip: '',
      radius_miles: 25,
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

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearch = handleSubmit(async (values) => {
    setSearching(true)
    setError(null)
    setWarning(null)
    try {
      const result = await runProspectSearch(values, user?.id)
      setWarning(result.warning ?? null)
      await load({ ...filters, sort: 'opportunity_desc' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  })

  const applyFilters = async (patch: Partial<ProspectFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    await load(next)
  }

  const services = useMemo(() => {
    const set = new Set<string>()
    for (const p of prospects) for (const s of p.recommended_services) set.add(s)
    return [...set].sort()
  }, [prospects])

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
        description="Search local businesses, score websites with deterministic rules, and save high-opportunity prospects into the CRM. Both founders have full access."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={prospects.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Panel className="mb-4 px-4 py-4">
        <h2 className="text-sm font-semibold text-ink">Prospect search</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Example: Construction companies within 25 miles of Newark, NJ. Uses public OpenStreetMap
          data; falls back to demo prospects if the live query is empty.
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
            <label className="text-xs font-medium text-ink-muted">Category</label>
            <input className="input-field mt-1 rounded-md" {...register('category')} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">City</label>
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
              <option value="yes">Has website</option>
              <option value="no">No website</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={searching} className="w-full">
              {searching ? 'Searching & scoring…' : 'Search prospects'}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => void applyFilters({ search: e.target.value })}
          placeholder="Filter by name, city, industry…"
          className="input-field rounded-md lg:max-w-sm"
        />
        <select
          className="input-field rounded-md lg:w-auto"
          value={String(filters.minOpportunity)}
          onChange={(e) =>
            void applyFilters({
              minOpportunity: e.target.value === 'all' ? 'all' : Number(e.target.value),
            })
          }
        >
          <option value="all">All scores</option>
          <option value="80">High (80+)</option>
          <option value="60">Good (60+)</option>
          <option value="40">Moderate (40+)</option>
        </select>
        <select
          className="input-field rounded-md lg:w-auto"
          value={filters.hasWebsite}
          onChange={(e) =>
            void applyFilters({ hasWebsite: e.target.value as ProspectFilters['hasWebsite'] })
          }
        >
          <option value="all">Website: any</option>
          <option value="yes">Has website</option>
          <option value="no">No website</option>
        </select>
        <select
          className="input-field rounded-md lg:w-auto"
          value={filters.sort}
          onChange={(e) =>
            void applyFilters({ sort: e.target.value as ProspectFilters['sort'] })
          }
        >
          <option value="opportunity_desc">Highest opportunity</option>
          <option value="website_asc">Worst website score</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <select
          className="input-field rounded-md lg:w-auto"
          value={filters.service}
          onChange={(e) => void applyFilters({ service: e.target.value })}
        >
          <option value="all">All services</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {warning ? (
        <p className="mb-4 border border-line bg-surface-muted px-3 py-2 text-sm text-ink">{warning}</p>
      ) : null}
      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading || searching ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">
          {searching ? 'Discovering businesses and scoring…' : 'Loading prospects…'}
        </Panel>
      ) : prospects.length === 0 ? (
        <EmptyState
          title="No prospects yet"
          description="Run a search like “Construction within 25 miles of Newark, NJ” to populate Lead Finder."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Opportunity</th>
                <th className="px-4 py-3 font-semibold">Website</th>
                <th className="px-4 py-3 font-semibold">Services</th>
                <th className="px-4 py-3 font-semibold">Status</th>
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
                    <p className="text-xs text-ink-muted">{p.industry ?? p.category}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {[p.city, p.state].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={toneForScore(p.opportunity_score)}>
                      {p.opportunity_score} · {scoreBandLabel(bandFromScore(p.opportunity_score))}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {p.has_website ? `Score ${p.website_score}` : 'No website'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {p.recommended_services.slice(0, 2).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.saved_to_crm ? 'success' : 'neutral'}>
                      {p.saved_to_crm ? 'In CRM' : p.pipeline_status}
                    </Badge>
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
