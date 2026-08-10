import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Syncs module list search with the `q` URL query param. */
export function useSearchQuery(): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''

  const setSearch = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const trimmed = value.trimStart()
          if (trimmed) next.set('q', trimmed)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [search, setSearch]
}
