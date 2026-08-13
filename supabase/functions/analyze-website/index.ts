// Supabase Edge Function: fetch a website and return audit signals (avoids browser CORS).
// Deploy: supabase functions deploy analyze-website

function analyzeHtml(websiteUrl: string, html: string, httpStatus: number) {
  const lower = html.toLowerCase()
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? []
  const imagesMissingAlt = imgTags.filter((tag) => !/\balt\s*=/i.test(tag)).length
  let https = false
  try {
    https = new URL(websiteUrl).protocol === 'https:'
  } catch {
    https = websiteUrl.startsWith('https://')
  }

  return {
    hasWebsite: true,
    https,
    httpStatus,
    hasTitle: /<title[^>]*>\s*[^<]+<\/title>/i.test(html),
    hasMetaDescription: /<meta[^>]+name=["']description["'][^>]*>/i.test(html),
    hasH1: /<h1\b/i.test(html),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasContactForm:
      /<form\b/i.test(html) &&
      (lower.includes('contact') ||
        lower.includes('quote') ||
        lower.includes('message') ||
        lower.includes('inquiry')),
    hasPhoneOnPage: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(html),
    hasEmailOnPage: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html),
    hasCta:
      /<(a|button)\b[^>]*>[^<]*(contact|quote|call|get started|book|schedule|request)[^<]*<\/(a|button)>/i.test(
        html,
      ),
    hasContactPage:
      /href=["'][^"']*contact[^"']*["']/i.test(html) || lower.includes('contact us'),
    imagesMissingAlt,
    pageBytes: new TextEncoder().encode(html).length,
    fetchSucceeded: true as boolean,
    robotsTxtFound: undefined as boolean | undefined,
    sitemapFound: undefined as boolean | undefined,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { url } = (await req.json()) as { url?: string }
    if (!url) {
      return Response.json({ error: 'url required' }, { status: 400 })
    }

    let normalized = url.trim()
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(normalized, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'BC-LeadFinder-Analyzer/1.0' },
    })
    clearTimeout(timer)

    const html = await res.text()
    const signals = analyzeHtml(normalized, html, res.status)

    const robotsUrl = new URL('/robots.txt', normalized).toString()
    const sitemapUrl = new URL('/sitemap.xml', normalized).toString()
    const [robotsRes, sitemapRes] = await Promise.all([
      fetch(robotsUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null),
      fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null),
    ])

    signals.robotsTxtFound = Boolean(robotsRes?.ok)
    signals.sitemapFound = Boolean(sitemapRes?.ok)

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const metaMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    )

    return Response.json(
      {
        signals,
        title: titleMatch?.[1]?.trim() ?? null,
        metaDescription: metaMatch?.[1]?.trim() ?? null,
      },
      {
        headers: { 'Access-Control-Allow-Origin': '*' },
      },
    )
  } catch (err) {
    return Response.json(
      {
        signals: { hasWebsite: true, fetchSucceeded: false },
        title: null,
        metaDescription: null,
        error: err instanceof Error ? err.message : 'Analyze failed',
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }
})
