import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, Button, Card, ErrorState, Input, Modal, Skeleton } from '@/components/ui'
import QRDisplay from '@/components/QRDisplay'
import PDFViewer from '@/components/PDFViewer'
import agreementService, {
  computeMaturity,
  SUPPORTS_AGREEMENT_EMAIL,
  USING_MOCK_AGREEMENTS,
} from '@/services/agreementService'
import { AGREEMENT_STATUS } from '@/utils/constants'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'

/** Label/value row separated by a hairline rule, the detail-list convention. */
function DetailRow({ label, children, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-ink-200 py-3 last:border-b-0">
      <dt className="meta-label">{label}</dt>
      <dd
        className={cn(
          'text-right',
          emphasis ? 'font-display text-[22px] leading-none tabular-nums text-ink-950' : 'text-body text-ink-950',
        )}
      >
        {children}
      </dd>
    </div>
  )
}

/** Save a blob to disk via a transient object URL (mirrors the download flow in FraudReport). */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function AgreementView() {
  const { id } = useParams()

  const [agreement, setAgreement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // The PDF blob is loaded once and its object URL shared by the inline
  // preview and the print action; the ref lets us revoke the old URL on reload.
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfStatus, setPdfStatus] = useState('loading') // loading | ready | error
  const [pdfError, setPdfError] = useState(null)
  const pdfUrlRef = useRef(null)
  const printFrameRef = useRef(null)

  const [downloading, setDownloading] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAgreement(await agreementService.get(id))
    } catch (err) {
      setError(err?.message ?? 'Could not load this agreement.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadPdf = useCallback(async () => {
    setPdfStatus('loading')
    setPdfError(null)
    try {
      const { blob } = await agreementService.downloadPdf(id)
      const url = URL.createObjectURL(blob)
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = url
      setPdfUrl(url)
      setPdfStatus('ready')
    } catch (err) {
      setPdfError(err?.message ?? 'Could not load the document preview.')
      setPdfStatus('error')
    }
  }, [id])

  useEffect(() => {
    load()
    loadPdf()
  }, [load, loadPdf])

  // Revoke the object URL when the view unmounts.
  useEffect(() => () => pdfUrlRef.current && URL.revokeObjectURL(pdfUrlRef.current), [])

  const onDownload = async () => {
    setDownloading(true)
    try {
      const { blob, filename } = await agreementService.downloadPdf(id)
      saveBlob(blob, filename)
      toast.success('Agreement downloaded.')
    } catch (err) {
      toast.error(err?.message ?? 'Could not download the agreement.')
    } finally {
      setDownloading(false)
    }
  }

  const onPrint = () => {
    if (!pdfUrl) {
      toast.error('The document is still loading.')
      return
    }
    const frame = printFrameRef.current
    if (!frame) return
    frame.onload = () => {
      try {
        frame.contentWindow.focus()
        frame.contentWindow.print()
      } catch {
        window.open(pdfUrl, '_blank', 'noopener')
      }
    }
    frame.src = pdfUrl
  }

  const onSendEmail = async () => {
    setSending(true)
    try {
      await agreementService.email(id, recipient.trim())
      toast.success(`Agreement emailed to ${recipient.trim()}.`)
      setEmailOpen(false)
      setRecipient('')
    } catch (err) {
      toast.error(err?.message ?? 'Could not email the agreement.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-page-enter">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-40" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-96 w-full" rounded="rounded-card" />
          <Skeleton className="h-72 w-full" rounded="rounded-card" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-page-enter">
        <ErrorState description={error} onRetry={load} />
      </div>
    )
  }

  const meta = AGREEMENT_STATUS[agreement.status] ?? { label: agreement.status, variant: 'neutral' }
  const maturity = computeMaturity(
    agreement.investment_amount,
    agreement.duration_months,
    agreement.interest_rate,
  )

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-[20px] tabular-nums text-ink-950">{agreement.agreement_number}</h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="mt-1.5 text-body text-ink-600">
            {agreement.customer?.full_name ?? `Customer #${agreement.customer_id}`}
            {agreement.customer?.customer_code && (
              <>
                {' · '}
                <Link
                  to={`/customers/${agreement.customer_id}`}
                  className="font-mono text-[13px] underline underline-offset-2 hover:text-ink-950"
                >
                  {agreement.customer.customer_code}
                </Link>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onPrint}>
            Print
          </Button>
          {/* There is no POST /agreements/{id}/email. Hiding the action beats
              offering a send that could only report a lie. */}
          {SUPPORTS_AGREEMENT_EMAIL && (
            <Button variant="secondary" onClick={() => setEmailOpen(true)}>
              Email
            </Button>
          )}
          <Button variant="primary" onClick={onDownload} loading={downloading}>
            Download PDF
          </Button>
        </div>
      </header>

      {USING_MOCK_AGREEMENTS && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the PDF and QR token are generated in the service layer only.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card title="Agreement details">
            <dl>
              <DetailRow label="Agreement number">
                <span className="font-mono text-[13px]">{agreement.agreement_number}</span>
              </DetailRow>
              <DetailRow label="Customer">
                {agreement.customer?.full_name ?? `Customer #${agreement.customer_id}`}
              </DetailRow>
              {agreement.product_type && <DetailRow label="Product">{agreement.product_type}</DetailRow>}
              <DetailRow label="Investment amount" emphasis>
                {formatCurrency(agreement.investment_amount)}
              </DetailRow>
              <DetailRow label="Duration">
                <span className="tabular-nums">{agreement.duration_months} months</span>
              </DetailRow>
              <DetailRow label="Interest rate">
                <span className="tabular-nums">{agreement.interest_rate}% p.a.</span>
              </DetailRow>
              <DetailRow label="Maturity value" emphasis>
                {formatCurrency(maturity)}
              </DetailRow>
              {agreement.signing_date && (
                <DetailRow label="Signing date">{formatDate(agreement.signing_date)}</DetailRow>
              )}
              <DetailRow label="Signed at">
                {agreement.signed_at ? formatDateTime(agreement.signed_at) : 'Not yet signed'}
              </DetailRow>
            </dl>
          </Card>

          <Card title="Document" description="A preview of the generated agreement PDF.">
            <PDFViewer src={pdfUrl} loading={pdfStatus === 'loading'} error={pdfError} onRetry={loadPdf} />
          </Card>
        </div>

        <aside>
          <Card title="Verification">
            <QRDisplay token={agreement.qr_code_token} />
          </Card>
        </aside>
      </div>

      <Modal
        open={emailOpen && SUPPORTS_AGREEMENT_EMAIL}
        onClose={() => !sending && setEmailOpen(false)}
        title="Email agreement"
        description="Send the signed PDF to the customer or a colleague."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmailOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSendEmail}
              loading={sending}
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())}
            >
              Send
            </Button>
          </>
        }
      >
        <Input
          label="Recipient email"
          type="email"
          required
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="customer@example.com"
        />
      </Modal>

      {/* Off-screen frame used only to drive the browser print dialog for the PDF. */}
      <iframe ref={printFrameRef} title="Print agreement" className="hidden" aria-hidden="true" />
    </div>
  )
}
