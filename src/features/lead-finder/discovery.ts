/** Business discovery via OpenStreetMap Overpass + Nominatim. No demo/fake results. */

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

export type DiscoveryResult = {
  businesses: DiscoveredBusiness[]
  /** Soft notice (e.g. zero matches). Hard failures throw. */
  warning?: string
}

const USER_AGENT = 'BC-Internal-CRM-LeadFinder/1.0 (internal use)'

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

const STATE_ALIASES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
}

export function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return STATE_ALIASES[trimmed.toLowerCase()] ?? trimmed.toUpperCase().slice(0, 2)
}

function tagsForIndustry(industry: string): string[] {
  const key = industry.trim().toLowerCase()
  for (const [name, tags] of Object.entries(INDUSTRY_OSM_TAGS)) {
    if (key.includes(name)) return tags
  }
  return INDUSTRY_OSM_TAGS.default
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

type OsmElement = {
  id: number
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function geocodeCity(
  city: string,
  state: string,
  zip?: string,
): Promise<{ lat: number; lon: number }> {
  const stateCode = normalizeState(state) ?? state
  // Free-form query is more reliable than structured city= + state= for US places.
  const q = zip
    ? `${zip}, ${stateCode}, USA`
    : `${city}, ${stateCode}, USA`
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'us',
    addressdetails: '1',
    q,
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  })
  if (!res.ok) {
    throw new Error(`Location lookup failed (${res.status}). Try again in a moment.`)
  }

  const data = (await res.json()) as {
    lat: string
    lon: string
    address?: { state?: string; 'ISO3166-2-lvl4'?: string }
  }[]

  if (!data[0]) {
    throw new Error(
      `Could not find “${[city, stateCode].filter(Boolean).join(', ')}”. Check the city and state, then try again.`,
    )
  }

  const requested = normalizeState(state)
  if (requested && data[0].address) {
    const iso = data[0].address['ISO3166-2-lvl4']?.split('-')[1]
    const got = normalizeState(iso || data[0].address.state)
    if (got && got !== requested) {
      throw new Error(
        `Location lookup resolved outside ${requested} (got ${got}). Refine city/state or ZIP.`,
      )
    }
  }

  return { lat: Number(data[0].lat), lon: Number(data[0].lon) }
}

/**
 * Intersect radius with the US state polygon (ISO3166-2), so NJ searches
 * cannot return Queens / Maspeth even when they fall inside the radius.
 */
function buildOverpassQuery(
  lat: number,
  lon: number,
  radiusMeters: number,
  tags: string[],
  stateCode: string | null,
) {
  const areaPreamble = stateCode
    ? `area["ISO3166-2"="US-${stateCode}"]->.searchArea;`
    : ''
  const areaFilter = stateCode ? `(area.searchArea)` : ''

  const tagFilters = tags
    .map((tag) => {
      const [k, v] = tag.split('=')
      return [
        `node["${k}"="${v}"](around:${Math.round(radiusMeters)},${lat},${lon})${areaFilter};`,
        `way["${k}"="${v}"](around:${Math.round(radiusMeters)},${lat},${lon})${areaFilter};`,
      ].join('\n')
    })
    .join('\n')

  return `
[out:json][timeout:30];
${areaPreamble}
(
${tagFilters}
);
out center tags 60;
`
}

type NominatimLookup = {
  osmType: string
  osmId: number
  city: string | null
  town: string | null
  village: string | null
  borough: string | null
  municipality: string | null
  cityDistrict: string | null
  suburb: string | null
  neighbourhood: string | null
  state: string | null
  zip: string | null
  road: string | null
  houseNumber: string | null
  website: string | null
  wikidata: string | null
}

function normalizePlaceName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(city|town|village|borough|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cityMatchNames(city: string): string[] {
  const n = normalizePlaceName(city)
  const aliases: Record<string, string[]> = {
    brooklyn: ['brooklyn', 'kings'],
    queens: ['queens'],
    manhattan: ['manhattan'],
    bronx: ['bronx'],
    'staten island': ['staten island', 'richmond'],
    nyc: ['new york', 'nyc'],
    'new york': ['new york', 'nyc'],
    'new york city': ['new york', 'nyc'],
  }
  return aliases[n] ?? [n]
}

function localityMatches(requestedCity: string, candidates: (string | null | undefined)[]): boolean {
  const aliases = cityMatchNames(requestedCity)
  for (const candidate of candidates) {
    if (!candidate) continue
    const n = normalizePlaceName(candidate)
    if (aliases.includes(n)) return true
  }
  return false
}

function matchesRequestedCity(
  requestedCity: string,
  place: NominatimLookup | undefined,
  tags: Record<string, string>,
): boolean {
  const official = [
    place?.city,
    place?.town,
    place?.village,
    place?.borough,
    place?.municipality,
    place?.cityDistrict,
    tags['addr:city'],
    tags['addr:town'],
    tags['addr:municipality'],
  ]
  if (localityMatches(requestedCity, official)) return true
  // Neighborhoods only match when the user searched that name (e.g. Maspeth).
  return localityMatches(requestedCity, [
    place?.suburb,
    place?.neighbourhood,
    tags['addr:suburb'],
    tags['addr:place'],
  ])
}

function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null
  let value = raw.trim().split(/\s+/)[0] ?? ''
  if (!value) return null
  // Social/directory links are not company websites for this product.
  if (
    /(?:^|\.)((facebook|instagram|twitter|x|yelp|linkedin|tiktok)\.com)/i.test(value)
  ) {
    return null
  }
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  try {
    const url = new URL(value)
    if (!url.hostname.includes('.')) return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function websiteFromOsmTags(tags: Record<string, string>): string | null {
  for (const key of ['website', 'contact:website', 'url', 'contact:url', 'website:en']) {
    const website = normalizeWebsite(tags[key])
    if (website) return website
  }
  return null
}

function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(
      /\b(llc|inc|incorporated|corp|corporation|co|company|ltd|limited|plc|llp|pllc|&)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeBusinessName(a)
  const nb = normalizeBusinessName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const ta = new Set(na.split(' ').filter((t) => t.length > 2))
  const tb = new Set(nb.split(' ').filter((t) => t.length > 2))
  if (ta.size === 0 || tb.size === 0) return false
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter += 1
  return inter / Math.max(ta.size, tb.size) >= 0.6
}

async function websiteFromWikidata(wikidataId: string | null | undefined): Promise<string | null> {
  if (!wikidataId || !/^Q\d+$/i.test(wikidataId)) return null
  try {
    const res = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId.toUpperCase()}.json`,
      { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
    )
    if (!res.ok) return null
    const json = (await res.json()) as {
      entities?: Record<
        string,
        { claims?: { P856?: { mainsnak?: { datavalue?: { value?: string } } }[] } }
      >
    }
    const entity = json.entities?.[wikidataId.toUpperCase()]
    const official = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value
    return normalizeWebsite(official)
  } catch {
    return null
  }
}

async function websiteFromClearbit(businessName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(businessName)}`,
    )
    if (!res.ok) return null
    const rows = (await res.json()) as { name?: string; domain?: string }[]
    for (const row of rows.slice(0, 5)) {
      if (!row.domain || !row.name) continue
      if (!namesLikelyMatch(businessName, row.name)) continue
      const website = normalizeWebsite(row.domain)
      if (website) return website
    }
    return null
  } catch {
    return null
  }
}

async function enrichWebsite(
  businessName: string,
  tags: Record<string, string>,
  place: NominatimLookup | undefined,
): Promise<string | null> {
  const fromOsm = websiteFromOsmTags(tags) || place?.website
  if (fromOsm) return fromOsm

  const fromWiki = await websiteFromWikidata(place?.wikidata || tags.wikidata)
  if (fromWiki) return fromWiki

  return websiteFromClearbit(businessName)
}

/**
 * Authoritative place names from Nominatim — never invent the search city/state
 * onto a business that merely sat inside a radius circle.
 */
async function lookupPlaces(elements: OsmElement[]): Promise<Map<string, NominatimLookup>> {
  const map = new Map<string, NominatimLookup>()
  if (elements.length === 0) return map

  const prefix = (type: string) => {
    if (type === 'node') return 'N'
    if (type === 'way') return 'W'
    return 'R'
  }

  const ids = elements.map((el) => `${prefix(el.type)}${el.id}`)
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const params = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      osm_ids: chunk.join(','),
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/lookup?${params.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    })
    if (!res.ok) continue

    const rows = (await res.json()) as {
      osm_type: string
      osm_id: number
      address?: Record<string, string>
      extratags?: Record<string, string>
    }[]

    for (const row of rows) {
      const addr = row.address ?? {}
      const extra = row.extratags ?? {}
      const iso = addr['ISO3166-2-lvl4']?.split('-')[1]
      const state = normalizeState(iso || addr.state)
      const key = `${row.osm_type[0]?.toUpperCase() ?? ''}${row.osm_id}`
      map.set(key, {
        osmType: row.osm_type,
        osmId: row.osm_id,
        city: addr.city || null,
        town: addr.town || null,
        village: addr.village || null,
        borough: addr.borough || null,
        municipality: addr.municipality || null,
        cityDistrict: addr.city_district || null,
        suburb: addr.suburb || null,
        neighbourhood: addr.neighbourhood || addr.hamlet || null,
        state,
        zip: addr.postcode ?? null,
        road: addr.road ?? null,
        houseNumber: addr.house_number ?? null,
        website: websiteFromOsmTags(extra) || normalizeWebsite(extra.website),
        wikidata: extra.wikidata || null,
      })
    }

    if (i + 40 < ids.length) {
      await new Promise((r) => setTimeout(r, 1100))
    }
  }

  return map
}

function osmKey(el: OsmElement): string {
  const p = el.type === 'node' ? 'N' : el.type === 'way' ? 'W' : 'R'
  return `${p}${el.id}`
}

function mapElement(
  el: OsmElement,
  query: DiscoveryQuery,
  center: { lat: number; lon: number },
  place: NominatimLookup | undefined,
  website: string | null,
): DiscoveredBusiness | null {
  const tags = el.tags ?? {}
  const name = tags.name || tags.operator
  if (!name) return null

  if (query.requiresWebsite === true && !website) return null
  if (query.requiresWebsite === false && website) return null

  const lat = el.lat ?? el.center?.lat ?? null
  const lon = el.lon ?? el.center?.lon ?? null
  if (lat == null || lon == null) return null

  if (haversineMiles(center.lat, center.lon, lat, lon) > query.radiusMiles + 0.5) {
    return null
  }

  const requested = normalizeState(query.state)
  const state = place?.state || normalizeState(tags['addr:state'])
  if (requested && state && state !== requested) return null
  if (requested && !state) return null
  if (!matchesRequestedCity(query.city, place, tags)) return null

  const city = query.city.trim()

  const zip = place?.zip || tags['addr:postcode'] || null
  const addressFromPlace = [place?.houseNumber, place?.road].filter(Boolean).join(' ') || null
  const addressFromTags =
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null

  return {
    externalId: `osm-${el.type}-${el.id}`,
    businessName: name,
    industry: query.industry,
    category: query.category || tags.craft || tags.office || tags.shop || query.industry,
    address: addressFromPlace || addressFromTags,
    city,
    state: requested || state!,
    zip,
    phone: tags.phone || tags['contact:phone'] || null,
    website,
    latitude: lat,
    longitude: lon,
  }
}

export async function discoverBusinesses(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const stateCode = normalizeState(query.state)
  const center = await geocodeCity(query.city, query.state, query.zip)

  const radiusMeters = Math.min(Math.max(query.radiusMiles, 1), 50) * 1609.34
  const tags = tagsForIndustry(query.industry || query.category || 'default')
  const body = buildOverpassQuery(center.lat, center.lon, radiusMeters, tags, stateCode)

  let res: Response
  try {
    res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: `data=${encodeURIComponent(body)}`,
    })
  } catch {
    throw new Error(
      'Could not reach the business directory service (OpenStreetMap Overpass). Check your connection and try again.',
    )
  }

  if (!res.ok) {
    throw new Error(
      `Business directory search failed (${res.status}). The public map service may be busy — try again shortly.`,
    )
  }

  const json = (await res.json()) as { elements?: OsmElement[] }
  const elements = (json.elements ?? []).filter((el) => el.tags?.name || el.tags?.operator)

  const places = await lookupPlaces(elements)

  const mapped: DiscoveredBusiness[] = []
  for (const el of elements) {
    const place = places.get(osmKey(el))
    const tags = el.tags ?? {}
    const name = tags.name || tags.operator
    if (!name) continue
    const website = await enrichWebsite(name, tags, place)
    const business = mapElement(el, query, center, place, website)
    if (business) mapped.push(business)
  }

  const seen = new Set<string>()
  const unique = mapped.filter((b) => {
    const key = `${b.businessName.toLowerCase()}|${b.city.toLowerCase()}|${b.state}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const businesses = unique.slice(0, 40)

  if (businesses.length === 0) {
    const place = [query.city, stateCode || query.state].filter(Boolean).join(', ')
    return {
      businesses: [],
      warning: `No businesses found in OpenStreetMap for “${query.industry}” in ${place} within ${query.radiusMiles} mi. Results must match that city and state. Try a nearby city or larger radius.`,
    }
  }

  return { businesses }
}
