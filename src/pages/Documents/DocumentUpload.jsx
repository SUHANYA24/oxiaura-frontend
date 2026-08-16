import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  Spinner,
} from '@/components/ui'
import DocumentCard from '@/components/DocumentCard'
import useAuth from '@/hooks/useAuth'
import usePolling from '@/hooks/usePolling'
import customerService from '@/services/customerService'
import documentService, { PIPELINE_STAGES, USING_MOCK_DOCUMENTS } from '@/services/documentService'
import { cn } from '@/utils/cn'
import { confidenceBand, DOC_TYPES, fraudVerdict, REVIEW_ROLES } from '@/utils/constants'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = { 'image/png': [], 'image/jpeg': [], 'application/pdf': [] }

function humanize(key) {
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/** Spinner while a stage runs, a checkmark once it clears, a dot until it starts. */
function StageRow({ label, status }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex h-5 w-5 items-center justify-center">
        {status === 'done' ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-state-ok" aria-hidden="true">
            <circle cx="9" cy="9" r="8" className="fill-state-ok-bg stroke-state-ok-border" strokeWidth="1" />
            <path d="m5.5 9 2.2 2.2L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : status === 'active' ? (
          <span className="text-ink-950"><Spinner size="sm" /></span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-ink-300" aria-hidden="true" />
        )}
      </span>
      <span className={cn('text-body', status === 'pending' ? 'text-ink-400' : 'text-ink-950')}>
        {label}
      </span>
      {status === 'active' && <span className="meta-label ml-auto">Running</span>}
      {status === 'done' && <span className="meta-label ml-auto text-state-ok">Done</span>}
    </li>
  )
}

/** Neutral / warn / danger chip carrying the band label and rounded percent. */
function ConfidenceChip({ confidence }) {
  const band = confidenceBand(confidence)
  return (
    <Badge variant={band.variant}>
      {band.label} · {Math.round((Number(confidence) || 0) * 100)}%
    </Badge>
  )
}

export default function DocumentUpload() {
  const { role } = useAuth()
  const canReview = REVIEW_ROLES.includes(role)

  // form → uploading → processing → complete
  const [phase, setPhase] = useState('form')

  const [customers, setCustomers] = useState([])
  // loading | ready | error. A failed customer list used to leave the Select
  // sitting on "Loading customers…" forever, which is the exact unexplained
  // blank area Phase 14 is meant to eliminate.
  const [customersStatus, setCustomersStatus] = useState('loading')
  const [customerId, setCustomerId] = useState('')
  const [docType, setDocType] = useState('')

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileError, setFileError] = useState(null)

  const [uploadPct, setUploadPct] = useState(0)
  const [doc, setDoc] = useState(null)

  const [ocr, setOcr] = useState(null)
  const [fraud, setFraud] = useState(null)
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)
  // Set when the pipeline finished but its results would not load. Distinct from
  // `polling.error`: the analysis succeeded, only the fetch of it failed, so the
  // recovery is a retry rather than a re-upload.
  const [resultsError, setResultsError] = useState(null)

  const [recent, setRecent] = useState([])
  const [recentStatus, setRecentStatus] = useState('loading')

  /* --------------------------------------------------------- data loading */

  const loadCustomers = useCallback(async () => {
    setCustomersStatus('loading')
    try {
      const { items } = await customerService.list({ perPage: 100 })
      setCustomers(items)
      setCustomersStatus('ready')
    } catch {
      setCustomers([])
      setCustomersStatus('error')
    }
  }, [])

  const loadRecent = useCallback(async () => {
    setRecentStatus('loading')
    try {
      setRecent(await documentService.recent())
      setRecentStatus('ready')
    } catch {
      setRecentStatus('error')
    }
  }, [])

  useEffect(() => {
    loadCustomers()
    loadRecent()
  }, [loadCustomers, loadRecent])

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  /* ------------------------------------------------------------- dropzone */

  const onDrop = useCallback((accepted, rejections) => {
    if (rejections?.length) {
      const code = rejections[0].errors[0]?.code
      setFileError(
        code === 'file-too-large'
          ? 'That file is larger than 10 MB.'
          : 'Only PNG, JPG or PDF files are accepted.',
      )
      return
    }
    const picked = accepted[0]
    if (!picked) return
    setFileError(null)
    setFile(picked)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return picked.type.startsWith('image/') ? URL.createObjectURL(picked) : null
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_BYTES,
    multiple: false,
    noClick: true,
    disabled: phase !== 'form',
  })

  /* -------------------------------------------------------------- polling */

  const polling = usePolling(useCallback(() => documentService.job(doc.task_id), [doc]), {
    interval: 2000,
    timeout: 60000,
    isDone: (j) => j.done,
    enabled: phase === 'processing' && Boolean(doc?.task_id),
    key: doc?.task_id,
  })

  // When the pipeline finishes, pull the OCR fields and fraud verdict together.
  // Keyed on the document id rather than a boolean flag so a resolve that arrives
  // after the user has moved on to another upload is discarded, not applied.
  const resultsForRef = useRef(null)

  const loadResults = useCallback(async () => {
    if (!doc) return
    const requestedFor = doc.id
    resultsForRef.current = requestedFor
    setResultsError(null)
    try {
      const [ocrData, fraudData] = await Promise.all([
        documentService.ocrResult(doc.id),
        documentService.fraudReport(doc.id),
      ])
      if (resultsForRef.current !== requestedFor) return
      setOcr(ocrData)
      setFraud(fraudData)
      setPhase('complete')
      loadRecent()
    } catch (error) {
      if (resultsForRef.current !== requestedFor) return
      // A toast alone left `phase` on 'processing' with a pipeline that had
      // visibly finished and no way forward. The message is kept on the page,
      // next to the retry that acts on it.
      setResultsError(error?.message ?? 'The analysis finished, but its results could not be loaded.')
    }
  }, [doc, loadRecent])

  useEffect(() => {
    if (polling.status !== 'success') return
    loadResults()
  }, [polling.status, loadResults])

  /* ------------------------------------------------------------- actions */

  const canUpload = Boolean(customerId && docType && file && !fileError)

  const onUpload = async () => {
    setPhase('uploading')
    setUploadPct(0)
    try {
      const created = await documentService.upload(
        { customerId, docType, file },
        { onProgress: setUploadPct },
      )
      setDoc(created)
      setPhase('processing')
    } catch (error) {
      toast.error(error?.message ?? 'The upload failed. Please try again.')
      setPhase('form')
    }
  }

  const resetForNext = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setFileError(null)
    setDoc(null)
    setOcr(null)
    setFraud(null)
    setEdits({})
    setResultsError(null)
    resultsForRef.current = null
    setUploadPct(0)
    setPhase('form')
  }

  const fields = ocr?.extracted_fields?.fields ?? {}
  const dirtyEdits = useMemo(
    () => Object.entries(edits).filter(([key, value]) => value !== fields[key]?.value),
    [edits, fields],
  )

  const onSaveCorrections = async () => {
    if (!dirtyEdits.length) return
    setSaving(true)
    try {
      const updated = await documentService.saveCorrections(doc.id, Object.fromEntries(dirtyEdits))
      setOcr(updated)
      setEdits({})
      toast.success('Corrections saved.')
    } catch (error) {
      toast.error(error?.message ?? 'Could not save corrections.')
    } finally {
      setSaving(false)
    }
  }

  const customerOptions = customers.map((c) => ({
    value: String(c.id),
    label: `${c.customer_code} — ${c.full_name}`,
  }))

  /**
   * Every state the Select can be in says which one it is. The old version
   * inferred "loading" from an empty array, so a failed request and an empty
   * customer book both read as "Loading customers…" indefinitely.
   */
  const customerPlaceholder =
    customersStatus === 'loading'
      ? 'Loading customers…'
      : customersStatus === 'error'
        ? 'Customer list unavailable'
        : customerOptions.length
          ? 'Select a customer'
          : 'No customers registered yet'

  /* --------------------------------------------------------------- render */

  return (
    <div className="animate-page-enter">
      <header>
        <h1 className="page-title">Upload document</h1>
        <p className="mt-1 max-w-2xl text-body text-ink-600">
          Upload an identity or financial document for a customer. OCR extraction and the fraud
          pipeline run automatically, and low-confidence fields can be corrected before verification.
        </p>
      </header>

      {USING_MOCK_DOCUMENTS && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the OCR and fraud endpoints are mocked in the service layer only.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {(phase === 'form' || phase === 'uploading') && (
            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Select
                    label="Customer"
                    required
                    placeholder={customerPlaceholder}
                    options={customerOptions}
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={phase !== 'form' || customersStatus !== 'ready'}
                    error={
                      customersStatus === 'error'
                        ? 'The customer list could not be loaded.'
                        : undefined
                    }
                  />
                  {/* The retry sits outside the Select because Field shows either
                      an error or a hint, never both. */}
                  {customersStatus === 'error' && (
                    <Button size="sm" variant="ghost" className="mt-1 px-0" onClick={loadCustomers}>
                      Try again
                    </Button>
                  )}
                </div>
                <Select
                  label="Document type"
                  required
                  placeholder="Select a type"
                  options={DOC_TYPES}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  disabled={phase !== 'form'}
                />
              </div>

              <div className="mt-4">
                <span className="form-label">Document file</span>
                <div
                  {...getRootProps()}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ease-out',
                    isDragActive ? 'border-solid border-ink-950 bg-ink-100' : 'border-ink-300',
                    phase !== 'form' && 'opacity-60',
                  )}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div className="flex items-center gap-4">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Document preview"
                          className="h-20 w-20 rounded-control border border-ink-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-control border border-ink-200 bg-ink-100 font-mono text-meta uppercase text-ink-400">
                          PDF
                        </div>
                      )}
                      <div className="text-left">
                        <p className="truncate text-body font-medium text-ink-950">{file.name}</p>
                        <p className="mt-0.5 font-mono text-[13px] text-ink-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {phase === 'form' && (
                          <Button size="sm" variant="ghost" className="mt-1 px-0" onClick={open}>
                            Choose a different file
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-body text-ink-800">
                        Drag a file here, or{' '}
                        <button type="button" onClick={open} className="font-medium text-ink-950 underline underline-offset-2">
                          browse
                        </button>
                      </p>
                      <p className="mt-1 text-[13px] text-ink-400">PNG, JPG or PDF · up to 10 MB</p>
                    </>
                  )}
                </div>
                {fileError && <span className="form-error">{fileError}</span>}
              </div>

              {phase === 'uploading' && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[13px] text-ink-600">
                    <span>Uploading…</span>
                    <span className="font-mono">{uploadPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                    <div
                      className="h-full rounded-full bg-ink-950 transition-[width] duration-150 ease-out"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-ink-200 pt-5">
                <Button
                  variant="primary"
                  onClick={onUpload}
                  loading={phase === 'uploading'}
                  disabled={!canUpload || phase !== 'form'}
                >
                  Upload &amp; analyze
                </Button>
              </div>
            </Card>
          )}
          {(phase === 'processing' || phase === 'complete') && (
            <Card
              title="Processing pipeline"
              description={doc ? `Document #${doc.id} · ${humanize(doc.doc_type)}` : undefined}
            >
              <ul className="divide-y divide-ink-200">
                {(
                  polling.data?.stages ??
                  PIPELINE_STAGES.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' }))
                ).map((stage) => (
                  <StageRow key={stage.id} label={stage.label} status={stage.status} />
                ))}
              </ul>

              {polling.status === 'timeout' && (
                <p className="mt-4 rounded-control border border-state-warn-border bg-state-warn-bg px-3 py-2 text-[13px] text-state-warn">
                  Analysis is taking longer than expected. You can start over or check back shortly.
                </p>
              )}
              {polling.status === 'error' && (
                <p className="mt-4 rounded-control border border-state-danger-border bg-state-danger-bg px-3 py-2 text-[13px] text-state-danger">
                  {polling.error?.message ?? 'The pipeline reported an error.'}
                </p>
              )}
              {resultsError && (
                <p className="mt-4 rounded-control border border-state-danger-border bg-state-danger-bg px-3 py-2 text-[13px] text-state-danger">
                  {resultsError}
                </p>
              )}
              {resultsError && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={resetForNext}>
                    Start over
                  </Button>
                  <Button variant="secondary" onClick={loadResults}>
                    Try again
                  </Button>
                </div>
              )}

              {(polling.status === 'timeout' || polling.status === 'error') && (
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" onClick={resetForNext}>
                    Start over
                  </Button>
                </div>
              )}
            </Card>
          )}
          {phase === 'complete' && ocr && (
            <Card
              title="Extracted fields"
              description={`Mean confidence ${Math.round((ocr.extracted_fields.mean_confidence || 0) * 100)}%`}
              actions={
                <div className="flex items-center gap-2">
                  {fraud && (
                    <Badge variant={fraudVerdict(fraud.aggregate_score).variant}>
                      Fraud: {fraudVerdict(fraud.aggregate_score).verdict} · {Math.round(fraud.aggregate_score)}
                    </Badge>
                  )}
                  {canReview && doc && (
                    <Link to={`/documents/${doc.id}/fraud`} className="btn btn-secondary btn-sm">
                      Fraud report
                    </Link>
                  )}
                </div>
              }
            >
              <div>
                {Object.entries(fields).map(([key, field]) => {
                  const isLow = confidenceBand(field.confidence).variant === 'danger'
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-3 border-b border-ink-200 py-2.5 last:border-0"
                    >
                      <span className="meta-label">{humanize(key)}</span>
                      {isLow ? (
                        <input
                          className="form-input h-8"
                          value={edits[key] ?? field.value}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                          aria-label={`${humanize(key)} (low confidence — please verify)`}
                        />
                      ) : (
                        <span className="truncate text-body text-ink-950">{field.value}</span>
                      )}
                      <ConfidenceChip confidence={field.confidence} />
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-ink-200 pt-5">
                <p className="text-[13px] text-ink-400">
                  {dirtyEdits.length
                    ? `${dirtyEdits.length} field${dirtyEdits.length > 1 ? 's' : ''} edited`
                    : 'Low-confidence fields are editable.'}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={resetForNext}>
                    Upload another
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onSaveCorrections}
                    loading={saving}
                    disabled={!dirtyEdits.length}
                  >
                    Save corrections
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <aside>
          <Card title="Recent uploads" padded={false}>
            {/*
              Three states, kept apart. Previously a failed fetch fell through to
              the empty state, so the panel confidently claimed the user had never
              uploaded anything.
            */}
            {recentStatus === 'loading' ? (
              <div className="space-y-2 p-3" role="status" aria-label="Loading recent uploads">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[68px] w-full" rounded="rounded-card" />
                ))}
              </div>
            ) : recentStatus === 'error' ? (
              <ErrorState
                title="Could not load recent uploads"
                description="The list is unavailable right now. Uploading still works."
                onRetry={loadRecent}
                className="py-10"
              />
            ) : recent.length ? (
              <div className="space-y-2 p-3">
                {recent.map((d) => (
                  <DocumentCard
                    key={d.id}
                    document={d}
                    to={canReview ? `/documents/${d.id}/fraud` : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No uploads yet"
                description="Documents you upload appear here."
                className="py-10"
              />
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
