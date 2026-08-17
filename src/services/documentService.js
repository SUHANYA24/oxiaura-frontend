import api, { UPLOAD_TIMEOUT } from './api'
import customerService from './customerService'

/**
 * Documents — upload, OCR extraction, and the fraud pipeline.
 *
 * Live against the API: `/documents/upload`, `/documents/{id}`, `/ocr-result`,
 * `/fraud-report`, `/jobs/{task_id}` and `/verify` are all real endpoints.
 *
 * Two things the contract does not offer, and what happens instead:
 *
 * - **No global document list.** Documents are reachable per id or nested on a
 *   customer, so `recent()` walks the customers the caller can see and collects
 *   their documents. Anything uploaded in this session is remembered locally too,
 *   so a fresh upload shows up before the customer list is re-read.
 * - **No endpoint for OCR corrections** (`SUPPORTS_OCR_CORRECTIONS`). The upload
 *   screen reads that flag and presents low-confidence fields read-only rather
 *   than offering a save that would go nowhere.
 *
 * The mock branch behind USING_MOCK_DOCUMENTS is kept — it is how the pipeline
 * screens are exercised when the Celery broker is not running (upload blocks on
 * the queue dispatch when Redis is down). Flip the flag to true for that.
 */

export const USING_MOCK_DOCUMENTS = false

/**
 * No endpoint accepts corrected OCR fields. Editing them client-side and
 * reporting "saved" would be a lie, so the UI hides the affordance instead.
 */
export const SUPPORTS_OCR_CORRECTIONS = USING_MOCK_DOCUMENTS

/**
 * The fraud report download is assembled in the browser from the live report —
 * `/documents/{id}/fraud-report/download` does not exist. Real values, local
 * rendering, so the flag reflects the format rather than the data.
 */
export const FRAUD_REPORT_IS_CLIENT_RENDERED = true

/** The five pipeline stages, in order — the UI renders one row per stage. */
export const PIPELINE_STAGES = [
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'ocr', label: 'OCR extraction' },
  { id: 'ela', label: 'ELA analysis' },
  { id: 'cnn', label: 'CNN forgery check' },
  { id: 'siamese', label: 'Siamese duplicate match' },
]

/**
 * What the live job endpoint can actually report.
 *
 * One Celery task (`documents.process_document`) runs OCR *and* all three fraud
 * engines, and it publishes no intermediate progress — `GET /documents/jobs/{id}`
 * answers `PENDING`, `STARTED`, `SUCCESS` or `FAILURE` and nothing between. So
 * the live indicator shows the two transitions that are real rather than
 * animating five stages it cannot observe; PIPELINE_STAGES still names what the
 * analysis step covers, and the screen lists those engines beside it.
 */
const LIVE_STAGES = [
  { id: 'queued', label: 'Queued for analysis' },
  { id: 'analysis', label: 'OCR extraction & fraud analysis' },
]

/** Celery states that mean the worker has picked the job up. */
const RUNNING_STATES = new Set(['STARTED', 'PROGRESS', 'RETRY'])

function liveStages(state) {
  if (state === 'SUCCESS') return LIVE_STAGES.map((s) => ({ ...s, status: 'done' }))
  if (state === 'FAILURE' || state === 'REVOKED') {
    return [
      { ...LIVE_STAGES[0], status: 'done' },
      { ...LIVE_STAGES[1], status: 'failed' },
    ]
  }
  if (RUNNING_STATES.has(state)) {
    return [
      { ...LIVE_STAGES[0], status: 'done' },
      { ...LIVE_STAGES[1], status: 'active' },
    ]
  }
  // PENDING — queued but not yet claimed by a worker.
  return [
    { ...LIVE_STAGES[0], status: 'active' },
    { ...LIVE_STAGES[1], status: 'pending' },
  ]
}


/**
 * Documents uploaded during this browser session, newest last.
 *
 * The API has no global document list, and re-reading every customer takes a
 * moment; this makes a just-uploaded document appear in "Recent uploads" at once
 * and survives nothing beyond a reload, which is exactly its scope.
 */
const session = new Map()

/* --------------------------------------------------------------- mock state */

const STAGE_MS = 1500 // per-stage dwell on the simulated timeline
const UPLOAD_MS = 1200 // simulated transfer time for the progress bar

// Extracted-field templates per doc type. Each carries at least one
// low-confidence field so the correction flow always has something to exercise.
const OCR_TEMPLATES = {
  nic: {
    full_name: { value: 'Nimal Perera', confidence: 0.96 },
    nic_number: { value: '912345678V', confidence: 0.94 },
    date_of_birth: { value: '1991-04-12', confidence: 0.82 },
    address: { value: 'No 14, Temple Road, Kandy', confidence: 0.61 },
  },
  bank_slip: {
    name: { value: 'Nimal Perera', confidence: 0.95 },
    nic_number: { value: '912345678V', confidence: 0.93 },
    account_no: { value: '1234567890', confidence: 0.9 },
    amount: { value: '50,000.00', confidence: 0.71 },
    date: { value: '2025-08-16', confidence: 0.92 },
  },
  bank_book: {
    name: { value: 'Nimal Perera', confidence: 0.94 },
    account_no: { value: '1234567890', confidence: 0.9 },
    branch: { value: 'Kandy Main', confidence: 0.68 },
  },
  proposal_form: {
    full_name: { value: 'Nimal Perera', confidence: 0.93 },
    product_type: { value: 'Teak Plantation Unit', confidence: 0.8 },
    proposed_amount: { value: '75,000.00', confidence: 0.64 },
  },
}

// Fake but well-shaped fraud profiles. The three sub-scores sit on their own
// scales — ELA is an error-level metric, CNN a 0–1 forgery probability, Siamese
// a 0–1 duplicate similarity — and aggregate_score is the weighted 0–100 the
// verdict bands in constants.js read. `clear` is what a fresh upload gets;
// `flagged` is seeded so the fraud report always has a high-severity document to
// open, matching Phase 9's acceptance check.
const FRAUD_CLEAR = {
  ela_score: 3.14,
  cnn_fraud_score: 0.2973,
  siamese_similarity: 0.1402,
  aggregate_score: 17.04,
  is_flagged: false,
  flag_reason: null,
  verdict: 'clear',
}

const FRAUD_FLAGGED = {
  ela_score: 41.6,
  cnn_fraud_score: 0.8734,
  siamese_similarity: 0.9142,
  aggregate_score: 86.3,
  is_flagged: true,
  flag_reason:
    'High visual similarity to a document already on file, combined with an elevated CNN manipulation probability.',
  verdict: 'fraud',
}

const FRAUD_TEMPLATE = FRAUD_CLEAR // default for a fresh upload

const store = new Map() // id -> document record (metadata + ocr + fraud)
const taskIndex = new Map() // task_id -> id
let seq = 1000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function hexHash() {
  const bytes = new Uint8Array(32)
  ;(globalThis.crypto ?? {}).getRandomValues?.(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function meanConfidence(fields) {
  const values = Object.values(fields).map((f) => f.confidence)
  if (!values.length) return 0
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4))
}

function cloneFields(docType) {
  const template = OCR_TEMPLATES[docType] ?? OCR_TEMPLATES.nic
  return JSON.parse(JSON.stringify(template))
}

function metaOf(record) {
  const { id, customer_id, doc_type, sha256_hash, ocr_confidence, verification_status, uploaded_at } = record
  return { id, customer_id, doc_type, sha256_hash, ocr_confidence, verification_status, uploaded_at }
}

// A duplicate hit points at another stored document. Built at seed time so the
// matched record already exists when we look it up. `duplicate_match` is a mock
// enrichment — the /fraud-report shape in API.md carries no such field yet, so
// when the fraud backend lands this either arrives on the report or is dropped
// here; the UI renders the duplicate panel only when it is present.
function duplicateSummary(matchedId, similarity) {
  const match = store.get(matchedId)
  if (!match) return null
  return {
    document_id: matchedId,
    customer_id: match.customer_id,
    doc_type: match.doc_type,
    file_name: match.file_name,
    similarity,
    uploaded_at: match.uploaded_at,
  }
}

// A couple of already-processed uploads so the recent-uploads card is not empty
// on a cold load. `fraud`/`duplicateOf` let a seed carry a flagged verdict with
// a matched document.
function seed(id, customerId, docType, status, minutesAgo, { fraud = FRAUD_CLEAR, duplicateOf = null } = {}) {
  const fields = cloneFields(docType)
  const uploaded = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  store.set(id, {
    id,
    customer_id: customerId,
    doc_type: docType,
    file_name: `${docType}-${id}.png`,
    sha256_hash: hexHash(),
    ocr_confidence: meanConfidence(fields),
    verification_status: status,
    uploaded_at: uploaded,
    startedAt: 0, // long finished
    fields,
    fraud: {
      ...fraud,
      document_id: id,
      duplicate_match: duplicateOf ? duplicateSummary(duplicateOf, fraud.siamese_similarity) : null,
      checked_at: uploaded,
    },
  })
}
seed(101, 1, 'nic', 'verified', 42)
seed(102, 1, 'bank_slip', 'pending', 12)
// A flagged upload whose slip duplicates document 102 — the fraud report's demo.
seed(103, 1, 'bank_slip', 'pending', 4, { fraud: FRAUD_FLAGGED, duplicateOf: 102 })

/* -------------------------------------------------------------- operations */

/**
 * POST /documents/upload — multipart upload. Returns the 202 shape immediately
 * with the async `task_id`; OCR + fraud run in the background thereafter.
 * `onProgress(percent)` is driven by the transfer, 0 → 100.
 */
async function upload({ customerId, docType, file }, { onProgress } = {}) {
  if (!USING_MOCK_DOCUMENTS) {
    const form = new FormData()
    form.append('customer_id', customerId)
    form.append('doc_type', docType)
    form.append('file', file)
    const { data } = await api.post('/documents/upload', form, {
      // Let axios set the multipart boundary; naming the type without one makes
      // Flask's parser reject the body.
      headers: { 'Content-Type': undefined },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    })
    // Remembered so "Recent uploads" shows this document immediately, before the
    // per-customer walk below would pick it up.
    session.set(data.id, { ...data, file_name: file?.name ?? null })
    return data
  }

  // Simulated transfer: report progress in steps, then hand back the 202 doc.
  const steps = 12
  for (let i = 1; i <= steps; i += 1) {
    await delay(UPLOAD_MS / steps)
    onProgress?.(Math.round((i / steps) * 100))
  }

  const id = (seq += 1)
  const taskId = `task-${id}-${hexHash().slice(0, 12)}`
  const fields = cloneFields(docType)
  store.set(id, {
    id,
    customer_id: Number(customerId),
    doc_type: docType,
    file_name: file?.name ?? `${docType}.png`,
    sha256_hash: hexHash(),
    ocr_confidence: null,
    verification_status: 'pending',
    uploaded_at: new Date().toISOString(),
    startedAt: Date.now(),
    fields,
    fraud: { ...FRAUD_TEMPLATE, document_id: id, duplicate_match: null, checked_at: null },
  })
  taskIndex.set(taskId, id)

  return {
    id,
    customer_id: Number(customerId),
    doc_type: docType,
    sha256_hash: store.get(id).sha256_hash,
    ocr_confidence: null,
    verification_status: 'pending',
    uploaded_at: store.get(id).uploaded_at,
    status: 'processing',
    task_id: taskId,
  }
}

/**
 * Pipeline progress for the stage-by-stage indicator.
 *
 * `GET /documents/jobs/{task_id}` answers `{ task_id, state, result }` (plus
 * `error` on failure). `stages` and `done` are added here so the screen has one
 * shape to render regardless of which branch produced it — see LIVE_STAGES for
 * why the live list is two rows rather than five.
 *
 * A FAILURE is reported as done-with-error rather than thrown: the poll itself
 * succeeded, and the caller needs the state to stop polling and explain why.
 */
async function job(taskId) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.get(`/documents/jobs/${taskId}`)
    const failed = data.state === 'FAILURE' || data.state === 'REVOKED'
    return {
      ...data,
      stages: liveStages(data.state),
      failed,
      error: data.error ?? null,
      done: data.state === 'SUCCESS' || failed,
    }
  }

  const id = taskIndex.get(taskId)
  const record = id ? store.get(id) : null
  const elapsed = record ? Date.now() - record.startedAt : 0
  const cleared = Math.max(0, Math.floor(elapsed / STAGE_MS))

  const stages = PIPELINE_STAGES.map((stage, index) => ({
    ...stage,
    status: index < cleared ? 'done' : index === cleared ? 'active' : 'pending',
  }))
  const done = cleared >= PIPELINE_STAGES.length

  if (done && record) {
    record.ocr_confidence = meanConfidence(record.fields)
    if (!record.fraud.checked_at) record.fraud.checked_at = new Date().toISOString()
  }

  return {
    task_id: taskId,
    state: done ? 'SUCCESS' : cleared === 0 && elapsed < 300 ? 'PENDING' : 'PROGRESS',
    stages,
    done,
    failed: false,
    error: null,
    result: done ? { document_id: id } : null,
  }
}

/** GET /documents/{id} — metadata + verification status, no OCR payload. */
async function get(id) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.get(`/documents/${id}`)
    return data
  }
  const record = store.get(Number(id))
  if (!record) throw { message: 'Document not found.', fieldErrors: {}, status: 404 }
  return metaOf(record)
}

/** GET /documents/{id}/ocr-result — extracted fields + confidence. */
async function ocrResult(id) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.get(`/documents/${id}/ocr-result`)
    return data
  }
  const record = store.get(Number(id))
  if (!record) throw { message: 'Document not found.', fieldErrors: {}, status: 404 }
  return {
    id: record.id,
    ocr_confidence: meanConfidence(record.fields),
    verification_status: record.verification_status,
    extracted_fields: {
      fields: record.fields,
      mean_confidence: meanConfidence(record.fields),
    },
  }
}

/** GET /documents/{id}/fraud-report — sub-scores, aggregate, verdict. */
async function fraudReport(id) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.get(`/documents/${id}/fraud-report`)
    return data
  }
  const record = store.get(Number(id))
  if (!record) throw { message: 'Document not found.', fieldErrors: {}, status: 404 }
  return { ...record.fraud }
}

/**
 * Persist staff corrections to low-confidence OCR fields.
 *
 * There is no endpoint for this — `SUPPORTS_OCR_CORRECTIONS` is false against the
 * live API and the upload screen hides the editor accordingly. The mock branch
 * keeps the flow exercisable: a corrected field is promoted to full confidence.
 */
async function saveCorrections(id, corrections) {
  if (!USING_MOCK_DOCUMENTS) {
    throw {
      message: 'Saving OCR corrections is not supported by the API yet.',
      fieldErrors: {},
      status: 501,
    }
  }
  const record = store.get(Number(id))
  if (!record) throw { message: 'Document not found.', fieldErrors: {}, status: 404 }
  await delay(500)
  for (const [key, value] of Object.entries(corrections)) {
    if (record.fields[key]) record.fields[key] = { value, confidence: 1 }
  }
  record.ocr_confidence = meanConfidence(record.fields)
  return ocrResult(id)
}

/** POST /documents/{id}/verify — admin approve/reject. */
async function verify(id, { decision, reason } = {}) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.post(`/documents/${id}/verify`, { decision, reason })
    return data
  }
  const record = store.get(Number(id))
  if (!record) throw { message: 'Document not found.', fieldErrors: {}, status: 404 }
  await delay(400)
  record.verification_status = decision === 'verified' ? 'verified' : 'rejected'
  return metaOf(record)
}

/**
 * A fraud report the reviewer can keep.
 *
 * `/documents/{id}/fraud-report/download` does not exist, so the summary is
 * rendered in the browser from the live report and metadata — real numbers, local
 * typesetting (see FRAUD_REPORT_IS_CLIENT_RENDERED). Returns `{ blob, filename }`
 * for the caller to turn into an object URL and save.
 */
function renderReportText(meta, fraud) {
  return [
    'PlantVest AI — Fraud analysis report',
    '=====================================',
    '',
    `Document ID        : ${meta.id}`,
    `Document type      : ${meta.doc_type}`,
    `Customer ID        : ${meta.customer_id}`,
    `SHA-256            : ${meta.sha256_hash}`,
    `Uploaded at        : ${meta.uploaded_at}`,
    `Verification       : ${meta.verification_status}`,
    '',
    'Sub-scores',
    '----------',
    `ELA score          : ${fraud.ela_score ?? '—'}`,
    `CNN fraud score    : ${fraud.cnn_fraud_score ?? '—'}`,
    `Siamese similarity : ${fraud.siamese_similarity ?? '—'}`,
    '',
    `Aggregate score    : ${fraud.aggregate_score ?? '—'} / 100`,
    `Verdict            : ${fraud.verdict}`,
    `Flagged            : ${fraud.is_flagged ? 'yes' : 'no'}`,
    `Flag reason        : ${fraud.flag_reason ?? '—'}`,
    ...(fraud.duplicate_match
      ? [
          '',
          'Duplicate match',
          '---------------',
          `Matched document   : ${fraud.duplicate_match.document_id}`,
          `Similarity         : ${(fraud.duplicate_match.similarity * 100).toFixed(1)}%`,
        ]
      : []),
    '',
    `Generated at       : ${new Date().toISOString()}`,
    '',
  ].join('\n')
}

async function downloadReport(id) {
  if (!USING_MOCK_DOCUMENTS) {
    const [meta, fraud] = await Promise.all([get(id), fraudReport(id)])
    const blob = new Blob([renderReportText(meta, fraud)], { type: 'text/plain;charset=utf-8' })
    return { blob, filename: `fraud-report-${meta.id}.txt` }
  }
  const record = store.get(Number(id))
  if (!record) throw { message: 'Document not found.', fieldErrors: {}, status: 404 }
  await delay(300)
  const blob = new Blob([renderReportText(metaOf(record), record.fraud)], {
    type: 'text/plain;charset=utf-8',
  })
  return { blob, filename: `fraud-report-${record.id}.txt` }
}

/**
 * Recent uploads for the sidebar list.
 *
 * There is no global document list, so the live branch reads the first page of
 * customers the caller may see and collects the `documents` each detail record
 * nests. That is a handful of requests, capped deliberately: the panel is a
 * convenience, not a document register, and it must not turn one page load into
 * fifty calls. Anything uploaded in this session is merged in on top so a fresh
 * upload is never missing from its own list.
 */
const RECENT_LIMIT = 8
const RECENT_CUSTOMER_SCAN = 6

async function recent() {
  if (!USING_MOCK_DOCUMENTS) {
    const fromSession = [...session.values()]

    let scanned = []
    try {
      const { items } = await customerService.list({ page: 1, perPage: RECENT_CUSTOMER_SCAN })
      const details = await Promise.all(
        items.map((customer) => customerService.get(customer.id).catch(() => null)),
      )
      scanned = details
        .filter(Boolean)
        .flatMap((customer) =>
          (customer.documents ?? []).map((document) => ({
            ...document,
            customer_id: customer.id,
          })),
        )
    } catch (error) {
      // A failed scan still leaves this session's uploads worth showing; only a
      // genuinely empty result should read as "could not load".
      if (!fromSession.length) throw error
    }

    // Session entries win on id — they carry the file name the server omits.
    const byId = new Map(scanned.map((document) => [document.id, document]))
    for (const document of fromSession) {
      byId.set(document.id, { ...byId.get(document.id), ...document })
    }

    return [...byId.values()]
      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
      .slice(0, RECENT_LIMIT)
  }

  return Array.from(store.values())
    .map((r) => ({ ...metaOf(r), file_name: r.file_name }))
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
}

export default { upload, job, get, ocrResult, fraudReport, saveCorrections, verify, downloadReport, recent }
