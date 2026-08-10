import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink-muted',
  brand: 'bg-blue/15 text-blue',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: BadgeTone
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
