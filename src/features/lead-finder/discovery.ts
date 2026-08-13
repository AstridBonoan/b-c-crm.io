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

type GeocodeResult = {
  lat: number
  lon: number
  osmType: string
  osmId: number
  areaName: string
}

function overpassAreaId(osmType: string, osmId: number): number | null {
  if (osmType === 'relation') return 3_600_000_000 + osmId
  if (osmType === 'way') return 2_400_000_000 + osmId
  return null
}

function escapeOverpassString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

async function geocodeCity(
  city: string,
  state: string,
  zip?: string,
): Promise<GeocodeResult> {
  const stateCode = normalizeState(state) ?? state
  const q = zip
    ? `${city}, ${zip}, ${stateCode}, USA`
    : `${city}, ${stateCode}, USA`
  const params = new URLSearchParams({
    format: 'json',
    limit: '8',
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
    osm_type?: string
    osm_id?: number
    class?: string
    type?: string
    display_name?: string
    address?: {
      state?: string
      'ISO3166-2-lvl4'?: string
      city?: string
      town?: string
      village?: string
      borough?: string
      municipality?: string
      county?: string
    }
  }[]

  if (!data[0]) {
    throw new Error(
      `Could not find “${[city, stateCode].filter(Boolean).join(', ')}”. Check the city/borough and state, then try again.`,
    )
  }

  const requested = normalizeState(state)
  const inState = data.filter((row) => {
    if (!requested || !row.address) return true
    const iso = row.address['ISO3166-2-lvl4']?.split('-')[1]
    const got = normalizeState(iso || row.address.state)
    return !got || got === requested
  })
  const pool = inState.length > 0 ? inState : data

  const prefer =
    pool.find(
      (row) =>
        row.osm_type === 'relation' &&
        (row.class === 'boundary' || row.type === 'administrative' || row.class === 'place'),
    ) ??
    pool.find((row) => row.osm_type === 'relation') ??
    pool[0]

  if (requested && prefer.address) {
    const iso = prefer.address['ISO3166-2-lvl4']?.split('-')[1]
    const got = normalizeState(iso || prefer.address.state)
    if (got && got !== requested) {
      throw new Error(
        `Location lookup resolved outside ${requested} (got ${got}). Refine city/borough or ZIP.`,
      )
    }
  }

  if (!prefer.osm_id || !prefer.osm_type) {
    throw new Error(
      `Could not resolve a map boundary for “${[city, stateCode].filter(Boolean).join(', ')}”.`,
    )
  }

  const areaName =
    prefer.address?.borough ||
    prefer.address?.city ||
    prefer.address?.town ||
    prefer.address?.village ||
    prefer.address?.municipality ||
    city.trim()

  return {
    lat: Number(prefer.lat),
    lon: Number(prefer.lon),
    osmType: prefer.osm_type,
    osmId: prefer.osm_id,
    areaName,
  }
}

/**
 * Search inside the city/borough polygon and the state polygon.
 * Radius only limits how far from the city center, still inside that city.
 */
function buildOverpassQuery(
  center: GeocodeResult,
  radiusMeters: number,
  tags: string[],
  stateCode: string | null,
) {
  const areaId = overpassAreaId(center.osmType, center.osmId)
  const cityArea = areaId
    ? `area(${areaId})->.city;`
    : `area["name"="${escapeOverpassString(center.areaName)}"]["boundary"="administrative"]->.city;`
  const stateArea = stateCode ? `area["ISO3166-2"="US-${stateCode}"]->.state;` : ''
  const stateFilter = stateCode ? '(area.state)' : ''

  const tagFilters = tags
    .map((tag) => {
      const [k, v] = tag.split('=')
      return [
        `node["${k}"="${v}"](area.city)${stateFilter}(around:${Math.round(radiusMeters)},${center.lat},${center.lon});`,
        `way["${k}"="${v}"](area.city)${stateFilter}(around:${Math.round(radiusMeters)},${center.lat},${center.lon});`,
      ].join('\n')
    })
    .join('\n')

  return `
[out:json][timeout:30];
${stateArea}
${cityArea}
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
    .replace(/\b(the|city|town|village|borough|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const NYC_BOROUGHS = new Set(['brooklyn', 'queens', 'manhattan', 'bronx', 'staten island'])

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

function isGenericNycName(raw: string): boolean {
  const n = normalizePlaceName(raw)
  return n === 'new york' || n === 'nyc'
}

/** Drop only when tags name a *different* city/borough. Trust the map polygon otherwise. */
function conflictsWithRequestedCity(
  requestedCity: string,
  place: NominatimLookup | undefined,
  tags: Record<string, string>,
): boolean {
  const official = [
    place?.borough,
    place?.city,
    place?.town,
    place?.village,
    place?.municipality,
    tags['addr:city'],
    tags['addr:town'],
    tags['addr:municipality'],
  ].filter((value): value is string => Boolean(value))

  if (official.length === 0) return false
  if (localityMatches(requestedCity, official)) return false

  const requested = normalizePlaceName(requestedCity)
  if (NYC_BOROUGHS.has(requested) && official.every(isGenericNycName)) return false

  return true
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

/** Only use a URL attached to this map listing — never guess from a similar company name. */
async function enrichWebsite(
  tags: Record<string, string>,
  place: NominatimLookup | undefined,
): Promise<string | null> {
  const fromOsm = websiteFromOsmTags(tags) || place?.website
  if (fromOsm) return fromOsm

  return websiteFromWikidata(place?.wikidata || tags.wikidata)
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
  center: GeocodeResult,
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
  if (conflictsWithRequestedCity(query.city, place, tags)) return null

  return {
    externalId: `osm-${el.type}-${el.id}`,
    businessName: name,
    industry: query.industry,
    category: query.category || tags.craft || tags.office || tags.shop || query.industry,
    address:
      [place?.houseNumber, place?.road].filter(Boolean).join(' ') ||
      [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') ||
      null,
    city: query.city.trim(),
    state: requested || state || query.state.toUpperCase(),
    zip: place?.zip || tags['addr:postcode'] || null,
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
  const body = buildOverpassQuery(center, radiusMeters, tags, stateCode)

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
    const website = await enrichWebsite(tags, place)
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
      warning: `No businesses found in OpenStreetMap for “${query.industry}” in ${place} within ${query.radiusMiles} mi. Results must match that city/borough and state. Try a nearby city/borough or larger radius.`,
    }
  }

  return { businesses }
}
