import api, { DOWNLOAD_TIMEOUT } from './api'
import { BRANCHES, branchName } from '@/utils/constants'

/**
 * Reporting: the dashboard aggregate, the report search, and the CSV export.
 *
 * `GET /reports/dashboard` is **live**. It answers exactly four groups —
 * customers (total + by_status), agreements (total + by_status +
 * total_investment), fraud (documents_total, checked, flagged) and
 * revenue_by_branch — and nothing else. The sparklines, month-by-month agreement
 * volume, per-engine health and notification feed that used to come out of this
 * file were invented; there is no endpoint behind any of them, so they are gone
 * rather than mocked. What the dashboard shows now is what the backend counts.
 *
 * Both report endpoints are management-only (`admin`, `head_office_staff`); a
 * sales rep gets 403. The dashboard is a route every role can open, so the
 * aggregate call is expected to fail for a rep: it is made with `skipErrorToast`
 * and a 403 degrades to `scope: 'own'` — the customer figures they can see, and
 * dashes for the rest — instead of an error page for a request they never made.
 *
 * `GET /reports/export` is live too, but it is narrower than the export control
 * above it: **customers only, CSV only**, filtered by `date_from`, `date_to`,
 * `branch_id` and `rep`. It is exposed as its own `exportCustomersCsv()` so the
 * generic `exportReport()` can keep matching the table it was pressed from.
 */

/**
 * Row-level report search. `GET /reports/records` does not exist — the only
 * report endpoints are the dashboard and the customers CSV — so the Reports
 * screen's table, its summary tiles and the file `exportReport()` builds all come
 * from the fixtures below. They agree with each other and with nothing on the
 * server; the page says so.
 */
export const USING_MOCK_REPORT_RECORDS = true

/**
 * Kept for consumers that ask "is anything on this screen invented?". The
 * dashboard aggregate is real now; the report search is not.
 */
export const USING_MOCK_AGGREGATES = USING_MOCK_REPORT_RECORDS

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The formats the export control offers; `value` is the endpoint's `format`. */
export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
]

/**
 * The dashboard aggregate, plus the recent-registrations list.
 *
 * Two calls in parallel: `/customers` (scoped server-side, so every role gets an
 * answer) and `/reports/dashboard` (management-only). The second is allowed to
 * fail — 403 for a rep is the normal case, and a 5xx should not blank a page
 * whose other half loaded — so its failure is reported alongside the data as
 * `unavailable` rather than thrown.
 */
async function dashboard() {
  const recent = api.get('/customers', { params: { page: 1, per_page: 5 } })

  const aggregate = api
    .get('/reports/dashboard', { skipErrorToast: true })
    .then(({ data }) => ({ data, unavailable: null }))
    .catch((error) => ({
      data: null,
      unavailable:
        error?.status === 403
          ? 'forbidden'
          : (error?.message ?? 'The aggregate figures could not be loaded.'),
    }))

  const [{ data: customers }, report] = await Promise.all([recent, aggregate])
  const figures = report.data

  return {
    // 'own' means the caller is a rep: the only figures on the screen are the
    // ones /customers gave us for their own book.
    scope: figures ? 'all' : 'own',
    unavailable: report.unavailable === 'forbidden' ? null : report.unavailable,
    stats: {
      totalCustomers: figures?.customers?.total ?? customers.pagination.total,
      activeAgreements: figures?.agreements?.by_status?.active ?? null,
      fraudFlags: figures?.fraud?.flagged ?? null,
      totalRevenue: figures ? Number(figures.agreements?.total_investment ?? 0) : null,
    },
    customersByStatus: figures?.customers?.by_status ?? null,
    agreements: figures?.agreements ?? null,
    fraud: figures?.fraud ?? null,
    // `revenue_by_branch` omits branches with no booked investment and reps with
    // no branch, so an empty array is a real answer ("nothing booked"), not a
    // missing one. `branch_name` comes from the join; the id fallback is only for
    // safety.
    revenueByBranch: (figures?.revenue_by_branch ?? []).map((row) => ({
      branch_id: row.branch_id,
      branch: row.branch_name ?? branchName(row.branch_id),
      revenue: Number(row.total_investment ?? 0),
    })),
    recentCustomers: customers.items,
  }
}

/* ------------------------------------------------------------ report search */

/**
 * Report records.
 *
 * `GET /reports/dashboard` and `GET /reports/export` are the only report
 * endpoints the API has, and neither answers the row-level question the Reports
 * screen asks — "which agreements did this rep issue in June". The endpoint that
 * would is
 *
 *   GET /reports/records?type&date_from&date_to&branch_id&rep&status&page
 *
 * answering `{ items, pagination, summary }`: the rows plus the aggregate over
 * the same filter set in one round trip, so the summary tiles and the table can
 * never disagree about which records they are describing. It does not exist, so
 * everything below is a fixture and the page labels it as sample data.
 *
 * The fixtures are generated once from a fixed seed, so a row keeps its
 * reference, date and amount across reloads and a filter is reproducible.
 */

/**
 * The reps a report can be filtered by. It ships beside the data on purpose: the
 * filter must never offer a rep the record set does not contain. Branch ids stay
 * inside the two the backend seeds, so filtering by branch and by rep agree with
 * each other and with `BRANCHES`.
 */
const REPS = [
  { id: 2, name: 'Nadeesha Wickramasinghe', branch_id: 1 },
  { id: 3, name: 'Tharindu Rajapaksa', branch_id: 1 },
  { id: 4, name: 'Ishara Gunawardena', branch_id: 2 },
  { id: 5, name: 'Chamath Dissanayake', branch_id: 2 },
  { id: 6, name: 'Sanduni Herath', branch_id: 1 },
  { id: 7, name: 'Mahesh Ekanayake', branch_id: 2 },
  { id: 8, name: 'Dilani Amarasinghe', branch_id: 1 },
  { id: 9, name: 'Ruwan Bandara', branch_id: 2 },
  { id: 10, name: 'Priyanka Silva', branch_id: 1 },
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

/** Filters → the query params `/reports/export` understands. */
function toParams({ dateFrom, dateTo, branchId, rep }) {
  const params = {}
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  if (branchId) params.branch_id = branchId
  if (rep) params.rep = rep
  return params
}

/**
 * The rows plus the aggregate for one filter set. Fixtures — see the note above
 * `REPS`; there is no records endpoint to call, so there is no live branch to
 * keep beside this one.
 */
async function records({ type = 'customers', page = 1, perPage = 10, ...filters } = {}) {
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
 * The filtered record set as a file. This exports what the table above it is
 * showing — the fixtures, in the same columns, in the same order — so the file is
 * never a different report to the one the admin was reading when they pressed the
 * button. The server's own export is a different, narrower report; it has its own
 * function below.
 *
 * `onProgress` receives 0–100, walked here so the determinate bar is exercised.
 */
async function exportReport({ type = 'customers', ...filters } = {}, { format = 'csv', onProgress } = {}) {
  const spec = FORMATS[format] ?? FORMATS.csv
  const filename = `${type}-export-${DATE_ONLY(new Date().toISOString())}.${spec.extension}`

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
  return { blob: new Blob([spec.build(fields, rows)], { type: spec.mime }), filename }
}

/**
 * GET /reports/export — the real thing, and the only export the API offers:
 * **customers, as CSV**, filtered by `date_from`, `date_to`, `branch_id` and
 * `rep`. No report type and no format to choose; a bad date is a 422.
 *
 * The response is `text/csv` with a Content-Disposition filename, so it is read
 * as a blob and the server's name wins when it sends one. This is live data —
 * unlike `exportReport()` above — which is why the two are separate calls rather
 * than one function with a flag.
 */
async function exportCustomersCsv(filters = {}, { onProgress } = {}) {
  const response = await api.get('/reports/export', {
    params: toParams(filters),
    responseType: 'blob',
    timeout: DOWNLOAD_TIMEOUT,
    onDownloadProgress: (event) => {
      onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0)
    },
  })

  onProgress?.(100)
  return {
    blob: response.data,
    filename:
      filenameFrom(response.headers?.['content-disposition']) ??
      `customers-export-${DATE_ONLY(new Date().toISOString())}.csv`,
  }
}

export default { dashboard, records, exportReport, exportCustomersCsv }
