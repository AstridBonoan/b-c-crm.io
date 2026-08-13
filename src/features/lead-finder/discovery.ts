/** Business discovery via OpenStreetMap Overpass (public data). No demo/fake results. */

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

const STATE_OSM_NAME: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

/** Common ZIP3 → state for NJ/NY border accuracy when OSM omits addr:state */
const ZIP3_TO_STATE: Record<string, string> = {
  '070': 'NJ',
  '071': 'NJ',
  '072': 'NJ',
  '073': 'NJ',
  '074': 'NJ',
  '075': 'NJ',
  '076': 'NJ',
  '077': 'NJ',
  '078': 'NJ',
  '079': 'NJ',
  '080': 'NJ',
  '081': 'NJ',
  '082': 'NJ',
  '083': 'NJ',
  '084': 'NJ',
  '085': 'NJ',
  '086': 'NJ',
  '087': 'NJ',
  '088': 'NJ',
  '089': 'NJ',
  '100': 'NY',
  '101': 'NY',
  '102': 'NY',
  '103': 'NY',
  '104': 'NY',
  '105': 'NY',
  '106': 'NY',
  '107': 'NY',
  '108': 'NY',
  '109': 'NY',
  '110': 'NY',
  '111': 'NY',
  '112': 'NY',
  '113': 'NY',
  '114': 'NY',
  '115': 'NY',
  '116': 'NY',
  '117': 'NY',
  '118': 'NY',
  '119': 'NY',
  '120': 'NY',
  '121': 'NY',
  '122': 'NY',
  '123': 'NY',
  '124': 'NY',
  '125': 'NY',
  '126': 'NY',
  '127': 'NY',
  '128': 'NY',
  '129': 'NY',
  '130': 'NY',
  '131': 'NY',
  '132': 'NY',
  '133': 'NY',
  '134': 'NY',
  '135': 'NY',
  '136': 'NY',
  '137': 'NY',
  '138': 'NY',
  '139': 'NY',
  '140': 'NY',
  '141': 'NY',
  '142': 'NY',
  '143': 'NY',
  '144': 'NY',
  '145': 'NY',
  '146': 'NY',
  '147': 'NY',
  '148': 'NY',
  '149': 'NY',
}

export function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return STATE_ALIASES[trimmed.toLowerCase()] ?? trimmed.toUpperCase().slice(0, 2)
}

function stateFromZip(zip: string | null | undefined): string | null {
  if (!zip) return null
  const digits = zip.replace(/\D/g, '')
  if (digits.length < 3) return null
  return ZIP3_TO_STATE[digits.slice(0, 3)] ?? null
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
): Promise<{ lat: number; lon: number }> {
  const stateCode = normalizeState(state) ?? state
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'us',
    addressdetails: '1',
  })
  if (zip) {
    params.set('postalcode', zip)
  } else {
    params.set('city', city)
    params.set('state', stateCode)
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'BC-Internal-CRM-LeadFinder/1.0 (internal use)',
    },
  })
  if (!res.ok) {
    throw new Error(`Location lookup failed (${res.status}). Try again in a moment.`)
  }

  const data = (await res.json()) as {
    lat: string
    lon: string
    address?: { state?: string; state_code?: string }
  }[]

  if (!data[0]) {
    throw new Error(
      `Could not find “${[city, stateCode].filter(Boolean).join(', ')}”. Check the city and state, then try again.`,
    )
  }

  const requested = normalizeState(state)
  if (requested && data[0].address) {
    const got = normalizeState(data[0].address.state_code || data[0].address.state)
    if (got && got !== requested) {
      throw new Error(
        `Location lookup resolved outside ${requested} (got ${got}). Refine city/state or ZIP.`,
      )
    }
  }

  return { lat: Number(data[0].lat), lon: Number(data[0].lon) }
}

function buildOverpassQuery(
  lat: number,
  lon: number,
  radiusMeters: number,
  tags: string[],
  stateCode: string | null,
) {
  const osmStateName = stateCode ? STATE_OSM_NAME[stateCode] : null
  const areaPreamble = osmStateName
    ? `area["name"="${osmStateName}"]["admin_level"="4"]["boundary"="administrative"]->.searchArea;`
    : ''
  const areaFilter = osmStateName ? `(area.searchArea)` : ''

  const tagFilters = tags
    .map((tag) => {
      const [k, v] = tag.split('=')
      return `node["${k}"="${v}"](around:${radiusMeters},${lat},${lon})${areaFilter};\nway["${k}"="${v}"](around:${radiusMeters},${lat},${lon})${areaFilter};`
    })
    .join('\n')

  return `
[out:json][timeout:30];
${areaPreamble}
(
${tagFilters}
);
out center tags 50;
`
}

/**
 * Keep only businesses that belong in the requested state.
 * Never invent "NJ" for a Queens address like Maspeth.
 */
function resolveLocation(
  tags: Record<string, string>,
  query: DiscoveryQuery,
): { city: string; state: string; zip: string | null; ok: boolean } {
  const requested = normalizeState(query.state)
  const taggedState = normalizeState(tags['addr:state'])
  const zip = tags['addr:postcode'] || query.zip || null
  const zipState = stateFromZip(zip)
  const taggedCity = tags['addr:city']?.trim() || null

  if (requested && taggedState && taggedState !== requested) {
    return { city: taggedCity || query.city, state: taggedState, zip, ok: false }
  }

  if (requested && zipState && zipState !== requested) {
    return { city: taggedCity || query.city, state: zipState, zip, ok: false }
  }

  const state = taggedState || zipState || requested || query.state
  const city = taggedCity || query.city

  if (
    requested &&
    !taggedState &&
    !zipState &&
    taggedCity &&
    taggedCity.toLowerCase() !== query.city.trim().toLowerCase()
  ) {
    return { city: taggedCity, state: requested, zip, ok: false }
  }

  return { city, state, zip, ok: true }
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

  const location = resolveLocation(tags, query)
  if (!location.ok) return null

  const lat = el.lat ?? el.center?.lat ?? null
  const lon = el.lon ?? el.center?.lon ?? null
  const address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null

  return {
    externalId: `osm-${el.type}-${el.id}`,
    businessName: name,
    industry: query.industry,
    category: query.category || tags.craft || tags.office || tags.shop || query.industry,
    address,
    city: location.city,
    state: location.state,
    zip: location.zip,
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
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

  const mapped = (json.elements ?? [])
    .map((el) => mapElement(el, query))
    .filter((b): b is DiscoveredBusiness => Boolean(b))

  const seen = new Set<string>()
  const unique = mapped.filter((b) => {
    const key = `${b.businessName.toLowerCase()}|${b.city.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const businesses = unique.slice(0, 40)

  if (businesses.length === 0) {
    const place = [query.city, stateCode || query.state].filter(Boolean).join(', ')
    return {
      businesses: [],
      warning: `No businesses found in OpenStreetMap for “${query.industry}” within ${query.radiusMiles} mi of ${place}. Try a broader industry, nearby city, or larger radius.`,
    }
  }

  return { businesses }
}
