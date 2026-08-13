import type { AuditSignals } from '@/features/lead-finder/scoring'

/** Parse HTML + lightweight URL checks into audit signals (deterministic). */
export function analyzeHtml(websiteUrl: string, html: string, httpStatus: number): AuditSignals {
  const lower = html.toLowerCase()
  const hasTitle = /<title[^>]*>\s*[^<]+<\/title>/i.test(html)
  const hasMetaDescription = /<meta[^>]+name=["']description["'][^>]*>/i.test(html)
  const hasH1 = /<h1\b/i.test(html)
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const hasContactForm =
    /<form\b/i.test(html) &&
    (lower.includes('contact') ||
      lower.includes('quote') ||
      lower.includes('message') ||
      lower.includes('inquiry') ||
      lower.includes('enquire'))
  const hasPhoneOnPage = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(html)
  const hasEmailOnPage = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html)
  const hasCta =
    /<(a|button)\b[^>]*>[^<]*(contact|quote|call|get started|book|schedule|request)[^<]*<\/(a|button)>/i.test(
      html,
    )
  const hasContactPage =
    /href=["'][^"']*contact[^"']*["']/i.test(html) || lower.includes('contact us')

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
    hasTitle,
    hasMetaDescription,
    hasH1,
    hasViewport,
    hasContactForm,
    hasPhoneOnPage,
    hasEmailOnPage,
    hasCta,
    hasContactPage,
    imagesMissingAlt,
    pageBytes: new TextEncoder().encode(html).length,
    fetchSucceeded: true,
    robotsTxtFound: undefined,
    sitemapFound: undefined,
  }
}

export type AnalyzeWebsiteResult = {
  signals: AuditSignals
  title: string | null
  metaDescription: string | null
  error?: string
}

/**
 * Prefer Supabase Edge Function `analyze-website` (avoids browser CORS).
 * Falls back to a "website exists but unanalyzed" signal if invoke fails.
 */
export async function analyzeWebsiteUrl(
  websiteUrl: string,
  invoke?: (name: string, body: { url: string }) => Promise<{ data: unknown; error: Error | null }>,
): Promise<AnalyzeWebsiteResult> {
  if (!websiteUrl.trim()) {
    return {
      signals: { hasWebsite: false, fetchSucceeded: false },
      title: null,
      metaDescription: null,
    }
  }

  let normalized = websiteUrl.trim()
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`

  if (invoke) {
    try {
      const { data, error } = await invoke('analyze-website', { url: normalized })
      if (!error && data && typeof data === 'object') {
        const payload = data as {
          signals?: AuditSignals
          title?: string | null
          metaDescription?: string | null
          error?: string
        }
        if (payload.signals) {
          return {
            signals: payload.signals,
            title: payload.title ?? null,
            metaDescription: payload.metaDescription ?? null,
            error: payload.error,
          }
        }
      }
    } catch {
      // fall through
    }
  }

  // Without edge function: mark website present but incomplete analysis.
  return {
    signals: {
      hasWebsite: true,
      https: normalized.startsWith('https://'),
      fetchSucceeded: false,
    },
    title: null,
    metaDescription: null,
    error:
      'Full HTML analysis needs the analyze-website Edge Function (CORS). Website presence still counted.',
  }
}
