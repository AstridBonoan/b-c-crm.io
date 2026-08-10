import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

type ModulePlaceholderProps = {
  title: string
  description: string
  branchName: string
}

export function ModulePlaceholderPage({
  title,
  description,
  branchName,
}: ModulePlaceholderProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${title} module not built yet`}
        description={`This area is reserved for the ${title.toLowerCase()} feature. Develop it on branch ${branchName}, then merge to main via pull request.`}
      />
    </div>
  )
}
