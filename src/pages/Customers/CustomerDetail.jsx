import { useParams } from 'react-router-dom'
import PagePlaceholder from '@/components/PagePlaceholder'

export default function CustomerDetail() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title="Customer"
      phase="7"
      description="Profile header with the status badge, then underline tabs for documents, agreements, and proposals, plus quick actions."
    >
      <p className="mt-4 font-mono text-[13px] text-ink-400">customer id: {id}</p>
    </PagePlaceholder>
  )
}
