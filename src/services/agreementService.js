import api from './api'

/**
 * Agreements — generation, listing, the signed-token QR, and PDF download.
 *
 * The agreement endpoints (WeasyPrint PDF render + HMAC-signed QR tokens) are
 * not wired up in this environment yet, so this module runs against an in-memory
 * mock that returns the exact shapes from API.md. Every function keeps its real
 * `api` call written beside the mock, behind USING_MOCK_AGREEMENTS — flip the
 * flag to false and every screen above this file keeps working against the live
 * API with no other change.
 */

export const USING_MOCK_AGREEMENTS = true

/**
 * Maturity value on simple interest: principal + principal · rate · years.
 * Shared by the generation form (live preview) and the detail view, so the two
 * never disagree on the figure. Not a field the API returns — it is derived from
 * amount, duration and rate, which it does.
 */
export function computeMaturity(amount, months, rate) {
  const principal = Number(amount) || 0
  const years = (Number(months) || 0) / 12
  const interest = principal * ((Number(rate) || 0) / 100) * years
  return principal + interest
}

/* --------------------------------------------------------------- mock state */

const GEN_MS = 900 // simulated server render time for the PDF + token

const store = new Map() // id -> agreement record
const tokenIndex = new Map() // qr_code_token -> id
let seq = 0

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function hexHash(bytes = 32) {
  const buf = new Uint8Array(bytes)
  ;(globalThis.crypto ?? {}).getRandomValues?.(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

function base64Url(input) {
  // btoa is fine here — agreement numbers are ASCII. Trim the padding so the
  // token reads like the real HMAC form (base64url.signature) in API.md.
  return btoa(String(input)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/** Mint a token shaped like the backend's `<base64url payload>.<signature>`. */
function mintToken(agreementNumber) {
  return `${base64Url(`${agreementNumber}:${hexHash(8)}`)}.${hexHash(16)}`
}

function nextNumber() {
  seq += 1
  return `AGR-2026-${String(seq).padStart(3, '0')}`
}

/**
 * The full detail shape from API.md, plus a nested `customer` summary. The real
 * `GET /agreements` list item carries no nested customer — it is a mock
 * enrichment so the list cards can show a name — so consumers read
 * `agreement.customer?.full_name` and fall back gracefully when it is absent.
 */
function record(id, { number, customer, amount, months, rate, status, signedAt, token }) {
  return {
    id,
    agreement_number: number,
    customer_id: customer.id,
    customer,
    created_by: 1,
    investment_amount: Number(amount).toFixed(2), // string decimal, like the API
    duration_months: months,
    interest_rate: rate,
    status,
    signed_at: signedAt,
    qr_code_token: token,
    has_pdf: true,
  }
}

/** The public, non-sensitive projection returned by GET /verify/{token}. */
function publicView(rec) {
  return {
    valid: true,
    agreement_number: rec.agreement_number,
    customer_name: rec.customer.full_name,
    investment_amount: Number(rec.investment_amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    duration_months: rec.duration_months,
    status: rec.status,
    signed_at: rec.signed_at,
  }
}

function seed({ customer, amount, months, rate, status, minutesAgo, signed = false }) {
  const id = (seq += 1)
  const number = `AGR-2026-${String(seq).padStart(3, '0')}`
  const token = mintToken(number)
  const signedAt = signed ? new Date(Date.now() - minutesAgo * 60_000).toISOString() : null
  const rec = record(id, { number, customer, amount, months, rate, status, signedAt, token })
  store.set(id, rec)
  tokenIndex.set(token, id)
  return rec
}

// A few already-generated agreements so the list and the QR verify flow have
// something to open on a cold load. The active one is signed; the others are not.
seed({ customer: { id: 1, customer_code: 'C-1001', full_name: 'Nimal Perera' }, amount: 50000, months: 12, rate: 8.5, status: 'active', minutesAgo: 2880, signed: true })
seed({ customer: { id: 2, customer_code: 'C-1002', full_name: 'Kamala Silva' }, amount: 120000, months: 24, rate: 9, status: 'pending', minutesAgo: 180 })
seed({ customer: { id: 3, customer_code: 'C-1003', full_name: 'Rohan Jayasuriya' }, amount: 75000, months: 18, rate: 7.75, status: 'cancelled', minutesAgo: 10080 })

/* ----------------------------------------------------------------- mock pdf */

/**
 * Assemble a genuinely valid single-page PDF from a list of body text lines, so
 * the download and the inline PDFViewer both work in mock mode against a file a
 * real reader will open. Not a fake preview — a hand-built PDF with a correct
 * cross-reference table (byte offsets computed as the objects are laid out).
 *
 * ASCII only: Helvetica in a base PDF has no rupee glyph, so callers pass "Rs".
 * The real branch never touches this — it streams the WeasyPrint bytes instead.
 */
function buildPdf(bodyLines) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

  // Text content stream: start near the top, step down 22pt per line.
  let text = 'BT\n/F1 13 Tf\n56 780 Td\n15 TL\n'
  bodyLines.forEach((line, i) => {
    text += i === 0 ? `(${esc(line)}) Tj\n` : `T*\n(${esc(line)}) Tj\n`
  })
  text += 'ET'
  const stream = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    stream,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefStart = pdf.length
  const n = objects.length + 1
  let xref = `xref\n0 ${n}\n0000000000 65535 f \n`
  offsets.forEach((off) => {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`
  })
  pdf += `${xref}trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

/** Human-readable body for the mock PDF, drawn from a stored record. */
function pdfLines(rec) {
  const money = (v) =>
    `Rs ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const maturity = computeMaturity(rec.investment_amount, rec.duration_months, rec.interest_rate)
  return [
    'PLANTVEST INVESTMENT AGREEMENT',
    '',
    `Agreement number:   ${rec.agreement_number}`,
    `Customer:           ${rec.customer.full_name} (${rec.customer.customer_code})`,
    `Investment amount:  ${money(rec.investment_amount)}`,
    `Duration:           ${rec.duration_months} months`,
    `Interest rate:      ${rec.interest_rate}% per annum`,
    `Maturity value:     ${money(maturity)}`,
    `Status:             ${rec.status}`,
    `Signed at:          ${rec.signed_at ?? 'Not yet signed'}`,
    '',
    'This document is verifiable via the QR code on the agreement view.',
  ]
}

/* -------------------------------------------------------------- operations */

/**
 * POST /agreements/generate — mints the sequential number, an HMAC-shaped QR
 * token, and the PDF, then returns the detail shape.
 *
 * The live endpoint accepts only `customer_id`, `investment_amount` (string
 * decimal), `duration_months` and `interest_rate`. `product_type` and the
 * signing date are extras the Phase 10 form collects for the letterhead; the
 * real API neither takes nor returns them, so the real branch drops them and
 * they are kept as mock-only fields on the record.
 */
async function generate({
  customerId,
  customer,
  investmentAmount,
  durationMonths,
  interestRate,
  productType,
  signingDate,
}) {
  if (!USING_MOCK_AGREEMENTS) {
    const { data } = await api.post('/agreements/generate', {
      customer_id: Number(customerId),
      investment_amount: Number(investmentAmount).toFixed(2),
      duration_months: Number(durationMonths),
      interest_rate: Number(interestRate),
    })
    return data
  }

  await delay(GEN_MS)
  const number = nextNumber()
  const id = seq // nextNumber just advanced seq — keep id and number in step
  const token = mintToken(number)
  const cust = customer ?? {
    id: Number(customerId),
    customer_code: '—',
    full_name: `Customer #${customerId}`,
  }
  const rec = record(id, {
    number,
    customer: cust,
    amount: investmentAmount,
    months: Number(durationMonths),
    rate: Number(interestRate),
    status: 'pending', // a freshly generated agreement is unsigned, like the API
    signedAt: null,
    token,
  })
  rec.product_type = productType || null // mock-only enrichment
  rec.signing_date = signingDate || null
  store.set(id, rec)
  tokenIndex.set(token, id)
  return { ...rec }
}

/** GET /agreements — paginated, scoped to the caller server-side. */
async function list({ page = 1, perPage = 10 } = {}) {
  if (!USING_MOCK_AGREEMENTS) {
    const { data } = await api.get('/agreements', { params: { page, per_page: perPage } })
    return { items: data.items, pagination: data.pagination }
  }

  await delay(300)
  const all = Array.from(store.values()).sort((a, b) => b.id - a.id) // newest first
  const total = all.length
  const start = (page - 1) * perPage
  const items = all.slice(start, start + perPage).map((r) => ({ ...r }))
  return {
    items,
    pagination: {
      page,
      per_page: perPage,
      total,
      pages: Math.max(1, Math.ceil(total / perPage)),
      has_next: start + perPage < total,
      has_prev: page > 1,
    },
  }
}

/** GET /agreements/{id} — detail, with the nested customer summary. */
async function get(id) {
  if (!USING_MOCK_AGREEMENTS) {
    const { data } = await api.get(`/agreements/${id}`)
    return data
  }
  await delay(250)
  const rec = store.get(Number(id))
  if (!rec) throw { message: 'Agreement not found.', fieldErrors: {}, status: 404 }
  return { ...rec }
}

/**
 * GET /agreements/{id}/pdf — the generated PDF as a blob. Returns
 * `{ blob, filename }` for the caller to preview inline or save; the real
 * branch streams the WeasyPrint bytes, the mock hands back a hand-built PDF.
 */
async function downloadPdf(id) {
  if (!USING_MOCK_AGREEMENTS) {
    const { data } = await api.get(`/agreements/${id}/pdf`, { responseType: 'blob' })
    return { blob: data, filename: `agreement-${id}.pdf` }
  }
  await delay(400)
  const rec = store.get(Number(id))
  if (!rec) throw { message: 'Agreement not found.', fieldErrors: {}, status: 404 }
  return { blob: buildPdf(pdfLines(rec)), filename: `${rec.agreement_number}.pdf` }
}

/**
 * GET /verify/{token} — the PUBLIC authenticity check, no auth. Returns the
 * non-sensitive projection on a match, or `{ valid: false, reason }` on a
 * tampered/unknown token (the API answers a bad token with 404, normalised
 * here so the page renders one clean "invalid" state either way).
 */
async function verifyByToken(token) {
  if (!USING_MOCK_AGREEMENTS) {
    try {
      const { data } = await api.get(`/verify/${token}`)
      return data
    } catch (error) {
      if (error?.status === 404) return { valid: false, reason: 'Invalid or tampered token.' }
      throw error
    }
  }
  await delay(500)
  const id = tokenIndex.get(token)
  const rec = id ? store.get(id) : null
  if (!rec) return { valid: false, reason: 'Invalid or tampered token.' }
  return publicView(rec)
}

/**
 * Email the agreement PDF to a recipient. API.md exposes no such endpoint yet
 * (a likely future POST /agreements/{id}/email), so this is mock-only — it just
 * confirms the send so the AgreementView action has real feedback.
 */
async function email(id, recipient) {
  if (!USING_MOCK_AGREEMENTS) {
    const { data } = await api.post(`/agreements/${id}/email`, { recipient })
    return data
  }
  await delay(600)
  const rec = store.get(Number(id))
  if (!rec) throw { message: 'Agreement not found.', fieldErrors: {}, status: 404 }
  return { sent: true, recipient }
}

export default { generate, list, get, downloadPdf, verifyByToken, email }
