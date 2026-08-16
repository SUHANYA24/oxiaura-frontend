import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Select,
  Skeleton,
  Table,
} from '@/components/ui'
import reportService, {
  EXPORT_FORMATS,
  REP_OPTIONS,
  USING_MOCK_AGGREGATES,
} from '@/services/reportService'
import {
  BRANCH_OPTIONS,
  REPORT_TYPE_OPTIONS,
  branchName,
  fraudVerdict,
  reportType,
  statusOptionsFor,
} from '@/utils/constants'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
} from '@/utils/formatters'
import { dateRange as validateDateRange } from '@/utils/validators'
import { AXIS_TICK, CHART } from '@/utils/chartTokens'
import { cn } from '@/utils/cn'

const PER_PAGE = 10

const BRANCH_FILTER_OPTIONS = [{ value: '', label: 'All branches' }, ...BRANCH_OPTIONS]
const REP_FILTER_OPTIONS = [{ value: '', label: 'All reps' }, ...REP_OPTIONS]

/* ---------------------------------------------------------------- download */

/**
 * Hand the blob to the browser. The object URL is revoked straight after the
 * click so a long session does not accumulate them.
 */
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

/* ------------------------------------------------------------------ pieces */

/**
 * A summary figure. `danger` is opt-in per tile rather than derived, because on
 * this screen only two numbers earn colour — flagged documents and confirmed
 * fraud. A large revenue figure is not an alarm.
 */
function Figure({ label, value, hint, danger = false }) {
  return (
    <div className="px-5 py-4">
      <p className="meta-label">{label}</p>
      <p
        className={cn(
          'mt-2 font-display text-stat leading-none',
          danger ? 'text-state-danger' : 'text-ink-950',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[13px] text-ink-400">{hint}</p>}
    </div>
  )
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-2 shadow-float">
      <p className="font-mono text-meta uppercase text-ink-400">{label}</p>
      <p className="mt-1 text-body font-medium tabular-nums text-ink-950">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

/**
 * Revenue booked per branch. One series in ink.950, horizontal gridlines only,
 * and a table twin so the figures are reachable without the chart.
 */
function RevenueByBranch({ data }) {
  const anyRevenue = data.some((row) => row.revenue > 0)

  if (!anyRevenue) {
    return (
      <EmptyState
        title="No revenue in this range"
        description="No agreements were activated for the selected dates, branch and rep."
      />
    )
  }

  return (
    <div className="p-6">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={4} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            width={64}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />
          <Tooltip content={<RevenueTooltip />} cursor={{ fill: CHART.cursor }} />
          <Bar dataKey="revenue" fill={CHART.series} barSize={36} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="sr-only">
        <caption>Revenue booked per branch for the selected filters</caption>
        <thead>
          <tr>
            <th scope="col">Branch</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.branch_id}>
              <th scope="row">{row.branch}</th>
              <td>{formatCurrency(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------------------------------------------------------- columns */

const REF_CELL = (row) => <span className="font-mono text-[13px] text-ink-600">{row.ref}</span>

const PERSON_CELL = (row) => (
  <div className="min-w-0">
    <p className="truncate font-medium text-ink-950">{row.customer_name}</p>
    <p className="mt-0.5 truncate font-mono text-meta uppercase text-ink-400">
      {branchName(row.branch_id)}
    </p>
  </div>
)

const AMOUNT_CELL = (row) => (
  <span className="tabular-nums font-medium text-ink-950">{formatCurrency(row.amount)}</span>
)

const REP_CELL = (row) => <span className="text-ink-600">{row.rep_name}</span>

/**
 * One column set per report type. The status column reads its label and variant
 * from the type's own status map, so a proposal stage and a customer state never
 * borrow each other's vocabulary or colour.
 */
function columnsFor(type) {
  const { statuses } = reportType(type)

  const statusColumn = {
    key: 'status',
    header: type === 'proposals' ? 'Stage' : 'Status',
    align: 'right',
    render: (row) => {
      const state = statuses[row.status]
      return <Badge variant={state?.variant ?? 'neutral'}>{state?.label ?? row.status}</Badge>
    },
  }

  const dateHeader = {
    customers: 'Registered',
    agreements: 'Issued',
    proposals: 'Submitted',
    documents: 'Uploaded',
  }[type]

  const base = [
    { key: 'ref', header: 'Reference', width: 130, render: REF_CELL },
    {
      key: 'date',
      header: dateHeader,
      width: 130,
      render: (row) => <span className="tabular-nums text-ink-600">{formatDate(row.date)}</span>,
    },
    { key: 'customer_name', header: 'Customer', render: PERSON_CELL },
  ]

  if (type === 'documents') {
    return [
      ...base,
      {
        key: 'doc_label',
        header: 'Document',
        render: (row) => (
          <span className="badge badge-neutral font-mono text-meta uppercase">{row.doc_label}</span>
        ),
      },
      {
        key: 'fraud_score',
        header: 'Fraud score',
        align: 'right',
        render: (row) => {
          if (row.fraud_score == null) return <span className="text-ink-400">Not checked</span>
          const band = fraudVerdict(row.fraud_score)
          return (
            <span className="inline-flex items-center gap-2">
              <span className="tabular-nums font-medium text-ink-950">{row.fraud_score}</span>
              <Badge variant={band.variant}>{band.verdict}</Badge>
            </span>
          )
        },
      },
      statusColumn,
    ]
  }

  if (type === 'customers') {
    return [...base, { key: 'rep_name', header: 'Sales rep', render: REP_CELL }, statusColumn]
  }

  return [
    ...base,
    { key: 'rep_name', header: 'Sales rep', render: REP_CELL },
    { key: 'amount', header: 'Investment', align: 'right', render: AMOUNT_CELL },
    statusColumn,
  ]
}

/* ------------------------------------------------------------------- page */

const FILTER_KEYS = ['type', 'from', 'to', 'branch', 'rep', 'status']

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters live in the URL so a report can be linked, refreshed and shared —
  // and so the export sends the same set the reader is looking at.
  const type = searchParams.get('type') || 'customers'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const branchId = searchParams.get('branch') || ''
  const rep = searchParams.get('rep') || ''
  const statusFilter = searchParams.get('status') || ''
  const page = Number(searchParams.get('page')) || 1

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 })
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)

  const [format, setFormat] = useState('csv')
  const [exportPct, setExportPct] = useState(null)

  const rangeError = validateDateRange(from, to)

  const patch = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key)
      else next.set(key, String(value))
    })
    // Any filter change resets paging: page 4 of the previous result set does
    // not describe the new one.
    if (!keepPage) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const filters = useMemo(
    () => ({ type, dateFrom: from, dateTo: to, branchId, rep, status: statusFilter }),
    [type, from, to, branchId, rep, statusFilter],
  )

  const load = useCallback(async () => {
    // An inverted range would come back empty and read as "no records", which
    // is the wrong answer to a typo. Hold the request until it is fixed.
    if (rangeError) return

    setState('loading')
    setError(null)
    try {
      const result = await reportService.records({ ...filters, page, perPage: PER_PAGE })
      setRows(result.items)
      setPagination(result.pagination)
      setSummary(result.summary)
      setState('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not run the report.')
      setState('error')
    }
  }, [filters, page, rangeError])

  useEffect(() => {
    load()
  }, [load])

  // Changing the report type invalidates the status vocabulary, so the status
  // filter is dropped rather than carried into a set that has no such value.
  const onTypeChange = (value) => patch({ type: value, status: '' })

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)
    FILTER_KEYS.forEach((key) => next.delete(key))
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const runExport = async () => {
    setExportPct(0)
    try {
      const { blob, filename } = await reportService.exportReport(filters, {
        format,
        onProgress: setExportPct,
      })
      saveBlob(blob, filename)
      toast.success(`Exported ${filename}.`)
    } catch (err) {
      toast.error(err?.message ?? 'The export could not be generated.')
    } finally {
      setExportPct(null)
    }
  }

  const meta = reportType(type)
  const columns = useMemo(() => columnsFor(type), [type])
  const loading = state === 'loading'
  const exporting = exportPct != null
  const filtered = Boolean(from || to || branchId || rep || statusFilter)

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="mt-1 text-body text-ink-600">
            {meta.label}
            {loading || !summary
              ? ' · loading'
              : ` · ${formatNumber(pagination.total)} ${pagination.total === 1 ? meta.noun : `${meta.noun}s`}`}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <Select
            label="Format"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            options={EXPORT_FORMATS}
            wrapperClassName="w-32"
            disabled={exporting}
          />
          <Button
            variant="primary"
            onClick={runExport}
            loading={exporting}
            disabled={Boolean(rangeError)}
          >
            Export
          </Button>
        </div>
      </header>

      {USING_MOCK_AGGREGATES && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the report record and export endpoints are mocked in the service layer only.
        </p>
      )}

      {/* The export bar is determinate and appears only while a download is in
          flight, so the button's spinner is not the only signal on a long file. */}
      {exporting && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] text-ink-600">
              Preparing the {format === 'excel' ? 'Excel' : 'CSV'} export
            </p>
            <p className="font-mono text-meta tabular-nums text-ink-400">{exportPct}%</p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
            <div
              className="h-full rounded-full bg-ink-950 transition-[width] duration-150 ease-out"
              style={{ width: `${exportPct}%` }}
            />
          </div>
        </div>
      )}

      <Card
        className="mt-6"
        bodyClassName="p-4"
        title="Filters"
        description="Dates, branch and rep apply to every figure on this page. The report type and status narrow the table."
        actions={
          filtered ? (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Select
            label="Report"
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
            options={REPORT_TYPE_OPTIONS}
          />
          <Input
            label="From"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => patch({ from: event.target.value })}
          />
          <Input
            label="To"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => patch({ to: event.target.value })}
            error={rangeError}
          />
          <Select
            label="Branch"
            value={branchId}
            onChange={(event) => patch({ branch: event.target.value })}
            options={BRANCH_FILTER_OPTIONS}
          />
          <Select
            label="Sales rep"
            value={rep}
            onChange={(event) => patch({ rep: event.target.value })}
            options={REP_FILTER_OPTIONS}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => patch({ status: event.target.value })}
            options={statusOptionsFor(type)}
          />
        </div>
      </Card>

      {rangeError ? (
        <Card className="mt-6">
          <EmptyState
            title="Check the date range"
            description={rangeError}
            actionLabel="Clear the dates"
            onAction={() => patch({ from: '', to: '' })}
          />
        </Card>
      ) : state === 'error' ? (
        <Card className="mt-6">
          <ErrorState description={error} onRetry={load} />
        </Card>
      ) : (
        <>
          {loading || !summary ? (
            <Skeleton className="mt-6 h-[104px] w-full" rounded="rounded-card" />
          ) : (
            <Card className="mt-6" padded={false} bodyClassName="p-0">
              <div className="grid grid-cols-1 divide-y divide-ink-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 sm:divide-x">
                <Figure
                  label={`${meta.noun}s in range`}
                  value={formatNumber(summary.total)}
                  hint={filtered ? 'Matching the current filters' : 'All records'}
                />
                <Figure
                  label="Revenue booked"
                  value={formatCompactCurrency(summary.totalRevenue)}
                  hint={`${formatNumber(summary.agreementsBooked)} active agreements`}
                />
                {/* The only two figures on this page that carry colour. */}
                <Figure
                  label="Documents flagged"
                  value={formatNumber(summary.fraud.flagged)}
                  hint={`of ${formatNumber(summary.fraud.checked)} checked`}
                  danger={summary.fraud.flagged > 0}
                />
                <Figure
                  label="Confirmed fraud"
                  value={formatNumber(summary.fraud.confirmed)}
                  hint="Rejected after human review"
                  danger={summary.fraud.confirmed > 0}
                />
              </div>
            </Card>
          )}

          <Card
            title="Revenue by branch"
            description="Active agreements only — pending and cancelled agreements are not money booked."
            className="mt-6"
            padded={false}
            bodyClassName="p-0"
          >
            {loading || !summary ? (
              <div className="p-6">
                <Skeleton className="h-[260px] w-full" rounded="rounded-card" />
              </div>
            ) : (
              <RevenueByBranch data={summary.revenueByBranch} />
            )}
          </Card>

          <Card
            title={meta.label}
            description={
              statusFilter
                ? `Filtered to one status. The figures above still describe every ${meta.noun} in range.`
                : `Every ${meta.noun} matching the dates, branch and rep.`
            }
            className="mt-6"
            padded={false}
            bodyClassName="p-0"
          >
            <Table
              columns={columns}
              data={rows}
              loading={loading}
              rowKey={(row) => `${type}-${row.id}`}
              emptyTitle={`No ${meta.noun}s found`}
              emptyDescription="Nothing matches these filters. Widen the date range, or clear the status."
            />
            {!loading && rows.length > 0 && (
              <Pagination
                page={pagination.page}
                pageSize={PER_PAGE}
                total={pagination.total}
                onPageChange={(next) => patch({ page: next }, { keepPage: true })}
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}
