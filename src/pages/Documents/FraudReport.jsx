import { useParams } from 'react-router-dom'
import PagePlaceholder from '@/components/PagePlaceholder'

export default function FraudReport() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title="Fraud report"
      phase="9"
      description="Document preview beside the analysis panel: ELA, CNN, and Siamese sub-scores, the aggregate verdict, duplicate matches, and the approve or reject action."
    >
      <p className="mt-4 font-mono text-[13px] text-ink-400">document id: {id}</p>
    </PagePlaceholder>
  )
}
