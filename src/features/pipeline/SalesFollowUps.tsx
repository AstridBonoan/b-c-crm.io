import { Link } from 'react-router-dom'
import { Panel } from '@/components/ui/Panel'
import type { DealWithRelations } from '@/features/pipeline/api'
import { isFollowUpOverdue, isOpenStage } from '@/features/pipeline/schemas'
import type { TaskWithRelations } from '@/features/tasks/api'

export type SalesFollowItem = {
  id: string
  when: string
  title: string
  dealName: string
  bucket: 'overdue' | 'today' | 'upcoming'
}

function bucketForDate(due: string, today: string): SalesFollowItem['bucket'] {
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return 'upcoming'
}

function buildSalesFollowItems(
  deals: DealWithRelations[],
  tasks: TaskWithRelations[],
): Record<SalesFollowItem['bucket'], SalesFollowItem[]> {
  const today = new Date().toISOString().slice(0, 10)
  const items: SalesFollowItem[] = []

  for (const deal of deals) {
    if (!deal.next_follow_up_at || !isOpenStage(deal.stage)) continue
    const due = deal.next_follow_up_at.slice(0, 10)
    items.push({
      id: `deal-${deal.id}`,
      when: due,
      title: deal.next_action?.trim() || 'Deal follow-up',
      dealName: deal.clients?.name ? `${deal.clients.name} — ${deal.name}` : deal.name,
      bucket: isFollowUpOverdue(deal, today) ? 'overdue' : bucketForDate(due, today),
    })
  }

  for (const task of tasks) {
    if (!task.due_date) continue
    const due = task.due_date.slice(0, 10)
    items.push({
      id: `task-${task.id}`,
      when: due,
      title: task.title,
      dealName: task.deals?.name ?? 'Deal task',
      bucket: bucketForDate(due, today),
    })
  }

  const sortItems = (list: SalesFollowItem[]) =>
    [...list].sort((a, b) => a.when.localeCompare(b.when)).slice(0, 6)

  return {
    overdue: sortItems(items.filter((item) => item.bucket === 'overdue')),
    today: sortItems(items.filter((item) => item.bucket === 'today')),
    upcoming: sortItems(items.filter((item) => item.bucket === 'upcoming')),
  }
}

export function SalesFollowUps({
  deals,
  tasks,
}: {
  deals: DealWithRelations[]
  tasks: TaskWithRelations[]
}) {
  const groups = buildSalesFollowItems(deals, tasks)
  const empty = groups.overdue.length + groups.today.length + groups.upcoming.length === 0
  if (empty) return null

  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-3">
      <FollowColumn title="Overdue" items={groups.overdue} warn />
      <FollowColumn title="Today" items={groups.today} />
      <FollowColumn title="Upcoming" items={groups.upcoming} />
    </div>
  )
}

function FollowColumn({
  title,
  items,
  warn = false,
}: {
  title: string
  items: SalesFollowItem[]
  warn?: boolean
}) {
  return (
    <Panel className="px-4 py-3">
      <p className={`text-[11px] font-semibold tracking-[0.1em] uppercase ${warn ? 'text-danger' : 'text-ink-muted'}`}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">None</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-sm text-ink">{item.dealName}</p>
              <p className="text-xs text-ink-muted">
                {item.title} · {item.when}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link to="/tasks" className="mt-3 inline-block text-xs font-medium text-blue hover:underline">
        Open tasks
      </Link>
    </Panel>
  )
}
