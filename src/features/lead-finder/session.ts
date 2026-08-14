const FRESH_LOGIN_KEY = 'lead-finder-fresh-login'
const SEARCH_ID_KEY = 'lead-finder-search-id'

export function markLeadFinderFreshLogin(): void {
  try {
    sessionStorage.setItem(FRESH_LOGIN_KEY, '1')
    sessionStorage.removeItem(SEARCH_ID_KEY)
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function consumeLeadFinderFreshLogin(): boolean {
  try {
    const fresh = sessionStorage.getItem(FRESH_LOGIN_KEY) === '1'
    if (fresh) sessionStorage.removeItem(FRESH_LOGIN_KEY)
    return fresh
  } catch {
    return false
  }
}

export function readLeadFinderSearchId(): string | null {
  try {
    return sessionStorage.getItem(SEARCH_ID_KEY)
  } catch {
    return null
  }
}

export function writeLeadFinderSearchId(id: string): void {
  try {
    sessionStorage.setItem(SEARCH_ID_KEY, id)
  } catch {
    // Ignore private-mode storage failures.
  }
}
