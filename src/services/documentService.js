import api from './api'

/**
 * Documents — upload, OCR extraction, and the fraud pipeline.
 *
 * The document endpoints are Celery-backed on the server (OCR + ELA/CNN/Siamese
 * fraud analysis) and are not wired up in this environment yet. So this whole
 * module runs against an in-memory mock that returns the exact shapes from
 * API.md. Every function keeps its real `api` call written beside the mock,
 * behind USING_MOCK_DOCUMENTS — flip the flag to false and every screen above
 * this file keeps working against the live API with no other change.
 */

export const USING_MOCK_DOCUMENTS = true

/** The five pipeline stages, in order — the UI renders one row per stage. */
export const PIPELINE_STAGES = [
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'ocr', label: 'OCR extraction' },
  { id: 'ela', label: 'ELA analysis' },
  { id: 'cnn', label: 'CNN forgery check' },
  { id: 'siamese', label: 'Siamese duplicate match' },
]

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

// Fake but well-shaped fraud sub-scores keyed by doc id (stable per document).
const FRAUD_TEMPLATE = {
  ela_score: 3.14,
  cnn_fraud_score: 0.2973,
  siamese_similarity: 0.1402,
  aggregate_score: 17.04,
  is_flagged: false,
  flag_reason: null,
  verdict: 'clear',
}

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

// A couple of already-processed uploads so the recent-uploads card is not empty
// on a cold load.
function seed(id, customerId, docType, status, minutesAgo) {
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
    fraud: { ...FRAUD_TEMPLATE, document_id: id, checked_at: uploaded },
  })
}
seed(101, 1, 'nic', 'verified', 42)
seed(102, 1, 'bank_slip', 'pending', 12)

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
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    })
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
    fraud: { ...FRAUD_TEMPLATE, document_id: id, checked_at: null },
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
 * Real shape (GET /documents/jobs/{task_id}) is `{ task_id, state, result }`.
 * The per-stage `stages` array is a mock enrichment: in production the UI would
 * derive the same five rows by polling the OCR endpoint (preprocessing + OCR)
 * and the fraud endpoint (ELA + CNN + Siamese) for readiness. `done` is the
 * single signal usePolling stops on.
 */
async function job(taskId) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.get(`/documents/jobs/${taskId}`)
    return { ...data, done: data.state === 'SUCCESS' || data.state === 'FAILURE' }
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
 * Persist staff corrections to low-confidence OCR fields. No dedicated endpoint
 * exists in API.md yet (likely a future PATCH /documents/{id}/ocr-result), so
 * this is mock-only for now — a corrected field is promoted to full confidence.
 */
async function saveCorrections(id, corrections) {
  if (!USING_MOCK_DOCUMENTS) {
    const { data } = await api.patch(`/documents/${id}/ocr-result`, { fields: corrections })
    return data
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
 * Recent uploads for the sidebar list. API.md exposes no global document list
 * (documents are nested under a customer), so this is a mock/session view —
 * newest first.
 */
async function recent() {
  if (!USING_MOCK_DOCUMENTS) return []
  return Array.from(store.values())
    .map((r) => ({ ...metaOf(r), file_name: r.file_name }))
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
}

export default { upload, job, get, ocrResult, fraudReport, saveCorrections, verify, recent }
