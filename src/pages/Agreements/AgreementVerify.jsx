import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui'
import agreementService from '@/services/agreementService'
import { AGREEMENT_STATUS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

/**
 * The PUBLIC QR landing page — no layout, no auth, no sidebar. Anyone scanning
 * an agreement's QR code lands here on a logged-out browser, so it stands alone:
 * a single centred card on ink.50. The result carries the only colour on the
 * page — state.ok for a genuine agreement, state.danger for a tampered or
 * unknown token — with the summary shown only on success.
 */

/** A verdict marker: the sole splash of colour, sized to read as the answer. */
function Verdict({ ok, children }) {
  const tone = ok
    ? 'border-state-ok-border bg-state-ok-bg text-state-ok'
    : 'border-state-danger-border bg-state-danger-bg text-state-danger'
  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full border ${tone}`}
        aria-hidden="true"
      >
        {ok ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <p className="mt-4 font-display text-[26px] leading-none text-ink-950">{children}</p>
    </div>
  )
}

/** Label/value row for the public summary — hairline rules, like the detail view. */
function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-ink-200 py-3 last:border-b-0">
      <dt className="meta-label">{label}</dt>
      <dd className="text-right text-body text-ink-950">{children}</dd>
    </div>
  )
}

export default function AgreementVerify() {
  const { token } = useParams()

  const [status, setStatus] = useState('checking') // checking | valid | invalid | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const check = useCallback(async () => {
    setStatus('checking')
    setError(null)
    try {
      const data = await agreementService.verifyByToken(token)
      setResult(data)
      setStatus(data?.valid ? 'valid' : 'invalid')
    } catch (err) {
      setError(err?.message ?? 'Could not reach the verification service.')
      setStatus('error')
    }
  }, [token])

  useEffect(() => {
    check()
  }, [check])

  const meta = result?.status
    ? AGREEMENT_STATUS[result.status] ?? { label: result.status, variant: 'neutral' }
    : null

  return (
    // Public page, rendered outside AppLayout — it owns the <main> landmark.
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-md animate-page-enter">
        <p className="mb-6 text-center font-display text-[28px] leading-none text-ink-950">Plantvest</p>

        <div className="card p-8">
          {status === 'checking' && (
            <div className="flex flex-col items-center py-6 text-center">
              <span
                className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-950"
                aria-hidden="true"
              />
              <p className="mt-4 text-body text-ink-600">Verifying this agreement…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4 text-center">
              <p className="text-body text-ink-600">{error}</p>
              <button
                type="button"
                onClick={check}
                className="mt-3 text-body font-medium text-ink-950 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {status === 'invalid' && (
            <>
              <Verdict ok={false}>Not verified</Verdict>
              <p className="mt-4 text-center text-body text-ink-600">
                {result?.reason ?? 'This verification link is invalid or has been tampered with.'}
              </p>
            </>
          )}

          {status === 'valid' && (
            <>
              <Verdict ok>Authentic agreement</Verdict>
              <p className="mt-4 text-center text-body text-ink-600">
                This is a genuine agreement issued by Plantvest.
              </p>

              <dl className="mt-6">
                <Row label="Agreement number">
                  <span className="font-mono text-[13px]">{result.agreement_number}</span>
                </Row>
                <Row label="Customer">{result.customer_name}</Row>
                <Row label="Investment amount">
                  <span className="tabular-nums">Rs {result.investment_amount}</span>
                </Row>
                <Row label="Duration">
                  <span className="tabular-nums">{result.duration_months} months</span>
                </Row>
                {meta && (
                  <Row label="Status">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Row>
                )}
                <Row label="Signed">
                  {result.signed_at ? formatDate(result.signed_at) : 'Not yet signed'}
                </Row>
              </dl>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-400">
          Scan any Plantvest agreement QR code to check its authenticity.
        </p>
      </div>
    </main>
  )
}
