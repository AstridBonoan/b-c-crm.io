import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-800',
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
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
