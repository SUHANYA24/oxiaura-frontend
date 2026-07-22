import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui'

/**
 * STUB. The public QR landing page — no layout, no auth, no sidebar. Anyone
 * scanning an agreement's QR code lands here, so it must render for a logged
 * out browser. Phase 10 calls agreementService.verifyByToken and swaps this for
 * the valid (state.ok) or invalid (state.danger) result.
 */
export default function AgreementVerify() {
  const { token } = useParams()

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-md animate-page-enter">
        <p className="mb-6 text-center font-display text-[28px] leading-none text-ink-950">Plantvest</p>

        <Card>
          <p className="meta-label">Agreement verification</p>
          <p className="mt-3 text-body text-ink-800">
            This public route is wired. Token checking lands in{' '}
            <span className="font-mono text-[13px] text-ink-950">Phase 10</span>.
          </p>
          <p className="mt-4 break-all font-mono text-[13px] text-ink-400">token: {token}</p>
        </Card>
      </div>
    </div>
  )
}
