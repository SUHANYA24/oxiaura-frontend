import { useParams } from 'react-router-dom'
import PagePlaceholder from '@/components/PagePlaceholder'

export default function KPITracker() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title="KPI tracker"
      phase="12"
      description="Target versus actual rings, the trend chart, and the period breakdown for one employee."
    >
      <p className="mt-4 font-mono text-[13px] text-ink-400">employee id: {id}</p>
    </PagePlaceholder>
  )
}
