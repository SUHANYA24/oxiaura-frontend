import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, Button, Card, ConfirmModal, ErrorState, Modal, Skeleton, Textarea } from '@/components/ui'
import FraudScoreBadge from '@/components/FraudScoreBadge'
import FraudScoreBar from '@/components/FraudScoreBar'
import { useAuth } from '@/hooks/useAuth'
import documentService, { USING_MOCK_DOCUMENTS } from '@/services/documentService'
import { DOC_TYPES, fraudVerdict, ROLES, VERIFICATION_STATUS } from '@/utils/constants'
import { formatDateTime, formatRelative } from '@/utils/formatters'
import { cn } from '@/utils/cn'

const DOC_LABELS = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t.label]))

// The three fraud sub-stages: how to read each raw number, its per-stage
// severity (each score is on its own scale), and a plain-language note on what
// it detects. The dot colour is a redundant cue — every row states its score.
const STAGES = [
  {
    key: 'ela_score',
    label: 'ELA analysis',
    format: (v) => Number(v).toFixed(2),
    severity: (v) => (v < 15 ? 'ok' : v < 30 ? 'warn' : 'danger'),
    explain:
      'Error Level Analysis compares compression artefacts across the image. Uniform levels suggest an untouched original; bright, uneven regions can mark edited or spliced areas.',
  },
  {
    key: 'cnn_fraud_score',
    label: 'CNN forgery check',
    format: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    severity: (v) => (v < 0.4 ? 'ok' : v < 0.7 ? 'warn' : 'danger'),
    explain:
      'A convolutional network trained on genuine and forged documents estimates how likely this document was digitally manipulated.',
  },
  {
    key: 'siamese_similarity',
    label: 'Siamese duplicate match',
    format: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    severity: (v) => (v < 0.5 ? 'ok' : v < 0.8 ? 'warn' : 'danger'),
    explain:
      'Measures visual similarity against documents already on file. A high score means this document closely resembles one previously submitted.',
  },
]
const DOT = { ok: 'bg-state-ok', warn: 'bg-state-warn', danger: 'bg-state-danger' }
const PANEL_TINT = {
  ok: 'border-state-ok-border bg-state-ok-bg',
  warn: 'border-state-warn-border bg-state-warn-bg',
  danger: 'border-state-danger-border bg-state-danger-bg',
}
const VERDICT_TEXT = { ok: 'text-state-ok', warn: 'text-state-warn', danger: 'text-state-danger' }

/** One sub-score: severity dot, stage name, score in the display serif, note. */
function StageRow({ stage, value }) {
  const variant = stage.severity(Number(value) || 0)
  return (
    <div className="flex gap-3 border-b border-ink-200 py-4 last:border-b-0">
      <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', DOT[variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-body font-medium text-ink-950">{stage.label}</p>
          <span className="font-display text-[22px] leading-none tabular-nums text-ink-950">
            {stage.format(value)}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{stage.explain}</p>
      </div>
    </div>
  )
}

/** A compact document tile — used for both sides of a duplicate match. */
function DocTile({ document: d, caption, to }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="meta-label">{caption}</span>
        <span className="font-mono text-[11px] tabular-nums text-ink-400">
          #{d.document_id ?? d.id}
        </span>
      </div>
      <p className="mt-2 text-body font-medium text-ink-950">{DOC_LABELS[d.doc_type] ?? d.doc_type}</p>
      <p className="mt-0.5 truncate font-mono text-[13px] text-ink-400">
        {d.file_name ?? `doc-${d.document_id ?? d.id}`}
      </p>
      <p className="mt-0.5 text-[13px] text-ink-400">{formatRelative(d.uploaded_at)}</p>
    </>
  )
  const base = 'block rounded-control border border-ink-200 bg-white p-4'
  return to ? (
    <Link to={to} className={cn(base, 'transition-colors duration-150 ease-out hover:bg-ink-100')}>
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  )
}

/** Label/value row for the document preview panel. */
function PreviewRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="meta-label">{label}</dt>
      <dd className="min-w-0 truncate text-right text-body text-ink-950">{children}</dd>
    </div>
  )
}
export default function FraudReport() {
  const { id } = useParams()
  const { role } = useAuth()
  const isAdmin = role === ROLES.ADMIN

  const [doc, setDoc] = useState(null)
  const [fraud, setFraud] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [meta, report] = await Promise.all([
        documentService.get(id),
        documentService.fraudReport(id),
      ])
      setDoc(meta)
      setFraud(report)
    } catch (err) {
      setError(err?.message ?? 'Could not load this fraud report.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const decide = async (decision, decisionReason) => {
    setSubmitting(true)
    try {
      const updated = await documentService.verify(doc.id, { decision, reason: decisionReason })
      setDoc((prev) => ({ ...prev, verification_status: updated.verification_status }))
      toast.success(decision === 'verified' ? 'Document approved.' : 'Document rejected.')
      setApproveOpen(false)
      setRejectOpen(false)
      setReason('')
    } catch (err) {
      toast.error(err?.message ?? 'Could not update the document.')
    } finally {
      setSubmitting(false)
    }
  }

  const onDownload = async () => {
    setDownloading(true)
    try {
      const { blob, filename } = await documentService.downloadReport(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded.')
    } catch (err) {
      toast.error(err?.message ?? 'Could not download the report.')
    } finally {
      setDownloading(false)
    }
  }
  if (loading) {
    return (
      <div className="animate-page-enter">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-6 h-28 w-full" rounded="rounded-card" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <Skeleton className="h-64 w-full" rounded="rounded-card" />
          <Skeleton className="h-64 w-full" rounded="rounded-card" />
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

  const aggregate = Number(fraud.aggregate_score) || 0
  const { variant } = fraudVerdict(aggregate)
  const statusMeta = VERIFICATION_STATUS[doc.verification_status] ?? VERIFICATION_STATUS.pending
  const duplicate = fraud.duplicate_match
  const decided = doc.verification_status !== 'pending'

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">Fraud report</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-body text-ink-600">
            <span className="font-mono text-[13px] tabular-nums">#{doc.id}</span>
            <span aria-hidden="true">·</span>
            <span>{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</span>
            <span aria-hidden="true">·</span>
            <Link
              to={`/customers/${doc.customer_id}`}
              className="underline underline-offset-2 hover:text-ink-950"
            >
              Customer #{doc.customer_id}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          <Button variant="secondary" onClick={onDownload} loading={downloading}>
            Download report
          </Button>
        </div>
      </header>

      {USING_MOCK_DOCUMENTS && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the fraud sub-scores and duplicate match are mocked in the service layer only.
        </p>
      )}

      {/* The aggregate verdict — the single strongest colour moment in the app.
          Its border and fill take the severity tint; everything else stays
          monochrome so this lands. */}
      <div className={cn('mt-6 rounded-card border p-6', PANEL_TINT[variant])}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <span className={cn('font-display text-stat leading-none tabular-nums', VERDICT_TEXT[variant])}>
              {aggregate.toFixed(1)}
            </span>
            <div>
              <div className="meta-label">Aggregate fraud score</div>
              <div className="mt-1.5">
                <FraudScoreBadge score={Math.round(aggregate)} />
              </div>
            </div>
          </div>
          <div className="max-w-sm">
            <FraudScoreBar score={Math.round(aggregate)} />
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              {fraud.flag_reason ??
                (fraud.is_flagged
                  ? 'This document was flagged for manual review.'
                  : 'No manipulation or duplication signals crossed the review threshold.')}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Document preview alongside the analysis panel. */}
        <aside>
          <Card title="Document">
            <div className="flex aspect-[4/3] items-center justify-center rounded-control border border-ink-200 bg-ink-50 text-ink-300">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                <path d="M12 5h13l8 8v26H12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M25 5v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-3 text-center text-[13px] text-ink-400">
              Preview unavailable in sample data
            </p>
            <dl className="mt-4 space-y-3 border-t border-ink-200 pt-4">
              <PreviewRow label="File">
                <span className="font-mono text-[13px]">{doc.file_name ?? `doc-${doc.id}`}</span>
              </PreviewRow>
              <PreviewRow label="Type">{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</PreviewRow>
              <PreviewRow label="Uploaded">{formatDateTime(doc.uploaded_at)}</PreviewRow>
              <PreviewRow label="Checked">{formatDateTime(fraud.checked_at)}</PreviewRow>
            </dl>
            <div className="mt-4 border-t border-ink-200 pt-4">
              <div className="meta-label">SHA-256</div>
              <p className="mt-1 break-all font-mono text-[12px] leading-relaxed text-ink-600">
                {doc.sha256_hash}
              </p>
            </div>
          </Card>
        </aside>

        <div className="min-w-0 space-y-6">
          <Card title="Stage breakdown" description="Each stage of the pipeline and what it detected.">
            <div>
              {STAGES.map((stage) => (
                <StageRow key={stage.key} stage={stage} value={fraud[stage.key]} />
              ))}
            </div>
          </Card>

          {duplicate && (
            <Card title="Duplicate match" description="This document closely resembles one already on file.">
              <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <DocTile document={doc} caption="This document" />
                <div className="flex flex-col items-center justify-center">
                  <span className="font-display text-[28px] leading-none tabular-nums text-state-danger">
                    {(Number(duplicate.similarity) * 100).toFixed(0)}%
                  </span>
                  <span className="meta-label mt-1">match</span>
                </div>
                <DocTile
                  document={duplicate}
                  caption="On file"
                  to={`/documents/${duplicate.document_id}/fraud`}
                />
              </div>
            </Card>
          )}

          {/* Admin decision — verify is admin-only per API.md; head office
              reviews the report read-only. */}
          {isAdmin && (
            <Card title="Decision">
              {decided ? (
                <p className="text-body text-ink-600">
                  This document is already{' '}
                  <span className="font-medium text-ink-950">{statusMeta.label.toLowerCase()}</span>.
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-md text-body text-ink-600">
                    Approve to mark the document verified, or reject with a reason. Both are recorded
                    against the document.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="danger" onClick={() => setRejectOpen(true)}>
                      Reject
                    </Button>
                    <Button variant="primary" onClick={() => setApproveOpen(true)}>
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
      <ConfirmModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => decide('verified')}
        loading={submitting}
        variant="primary"
        title="Approve document?"
        description="Marks the document verified. The fraud sub-scores and aggregate are retained for audit."
        confirmLabel="Approve document"
      />

      <Modal
        open={rejectOpen}
        onClose={() => !submitting && setRejectOpen(false)}
        title="Reject document"
        description="A reason is required and will be recorded against the document."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => decide('rejected', reason.trim())}
              loading={submitting}
              disabled={!reason.trim()}
            >
              Reject document
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={250}
          rows={3}
          placeholder="Explain why this document is being rejected…"
        />
      </Modal>
    </div>
  )
}

