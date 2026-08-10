import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Panel className="border-dashed px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  )
}
