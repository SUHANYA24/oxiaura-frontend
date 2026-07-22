import { useParams } from 'react-router-dom'
import PagePlaceholder from '@/components/PagePlaceholder'

export default function AgreementView() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title="Agreement"
      phase="10"
      description="Full detail as a label/value list, the signed-token QR, inline PDF preview, and the download, email, and print actions."
    >
      <p className="mt-4 font-mono text-[13px] text-ink-400">agreement id: {id}</p>
    </PagePlaceholder>
  )
}
