/** Business discovery via OpenStreetMap Overpass (public data) + demo fallback. */

export type DiscoveryQuery = {
  industry: string
  category?: string
  city: string
  state: string
  zip?: string
  radiusMiles: number
  requiresWebsite?: boolean | null
}

export type DiscoveredBusiness = {
  externalId: string
  businessName: string
  industry: string
  category: string
  address: string | null
  city: string
  state: string
  zip: string | null
  phone: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
}

const INDUSTRY_OSM_TAGS: Record<string, string[]> = {
  construction: ['office=construction_company', 'craft=builder', 'craft=carpenter', 'craft=plumber'],
  hvac: ['craft=hvac', 'shop=hvac'],
  plumbing: ['craft=plumber'],
  electrical: ['craft=electrician'],
  landscaping: ['craft=gardener', 'shop=garden_centre'],
  roofing: ['craft=roofer'],
  restaurant: ['amenity=restaurant'],
  dental: ['amenity=dentist'],
  legal: ['office=lawyer'],
  accounting: ['office=accountant'],
  default: ['office=company', 'shop=yes'],
}

function tagsForIndustry(industry: string): string[] {
  const key = industry.trim().toLowerCase()
  for (const [name, tags] of Object.entries(INDUSTRY_OSM_TAGS)) {
    if (key.includes(name)) return tags
  }
  return INDUSTRY_OSM_TAGS.default
}

async function geocodeCity(
  city: string,
  state: string,
  zip?: string,
): Promise<{ lat: number; lon: number } | null> {
  const q = [zip, city, state, 'USA'].filter(Boolean).join(', ')
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'BC-Internal-CRM-LeadFinder/1.0 (internal use)',
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { lat: string; lon: string }[]
  if (!data[0]) return null
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) }
}

function buildOverpassQuery(lat: number, lon: number, radiusMeters: number, tags: string[]) {
  const tagFilters = tags
    .map((tag) => {
      const [k, v] = tag.split('=')
      return `node["${k}"="${v}"](around:${radiusMeters},${lat},${lon});\nway["${k}"="${v}"](around:${radiusMeters},${lat},${lon});`
    })
    .join('\n')
  return `
[out:json][timeout:25];
(
${tagFilters}
);
out center tags 40;
`
}

function mapElement(
  el: {
    id: number
    type: string
    lat?: number
    lon?: number
    center?: { lat: number; lon: number }
    tags?: Record<string, string>
  },
  query: DiscoveryQuery,
): DiscoveredBusiness | null {
  const tags = el.tags ?? {}
  const name = tags.name || tags.operator
  if (!name) return null
  const website = tags.website || tags['contact:website'] || null
  if (query.requiresWebsite === true && !website) return null
  if (query.requiresWebsite === false && website) return null

  const lat = el.lat ?? el.center?.lat ?? null
  const lon = el.lon ?? el.center?.lon ?? null
  const address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null

  return {
    externalId: `osm-${el.type}-${el.id}`,
    businessName: name,
    industry: query.industry,
    category: query.category || tags.craft || tags.office || tags.shop || query.industry,
    address,
    city: tags['addr:city'] || query.city,
    state: tags['addr:state'] || query.state,
    zip: tags['addr:postcode'] || query.zip || null,
    phone: tags.phone || tags['contact:phone'] || null,
    website,
    latitude: lat,
    longitude: lon,
  }
}

const DEMO_NEWARK_CONSTRUCTION: DiscoveredBusiness[] = [
  {
    externalId: 'demo-1',
    businessName: 'Ironbound Builders LLC',
    industry: 'Construction',
    category: 'General contractor',
    address: '200 Market St',
    city: 'Newark',
    state: 'NJ',
    zip: '07102',
    phone: '(973) 555-0142',
    website: 'http://example-builders-demo.test',
    latitude: 40.7357,
    longitude: -74.1724,
  },
  {
    externalId: 'demo-2',
    businessName: 'Garden State HVAC Pros',
    industry: 'HVAC',
    category: 'HVAC',
    address: '88 Raymond Blvd',
    city: 'Newark',
    state: 'NJ',
    zip: '07105',
    phone: '(973) 555-0198',
    website: null,
    latitude: 40.7282,
    longitude: -74.1549,
  },
  {
    externalId: 'demo-3',
    businessName: 'Essex County Roofing Co',
    industry: 'Construction',
    category: 'Roofing',
    address: '15 Ferry St',
    city: 'Newark',
    state: 'NJ',
    zip: '07105',
    phone: '(973) 555-0110',
    website: 'https://example.com',
    latitude: 40.7311,
    longitude: -74.1488,
  },
]

export async function discoverBusinesses(
  query: DiscoveryQuery,
): Promise<{ businesses: DiscoveredBusiness[]; source: 'overpass' | 'demo'; warning?: string }> {
  try {
    const center = await geocodeCity(query.city, query.state, query.zip)
    if (!center) {
      return {
        businesses: filterDemo(query),
        source: 'demo',
        warning: 'Geocoding failed — showing demo prospects for this area/industry.',
      }
    }

    const radiusMeters = Math.min(Math.max(query.radiusMiles, 1), 50) * 1609.34
    const tags = tagsForIndustry(query.industry || query.category || 'default')
    const body = buildOverpassQuery(center.lat, center.lon, radiusMeters, tags)
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(body)}`,
    })

    if (!res.ok) {
      return {
        businesses: filterDemo(query),
        source: 'demo',
        warning: `Overpass returned ${res.status} — showing demo prospects.`,
      }
    }

    const json = (await res.json()) as {
      elements: {
        id: number
        type: string
        lat?: number
        lon?: number
        center?: { lat: number; lon: number }
        tags?: Record<string, string>
      }[]
    }

    const mapped = json.elements
      .map((el) => mapElement(el, query))
      .filter((b): b is DiscoveredBusiness => Boolean(b))

    // Dedupe by name+city
    const seen = new Set<string>()
    const unique = mapped.filter((b) => {
      const key = `${b.businessName.toLowerCase()}|${b.city.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (unique.length === 0) {
      return {
        businesses: filterDemo(query),
        source: 'demo',
        warning: 'No OSM matches — showing demo prospects so you can test the workflow.',
      }
    }

    return { businesses: unique.slice(0, 40), source: 'overpass' }
  } catch (err) {
    return {
      businesses: filterDemo(query),
      source: 'demo',
      warning: err instanceof Error ? err.message : 'Discovery failed — using demo data.',
    }
  }
}

function filterDemo(query: DiscoveryQuery): DiscoveredBusiness[] {
  return DEMO_NEWARK_CONSTRUCTION.filter((b) => {
    if (query.requiresWebsite === true && !b.website) return false
    if (query.requiresWebsite === false && b.website) return false
    const hay = `${b.industry} ${b.category} ${b.city} ${b.state}`.toLowerCase()
    const needle = (query.industry || '').toLowerCase()
    if (needle && !hay.includes(needle.split(/\s+/)[0] ?? needle)) {
      // still return demos for UX when industry doesn't match
      return true
    }
    return true
  }).map((b) => ({
    ...b,
    city: query.city || b.city,
    state: query.state || b.state,
    industry: query.industry || b.industry,
  }))
}
