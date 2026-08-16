import api from './api'
import { BRANCHES, branchName } from '@/utils/constants'

/**
 * Dashboard aggregates.
 *
 * The API has no reports endpoint yet — only /auth, /customers and /health
 * exist. Per the build spec, the gap is mocked *in the service layer only*, so
 * every consumer above this file already talks to the real shape and swapping
 * to `GET /reports/dashboard` is a one-file change.
 *
 * What is REAL today: total customer count and the recent customers list, both
 * read from /customers. Everything under MOCK below is invented and must not be
 * read as backend truth.
 */

const MOCK = {
  activeAgreements: 18,
  fraudFlags: 4,
  totalRevenue: 14_650_000,

  trends: {
    // 12 points each, oldest → newest, for the stat card sparklines.
    customers: [6, 7, 7, 9, 8, 11, 12, 12, 14, 15, 17, 19],
    agreements: [3, 4, 6, 5, 8, 9, 11, 10, 13, 15, 16, 18],
    fraudFlags: [1, 0, 2, 1, 3, 2, 2, 4, 3, 5, 4, 4],
    revenue: [4.1, 4.9, 5.4, 6.2, 7.0, 8.1, 9.3, 10.2, 11.4, 12.6, 13.5, 14.65],
  },

  monthlyVolume: [
    { month: 'Aug', agreements: 6 },
    { month: 'Sep', agreements: 9 },
    { month: 'Oct', agreements: 7 },
    { month: 'Nov', agreements: 12 },
    { month: 'Dec', agreements: 15 },
    { month: 'Jan', agreements: 11 },
    { month: 'Feb', agreements: 14 },
    { month: 'Mar', agreements: 18 },
    { month: 'Apr', agreements: 16 },
    { month: 'May', agreements: 21 },
    { month: 'Jun', agreements: 19 },
    { month: 'Jul', agreements: 24 },
  ],

  fraudAlerts: [
    { id: 1, customerName: 'Sunil Fernando', docType: 'NIC', score: 87, raisedAt: '2026-07-21T09:14:00' },
    { id: 2, customerName: 'Rohan Jayasuriya', docType: 'Bank slip', score: 64, raisedAt: '2026-07-20T16:40:00' },
    { id: 3, customerName: 'Menaka Wickrama', docType: 'Bank book', score: 52, raisedAt: '2026-07-20T11:05:00' },
    { id: 4, customerName: 'Ishara Gunawardena', docType: 'NIC', score: 31, raisedAt: '2026-07-19T14:22:00' },
  ],

  notifications: [
    { id: 1, message: 'Agreement A-2043 was approved by head office.', at: '2026-07-22T08:30:00', severity: 'ok' },
    { id: 2, message: 'Document for Sunil Fernando flagged at 87.', at: '2026-07-21T09:14:00', severity: 'danger' },
    { id: 3, message: 'Three proposals are awaiting rep review.', at: '2026-07-21T07:55:00', severity: 'warn' },
    { id: 4, message: 'Monthly KPI targets published for August.', at: '2026-07-20T17:10:00', severity: 'info' },
  ],

  engines: [
    { id: 'ocr', name: 'OCR extraction', state: 'ok', detail: 'Operational' },
    { id: 'ela', name: 'ELA analysis', state: 'ok', detail: 'Operational' },
    { id: 'cnn', name: 'CNN forgery model', state: 'warn', detail: 'Degraded — elevated latency' },
    { id: 'siamese', name: 'Siamese duplicate match', state: 'ok', detail: 'Operational' },
  ],
}

/** True for anything the UI is showing that did not come from the API. */
export const USING_MOCK_AGGREGATES = true

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The formats the export control offers; `value` is the endpoint's `format`. */
export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
]

async function dashboard() {
  // Real: the customer count and the most recent registrations.
  const { data } = await api.get('/customers', { params: { page: 1, per_page: 5 } })

  return {
    stats: {
      totalCustomers: data.pagination.total,
      activeAgreements: MOCK.activeAgreements,
      fraudFlags: MOCK.fraudFlags,
      totalRevenue: MOCK.totalRevenue,
    },
    trends: MOCK.trends,
    recentCustomers: data.items,
    monthlyVolume: MOCK.monthlyVolume,
    fraudAlerts: MOCK.fraudAlerts,
    notifications: MOCK.notifications,
    engines: MOCK.engines,
  }
}

/* ------------------------------------------------------------ report search */

/**
 * Report records.
 *
 * `GET /reports/dashboard` and `GET /reports/export` are the only report
 * endpoints API.md defines, and neither answers the row-level question the
 * Reports screen asks — "which agreements did this rep issue in June". The
 * sample endpoint that does is
 *
 *   GET /reports/records?type&date_from&date_to&branch_id&rep&status&page
 *
 * answering `{ items, pagination, summary }`: the rows plus the aggregate over
 * the same filter set in one round trip, so the summary tiles and the table can
 * never disagree about which records they are describing.
 *
 * The fixtures are generated once from a fixed seed, so a row keeps its
 * reference, date and amount across reloads and a filter is reproducible.
 */

/**
 * The reps a report can be filtered by. Real builds fetch this — it is the same
 * roster /employees reports on — but it ships beside the data on purpose: the
 * filter must never offer a rep the record set does not contain. Branch ids
 * match the ones userService assigns, so filtering by branch and by rep agree.
 */
const REPS = [
  { id: 2, name: 'Nadeesha Wickramasinghe', branch_id: 1 },
  { id: 3, name: 'Tharindu Rajapaksa', branch_id: 1 },
  { id: 4, name: 'Ishara Gunawardena', branch_id: 2 },
  { id: 5, name: 'Chamath Dissanayake', branch_id: 2 },
  { id: 6, name: 'Sanduni Herath', branch_id: 3 },
  { id: 7, name: 'Mahesh Ekanayake', branch_id: 3 },
  { id: 8, name: 'Dilani Amarasinghe', branch_id: 3 },
  { id: 9, name: 'Ruwan Bandara', branch_id: 4 },
  { id: 10, name: 'Priyanka Silva', branch_id: 4 },
]

export const REP_OPTIONS = REPS.map((rep) => ({ value: String(rep.id), label: rep.name }))

const CUSTOMER_NAMES = [
  'Sunil Fernando', 'Rohan Jayasuriya', 'Menaka Wickrama', 'Kamala Perera',
  'Ajith Kumara', 'Nimali Senanayake', 'Dinesh Weerasinghe', 'Shalini Peiris',
  'Kasun Alwis', 'Thilini Madushani', 'Ravindu Pathirana', 'Hasitha Nanayakkara',
  'Anoma Ratnayake', 'Buddhika Samaraweera', 'Chathura Liyanage', 'Dilhani Kodikara',
  'Eranga Wijesuriya', 'Fathima Rizwan', 'Gayan Karunaratne', 'Harsha Balasooriya',
  'Iresha Kumarasinghe', 'Janaka Abeywickrama', 'Kavindu Tennakoon', 'Lakmini Jayawardena',
  'Manoj Seneviratne', 'Nadun Rathnayake', 'Oshadi Gamage', 'Pradeep Vitharana',
  'Rangana Hettiarachchi', 'Sachini Munasinghe', 'Tharaka Dassanayake', 'Udara Meegoda',
  'Vinodya Attanayake', 'Wasantha Galappaththi', 'Yasas Withanage', 'Zainab Hussain',
]

const DOC_LABELS = { nic: 'NIC', bank_slip: 'Bank slip', bank_book: 'Bank book', proposal_form: 'Proposal form' }

/** mulberry32 — one fixed seed, so every figure on the screen is reproducible. */
function seeded(seed) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let x = state
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// A rolling year up to the middle of August 2026, which is where the rest of the
// sample data sits. Dates are day-resolution for filtering, with a plausible
// working hour attached so the table's timestamps do not all read 00:00.
const WINDOW_START = new Date('2025-09-01T00:00:00')
const WINDOW_DAYS = 349

/**
 * Every record carries the same spine — reference, date, customer, branch, rep,
 * status — and each type adds what only it has. That is what lets one table
 * component render four report types by swapping its column list.
 */
function generate() {
  const rand = seeded(0x7c3a91)
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1))

  const weighted = (pairs) => {
    let roll = rand()
    for (const [value, weight] of pairs) {
      roll -= weight
      if (roll <= 0) return value
    }
    return pairs[pairs.length - 1][0]
  }

  // Local timestamps without a zone suffix, matching the rest of the fixtures in
  // this file. It also keeps `date.slice(0, 10)` — which is how the date filter
  // compares — identical to the day the table renders, which a UTC `Z` string
  // would not be for anyone far enough east.
  const pad = (value) => String(value).padStart(2, '0')

  const dateAt = () => {
    const date = new Date(WINDOW_START)
    date.setDate(date.getDate() + Math.floor(rand() * WINDOW_DAYS))
    date.setHours(8 + Math.floor(rand() * 9), Math.floor(rand() * 60), 0, 0)
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
    )
  }

  const spine = () => {
    const rep = pick(REPS)
    return {
      date: dateAt(),
      customer_name: pick(CUSTOMER_NAMES),
      rep_id: rep.id,
      rep_name: rep.name,
      branch_id: rep.branch_id,
    }
  }

  const newestFirst = (rows) => rows.sort((a, b) => b.date.localeCompare(a.date))

  const customers = newestFirst(
    Array.from({ length: 260 }, (_, index) => ({
      id: index + 1,
      ref: `CUS-${1000 + index}`,
      ...spine(),
      status: weighted([['verified', 0.66], ['pending', 0.23], ['flagged', 0.11]]),
    })),
  )

  const agreements = newestFirst(
    Array.from({ length: 190 }, (_, index) => ({
      id: index + 1,
      ref: `AGR-${2000 + index}`,
      ...spine(),
      status: weighted([['active', 0.7], ['pending', 0.19], ['cancelled', 0.11]]),
      // Investment amounts are quoted in whole 250k lots, which is how the
      // plantation packages are actually sold.
      amount: 250_000 * int(1, 14),
    })),
  )

  const proposals = newestFirst(
    Array.from({ length: 150 }, (_, index) => ({
      id: index + 1,
      ref: `PRP-${3000 + index}`,
      ...spine(),
      status: weighted([
        ['approved', 0.4], ['ho_review', 0.15], ['rep_review', 0.14],
        ['submitted', 0.16], ['rejected', 0.15],
      ]),
      amount: 250_000 * int(1, 14),
    })),
  )

  const documents = newestFirst(
    Array.from({ length: 280 }, (_, index) => {
      const status = weighted([['verified', 0.68], ['pending', 0.19], ['rejected', 0.13]])
      const docType = pick(Object.keys(DOC_LABELS))

      // Score follows the verdict rather than the reverse: a rejected document
      // is one the pipeline scored high, and a third of the pending queue has
      // not been through the engines yet, which is what `checked` counts.
      let score = null
      if (status === 'rejected') score = int(70, 97)
      else if (status === 'verified') score = int(2, 45)
      else if (rand() > 0.34) score = int(30, 82)

      return {
        id: index + 1,
        ref: `DOC-${4000 + index}`,
        ...spine(),
        status,
        doc_type: docType,
        doc_label: DOC_LABELS[docType],
        fraud_score: score,
      }
    }),
  )

  return { customers, agreements, proposals, documents }
}

const DATA = generate()

/* --------------------------------------------------------------- filtering */

/**
 * The scope filters — dates, branch, rep — apply to every record set, so they
 * move the table and the summary together. Report type and status narrow only
 * the table, which is why they are applied separately below.
 */
function inScope(record, { dateFrom, dateTo, branchId, rep }) {
  const day = record.date.slice(0, 10)
  if (dateFrom && day < dateFrom) return false
  if (dateTo && day > dateTo) return false
  if (branchId && String(record.branch_id) !== String(branchId)) return false
  if (rep && String(record.rep_id) !== String(rep)) return false
  return true
}

const FLAGGED_AT = 70

/**
 * The aggregate for a filter set.
 *
 * Revenue counts active agreements only — a pending or cancelled agreement is
 * not money booked — and the branch breakdown lists every branch, including the
 * ones with nothing, because a zero is the finding on that chart.
 *
 * The fraud figures are read off the document set in scope rather than off the
 * selected report type, so they stay answerable while an admin is looking at
 * agreements. `confirmed` is a document a human rejected after review; `flagged`
 * is one the pipeline scored at or above the danger band.
 */
function summarise(scope, typeRows) {
  const agreements = DATA.agreements.filter((row) => inScope(row, scope))
  const documents = DATA.documents.filter((row) => inScope(row, scope))
  const booked = agreements.filter((row) => row.status === 'active')

  const revenueByBranch = BRANCHES.map((branch) => ({
    branch_id: branch.id,
    branch: branch.name,
    revenue: booked
      .filter((row) => row.branch_id === branch.id)
      .reduce((total, row) => total + row.amount, 0),
  }))

  const byStatus = typeRows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1
    return counts
  }, {})

  const checked = documents.filter((row) => row.fraud_score != null)

  return {
    total: typeRows.length,
    byStatus,
    totalRevenue: booked.reduce((total, row) => total + row.amount, 0),
    agreementsBooked: booked.length,
    revenueByBranch,
    fraud: {
      documents: documents.length,
      checked: checked.length,
      flagged: checked.filter((row) => row.fraud_score >= FLAGGED_AT).length,
      confirmed: documents.filter((row) => row.status === 'rejected').length,
    },
  }
}

/** Filters → the query params the sample endpoint and /reports/export share. */
function toParams({ dateFrom, dateTo, branchId, rep, status, type }) {
  const params = {}
  if (type) params.type = type
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  if (branchId) params.branch_id = branchId
  if (rep) params.rep = rep
  if (status) params.status = status
  return params
}

/** GET /reports/records — rows plus the aggregate for the same filters. */
async function records({ type = 'customers', page = 1, perPage = 10, ...filters } = {}) {
  if (!USING_MOCK_AGGREGATES) {
    const { data } = await api.get('/reports/records', {
      params: { ...toParams({ ...filters, type }), page, per_page: perPage },
    })
    return { items: data.items, pagination: data.pagination, summary: data.summary }
  }

  await delay(350)

  const scope = {
    dateFrom: filters.dateFrom ?? '',
    dateTo: filters.dateTo ?? '',
    branchId: filters.branchId ?? '',
    rep: filters.rep ?? '',
  }

  const typeRows = (DATA[type] ?? DATA.customers).filter((row) => inScope(row, scope))
  const matched = filters.status ? typeRows.filter((row) => row.status === filters.status) : typeRows

  const total = matched.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(Math.max(1, Number(page)), pages)
  const start = (current - 1) * perPage

  return {
    items: matched.slice(start, start + perPage),
    pagination: {
      page: current,
      per_page: perPage,
      total,
      pages,
      has_next: current < pages,
      has_prev: current > 1,
    },
    // The summary describes the scope, not the page: `byStatus` counts every
    // record the dates and branch admit, so the status filter narrows the table
    // without hiding the breakdown that explains what else is there.
    summary: summarise(scope, typeRows),
  }
}

/* ------------------------------------------------------------------ export */

const DATE_ONLY = (value) => String(value ?? '').slice(0, 10)

/**
 * Export columns per report type. The export carries the same fields the table
 * shows, in the same order, so the file is not a different report to the one the
 * admin was reading when they pressed the button.
 */
const EXPORT_FIELDS = {
  customers: [
    { header: 'Reference', value: (row) => row.ref },
    { header: 'Registered', value: (row) => DATE_ONLY(row.date) },
    { header: 'Customer', value: (row) => row.customer_name },
    { header: 'Branch', value: (row) => branchName(row.branch_id) },
    { header: 'Sales rep', value: (row) => row.rep_name },
    { header: 'Status', value: (row) => row.status },
  ],
  agreements: [
    { header: 'Reference', value: (row) => row.ref },
    { header: 'Issued', value: (row) => DATE_ONLY(row.date) },
    { header: 'Customer', value: (row) => row.customer_name },
    { header: 'Branch', value: (row) => branchName(row.branch_id) },
    { header: 'Sales rep', value: (row) => row.rep_name },
    { header: 'Investment (LKR)', value: (row) => row.amount },
    { header: 'Status', value: (row) => row.status },
  ],
  proposals: [
    { header: 'Reference', value: (row) => row.ref },
    { header: 'Submitted', value: (row) => DATE_ONLY(row.date) },
    { header: 'Customer', value: (row) => row.customer_name },
    { header: 'Branch', value: (row) => branchName(row.branch_id) },
    { header: 'Sales rep', value: (row) => row.rep_name },
    { header: 'Investment (LKR)', value: (row) => row.amount },
    { header: 'Stage', value: (row) => row.status },
  ],
  documents: [
    { header: 'Reference', value: (row) => row.ref },
    { header: 'Uploaded', value: (row) => DATE_ONLY(row.date) },
    { header: 'Customer', value: (row) => row.customer_name },
    { header: 'Document', value: (row) => row.doc_label },
    { header: 'Branch', value: (row) => branchName(row.branch_id) },
    { header: 'Fraud score', value: (row) => (row.fraud_score == null ? 'Not checked' : row.fraud_score) },
    { header: 'Status', value: (row) => row.status },
  ],
}

/** RFC 4180 quoting: wrap every cell, double any quote inside it. */
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

const htmlCell = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The two formats the button offers.
 *
 * The real endpoint decides the bytes; the mock has to produce something a
 * spreadsheet will actually open, which is why `excel` writes an HTML table
 * under the Excel MIME type rather than pretending to build a .xlsx workbook.
 * Excel and LibreOffice both read it, and it keeps the mock honest about being
 * a stand-in.
 */
const FORMATS = {
  csv: {
    extension: 'csv',
    mime: 'text/csv;charset=utf-8',
    build: (fields, rows) =>
      [
        fields.map((field) => csvCell(field.header)).join(','),
        ...rows.map((row) => fields.map((field) => csvCell(field.value(row))).join(',')),
      ].join('\r\n'),
  },
  excel: {
    extension: 'xls',
    mime: 'application/vnd.ms-excel;charset=utf-8',
    build: (fields, rows) =>
      [
        '<html><head><meta charset="utf-8" /></head><body><table>',
        `<thead><tr>${fields.map((field) => `<th>${htmlCell(field.header)}</th>`).join('')}</tr></thead>`,
        '<tbody>',
        ...rows.map(
          (row) => `<tr>${fields.map((field) => `<td>${htmlCell(field.value(row))}</td>`).join('')}</tr>`,
        ),
        '</tbody></table></body></html>',
      ].join(''),
  },
}

/** `attachment; filename=customers-export.csv` → `customers-export.csv`. */
function filenameFrom(disposition) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(disposition ?? ''))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * GET /reports/export — the whole filtered set as a file, never just the page in
 * view. API.md answers with `text/csv` and a Content-Disposition filename, so
 * the response is read as a blob and the server's filename wins when it sends
 * one; the fallback below is only for when it does not.
 *
 * `onProgress` receives 0–100. On the real call that is the download fraction
 * reported by axios; the mock walks it so the determinate bar is exercised.
 */
async function exportReport({ type = 'customers', ...filters } = {}, { format = 'csv', onProgress } = {}) {
  const spec = FORMATS[format] ?? FORMATS.csv
  const fallbackName = `${type}-export-${DATE_ONLY(new Date().toISOString())}.${spec.extension}`

  if (!USING_MOCK_AGGREGATES) {
    const response = await api.get('/reports/export', {
      params: { ...toParams({ ...filters, type }), format },
      responseType: 'blob',
      onDownloadProgress: (event) => {
        onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0)
      },
    })

    onProgress?.(100)
    return {
      blob: response.data,
      filename: filenameFrom(response.headers?.['content-disposition']) ?? fallbackName,
    }
  }

  const scope = {
    dateFrom: filters.dateFrom ?? '',
    dateTo: filters.dateTo ?? '',
    branchId: filters.branchId ?? '',
    rep: filters.rep ?? '',
  }

  const typeRows = (DATA[type] ?? DATA.customers).filter((row) => inScope(row, scope))
  const rows = filters.status ? typeRows.filter((row) => row.status === filters.status) : typeRows

  // Twelve ticks over roughly a second — enough for the bar to read as a
  // measured download rather than a flicker.
  const steps = 12
  for (let step = 1; step <= steps; step += 1) {
    await delay(80)
    onProgress?.(Math.round((step / steps) * 100))
  }

  const fields = EXPORT_FIELDS[type] ?? EXPORT_FIELDS.customers
  return { blob: new Blob([spec.build(fields, rows)], { type: spec.mime }), filename: fallbackName }
}

export default { dashboard, records, exportReport }
