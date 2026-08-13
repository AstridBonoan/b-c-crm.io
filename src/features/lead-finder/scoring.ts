/** Deterministic B&C Opportunity Score — rule-based, no AI. */

export type ScoreWeights = {
  websiteQuality: number
  mobileExperience: number
  seo: number
  performance: number
  onlinePresence: number
  leadGeneration: number
}

export const SCORE_WEIGHTS: ScoreWeights = {
  websiteQuality: 30,
  mobileExperience: 20,
  seo: 15,
  performance: 15,
  onlinePresence: 10,
  leadGeneration: 10,
}

export type FindingSeverity = 'info' | 'warning' | 'critical'

export type ProspectFinding = {
  id: string
  severity: FindingSeverity
  area: string
  message: string
}

export type ScoreLine = {
  key: keyof ScoreWeights
  label: string
  max: number
  earned: number
  reasons: string[]
}

export type OpportunityScoreResult = {
  total: number
  band: 'low' | 'moderate' | 'good' | 'high'
  lines: ScoreLine[]
  findings: ProspectFinding[]
  recommendedServices: string[]
}

export type AuditSignals = {
  hasWebsite: boolean
  https?: boolean
  httpStatus?: number | null
  hasTitle?: boolean
  hasMetaDescription?: boolean
  hasH1?: boolean
  hasViewport?: boolean
  hasContactForm?: boolean
  hasPhoneOnPage?: boolean
  hasEmailOnPage?: boolean
  hasCta?: boolean
  hasContactPage?: boolean
  robotsTxtFound?: boolean
  sitemapFound?: boolean
  imagesMissingAlt?: number
  pageBytes?: number | null
  fetchSucceeded?: boolean
}

export type PresenceSignals = {
  googleBusinessUrl?: string | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  linkedinUrl?: string | null
  yelpUrl?: string | null
}

function bandFor(total: number): OpportunityScoreResult['band'] {
  if (total >= 80) return 'high'
  if (total >= 60) return 'good'
  if (total >= 40) return 'moderate'
  return 'low'
}

function clamp(n: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(n)))
}

export function scoreBandLabel(band: OpportunityScoreResult['band']): string {
  if (band === 'high') return 'High opportunity'
  if (band === 'good') return 'Good opportunity'
  if (band === 'moderate') return 'Moderate opportunity'
  return 'Low opportunity'
}

export function computeOpportunityScore(
  audit: AuditSignals,
  presence: PresenceSignals = {},
): OpportunityScoreResult {
  const findings: ProspectFinding[] = []
  const push = (severity: FindingSeverity, area: string, message: string) => {
    findings.push({
      id: `${area}-${findings.length + 1}`,
      severity,
      area,
      message,
    })
  }

  // Website quality (30)
  let websiteEarned = 0
  const websiteReasons: string[] = []
  if (!audit.hasWebsite) {
    push('critical', 'Website', 'No website found')
    websiteReasons.push('No website (−30)')
  } else if (audit.fetchSucceeded === false) {
    websiteEarned = 8
    push('warning', 'Website', 'Website could not be fully analyzed (fetch blocked or failed)')
    websiteReasons.push('Website exists but analysis incomplete (+8)')
  } else {
    websiteEarned += 10
    websiteReasons.push('Website present (+10)')
    if (audit.https) {
      websiteEarned += 8
      websiteReasons.push('HTTPS enabled (+8)')
    } else {
      push('critical', 'Technical', 'Site is not using HTTPS')
      websiteReasons.push('Missing HTTPS (−8)')
    }
    if (audit.httpStatus && audit.httpStatus >= 200 && audit.httpStatus < 400) {
      websiteEarned += 6
      websiteReasons.push(`HTTP ${audit.httpStatus} OK (+6)`)
    } else if (audit.httpStatus) {
      push('critical', 'Technical', `HTTP status ${audit.httpStatus}`)
      websiteReasons.push(`Bad HTTP status (−6)`)
    }
    if (audit.hasContactPage) {
      websiteEarned += 6
      websiteReasons.push('Contact page detected (+6)')
    } else {
      push('warning', 'Conversion', 'No clear contact page detected')
    }
  }
  websiteEarned = clamp(websiteEarned, SCORE_WEIGHTS.websiteQuality)

  // Mobile (20)
  let mobileEarned = 0
  const mobileReasons: string[] = []
  if (!audit.hasWebsite) {
    mobileReasons.push('No website to evaluate')
  } else if (audit.hasViewport) {
    mobileEarned = 20
    mobileReasons.push('Mobile viewport meta tag present (+20)')
  } else if (audit.fetchSucceeded !== false) {
    push('critical', 'Mobile', 'Missing mobile viewport meta tag')
    mobileReasons.push('Missing viewport (−20)')
  } else {
    mobileEarned = 5
    mobileReasons.push('Incomplete analysis (+5)')
  }
  mobileEarned = clamp(mobileEarned, SCORE_WEIGHTS.mobileExperience)

  // SEO (15)
  let seoEarned = 0
  const seoReasons: string[] = []
  if (!audit.hasWebsite) {
    seoReasons.push('No website to evaluate')
  } else {
    if (audit.hasTitle) {
      seoEarned += 4
      seoReasons.push('Page title present (+4)')
    } else {
      push('critical', 'SEO', 'Missing page title')
    }
    if (audit.hasMetaDescription) {
      seoEarned += 4
      seoReasons.push('Meta description present (+4)')
    } else {
      push('warning', 'SEO', 'Missing meta description')
    }
    if (audit.hasH1) {
      seoEarned += 3
      seoReasons.push('H1 heading present (+3)')
    } else {
      push('warning', 'SEO', 'Missing H1 heading')
    }
    if (audit.robotsTxtFound) {
      seoEarned += 2
      seoReasons.push('robots.txt found (+2)')
    }
    if (audit.sitemapFound) {
      seoEarned += 2
      seoReasons.push('sitemap found (+2)')
    }
    if ((audit.imagesMissingAlt ?? 0) > 0) {
      push('warning', 'Accessibility', `${audit.imagesMissingAlt} images missing alt text`)
      seoEarned = Math.max(0, seoEarned - 2)
      seoReasons.push('Images missing alt (−2)')
    }
  }
  seoEarned = clamp(seoEarned, SCORE_WEIGHTS.seo)

  // Performance (15) — lightweight heuristics from page size / status
  let performanceEarned = 0
  const performanceReasons: string[] = []
  if (!audit.hasWebsite) {
    performanceReasons.push('No website to evaluate')
  } else if (audit.pageBytes != null) {
    if (audit.pageBytes < 500_000) {
      performanceEarned = 15
      performanceReasons.push('HTML payload under 500KB (+15)')
    } else if (audit.pageBytes < 1_500_000) {
      performanceEarned = 10
      performanceReasons.push('HTML payload moderate (+10)')
      push('warning', 'Performance', 'Large page payload may hurt load time')
    } else {
      performanceEarned = 4
      performanceReasons.push('Very large page payload (+4)')
      push('critical', 'Performance', 'Very large page payload')
    }
  } else if (audit.fetchSucceeded === false) {
    performanceEarned = 4
    performanceReasons.push('Incomplete analysis (+4)')
  } else {
    performanceEarned = 8
    performanceReasons.push('Status available; size unknown (+8)')
  }
  performanceEarned = clamp(performanceEarned, SCORE_WEIGHTS.performance)

  // Online presence (10)
  let presenceEarned = 0
  const presenceReasons: string[] = []
  const profiles = [
    ['Google Business', presence.googleBusinessUrl],
    ['Facebook', presence.facebookUrl],
    ['Instagram', presence.instagramUrl],
    ['LinkedIn', presence.linkedinUrl],
    ['Yelp', presence.yelpUrl],
  ] as const
  const found = profiles.filter(([, url]) => Boolean(url))
  presenceEarned = clamp(found.length * 2, SCORE_WEIGHTS.onlinePresence)
  if (found.length === 0) {
    push('warning', 'Online presence', 'No public social/directory profiles detected')
    presenceReasons.push('No profiles found')
  } else {
    presenceReasons.push(`${found.length} profile(s) found (+${presenceEarned})`)
  }
  for (const [label, url] of profiles) {
    if (!url) push('info', 'Online presence', `No ${label} profile found`)
  }

  // Lead generation (10)
  let leadEarned = 0
  const leadReasons: string[] = []
  if (!audit.hasWebsite) {
    push('critical', 'Lead generation', 'No website for lead capture')
    leadReasons.push('No website')
  } else {
    if (audit.hasContactForm) {
      leadEarned += 4
      leadReasons.push('Contact/quote form detected (+4)')
    } else {
      push('critical', 'Lead generation', 'No contact form detected')
    }
    if (audit.hasPhoneOnPage || audit.hasEmailOnPage) {
      leadEarned += 3
      leadReasons.push('Phone or email on page (+3)')
    } else {
      push('warning', 'Lead generation', 'No phone or email detected on page')
    }
    if (audit.hasCta) {
      leadEarned += 3
      leadReasons.push('CTA button detected (+3)')
    } else {
      push('warning', 'Lead generation', 'No clear CTA buttons detected')
    }
  }
  leadEarned = clamp(leadEarned, SCORE_WEIGHTS.leadGeneration)

  const lines: ScoreLine[] = [
    {
      key: 'websiteQuality',
      label: 'Website Quality',
      max: SCORE_WEIGHTS.websiteQuality,
      earned: websiteEarned,
      reasons: websiteReasons,
    },
    {
      key: 'mobileExperience',
      label: 'Mobile Experience',
      max: SCORE_WEIGHTS.mobileExperience,
      earned: mobileEarned,
      reasons: mobileReasons,
    },
    {
      key: 'seo',
      label: 'SEO',
      max: SCORE_WEIGHTS.seo,
      earned: seoEarned,
      reasons: seoReasons,
    },
    {
      key: 'performance',
      label: 'Performance',
      max: SCORE_WEIGHTS.performance,
      earned: performanceEarned,
      reasons: performanceReasons,
    },
    {
      key: 'onlinePresence',
      label: 'Online Presence',
      max: SCORE_WEIGHTS.onlinePresence,
      earned: presenceEarned,
      reasons: presenceReasons,
    },
    {
      key: 'leadGeneration',
      label: 'Lead Generation',
      max: SCORE_WEIGHTS.leadGeneration,
      earned: leadEarned,
      reasons: leadReasons,
    },
  ]

  const total = clamp(
    lines.reduce((sum, line) => sum + line.earned, 0),
    100,
  )

  const recommendedServices = recommendServices(findings, audit)

  return {
    total,
    band: bandFor(total),
    lines,
    findings,
    recommendedServices,
  }
}

function recommendServices(findings: ProspectFinding[], audit: AuditSignals): string[] {
  const services = new Set<string>()
  const text = findings.map((f) => f.message.toLowerCase()).join(' ')

  if (!audit.hasWebsite || text.includes('no website')) {
    services.add('Website design / new website')
  }
  if (text.includes('https') || text.includes('viewport') || text.includes('redesign')) {
    services.add('Website redesign')
  }
  if (text.includes('meta') || text.includes('title') || text.includes('h1') || text.includes('sitemap')) {
    services.add('SEO optimization')
  }
  if (text.includes('instagram') || text.includes('facebook') || text.includes('google business') || text.includes('profile')) {
    services.add('Online Presence Setup & Optimization')
  }
  if (text.includes('contact form') || text.includes('cta') || text.includes('lead capture')) {
    services.add('Contact / quote system')
  }
  if (text.includes('booking') || text.includes('custom')) {
    services.add('Custom web application')
  }
  if (services.size === 0 && audit.hasWebsite) {
    services.add('Website optimization consultation')
  }
  return [...services]
}
