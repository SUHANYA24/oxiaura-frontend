import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Card, EmptyState, ErrorState, Select, Skeleton, Table } from '@/components/ui'
import KPIRing from '@/components/KPIRing'
import employeeService, { CURRENT_PERIOD, USING_MOCK_EMPLOYEES } from '@/services/employeeService'
import { MONTH_OPTIONS, ROLE_LABELS, branchName, kpiBand, yearOptions } from '@/utils/constants'
import { formatCompactCurrency, formatMonthYear, formatNumber, formatPercent } from '@/utils/formatters'
import { cn } from '@/utils/cn'

/* ---------------------------------------------------------------- helpers */

/** First and last initial — the monogram that stands in for a photo. */
function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

/**
 * The API returns `branch_id` alone — a branch *name* is a mock-only enrichment —
 * so the id is resolved through the shared BRANCHES table and only falls back to
 * "Branch 7" for an id that table does not know.
 */
function branchLabel(row) {
  if (row.branch) return row.branch
  return row.branch_id ? branchName(row.branch_id) : 'Unassigned'
}

/**
 * Target progress, deliberately monochrome: the ring beside it already carries
 * the severity, and two coloured meters on one card would compete.
 */
function TargetBar({ actual, target, label, className }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, (actual / target) * 100)) : 0

  return (
    <div
      role="meter"
      aria-valuenow={actual}
      aria-valuemin={0}
      aria-valuemax={target || undefined}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-200', className)}
    >
      <div
        className="h-full rounded-full bg-ink-950 transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------- card */

function EmployeeCard({ row, onOpen }) {
  const revenueTarget = Number(row.target_revenue)
  const revenueActual = Number(row.actual_revenue)

  return (
    <Card
      as="button"
      type="button"
      onClick={onOpen}
      hoverable
      aria-label={`Open the KPI tracker for ${row.full_name}`}
      className="w-full text-left"
      bodyClassName="p-5"
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 font-mono text-[13px] text-ink-950"
          aria-hidden="true"
        >
          {initials(row.full_name)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink-950">{row.full_name}</p>
          <p className="mt-0.5 truncate font-mono text-meta uppercase text-ink-400">
            {branchLabel(row)}
          </p>
          {/* Role is not a status, so it is a neutral mono chip rather than a
              coloured badge. */}
          <span className="badge badge-neutral mt-2 font-mono text-meta uppercase">
            {ROLE_LABELS[row.role] ?? row.role}
          </span>
        </div>

        <KPIRing value={row.revenue_achievement_pct} label={`${row.full_name} revenue achievement`} size={72} />
      </div>

      <dl className="mt-5 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="meta-label">Revenue</dt>
            <dd className="font-display text-[22px] leading-none text-ink-950">
              {formatCompactCurrency(revenueActual)}
            </dd>
          </div>
          <p className="mt-1 text-right text-[13px] text-ink-400">
            of {revenueTarget > 0 ? formatCompactCurrency(revenueTarget) : 'no target'}
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="meta-label">Customers</dt>
            <dd className="text-body tabular-nums text-ink-950">
              <span className="font-medium">{formatNumber(row.actual_customers)}</span>
              <span className="text-ink-400"> / {row.target_customers || '—'}</span>
            </dd>
          </div>
          <TargetBar
            actual={row.actual_customers}
            target={row.target_customers}
            label={`${row.full_name}: ${row.actual_customers} of ${row.target_customers} customers`}
            className="mt-2"
          />
        </div>
      </dl>
    </Card>
  )
}

/* ------------------------------------------------------------ leaderboard */

/**
 * Standing is by revenue booked, and it is fixed: sorting the table by name or
 * by customers reorders the rows but each one keeps the rank it earned, so the
 * column stays meaningful in every sort.
 */
function withRanks(rows) {
  const order = [...rows].sort(
    (a, b) => Number(b.actual_revenue) - Number(a.actual_revenue) || b.actual_customers - a.actual_customers,
  )
  const rankByUser = new Map(order.map((row, index) => [row.user_id, index + 1]))
  return rows.map((row) => ({ ...row, rank: rankByUser.get(row.user_id) }))
}

const COMPARATORS = {
  rank: (a, b) => a.rank - b.rank,
  full_name: (a, b) => a.full_name.localeCompare(b.full_name),
  actual_customers: (a, b) => a.actual_customers - b.actual_customers,
  actual_revenue: (a, b) => Number(a.actual_revenue) - Number(b.actual_revenue),
  // No target sorts to the bottom in either direction rather than reading as 0%.
  revenue_achievement_pct: (a, b) => (a.revenue_achievement_pct ?? -1) - (b.revenue_achievement_pct ?? -1),
}

function AchievementBadge({ pct }) {
  const band = kpiBand(pct)
  if (band.unset) return <Badge variant="neutral">No target</Badge>

  return (
    <Badge variant={band.variant}>
      {formatPercent(pct)} · {band.label}
    </Badge>
  )
}

/* ------------------------------------------------------------------- page */

export default function EmployeeList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // The period lives in the URL, so a month under review can be linked and
  // survives a refresh — and the tracker opens on the same month.
  const month = Number(searchParams.get('month')) || CURRENT_PERIOD.month
  const year = Number(searchParams.get('year')) || CURRENT_PERIOD.year

  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [sort, setSort] = useState({ key: 'rank', direction: 'asc' })

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const { items } = await employeeService.list({ month, year })
      setRows(withRanks(items))
      setStatus('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not load employees.')
      setStatus('error')
    }
  }, [month, year])

  useEffect(() => {
    load()
  }, [load])

  const setPeriod = (next) =>
    setSearchParams({ month: String(next.month ?? month), year: String(next.year ?? year) }, { replace: true })

  const sorted = useMemo(() => {
    const compare = COMPARATORS[sort.key] ?? COMPARATORS.rank
    const ordered = [...rows].sort(compare)
    return sort.direction === 'desc' ? ordered.reverse() : ordered
  }, [rows, sort])

  const openTracker = (row) => navigate(`/employees/${row.user_id}/kpi?month=${month}&year=${year}`)

  const columns = [
    {
      key: 'rank',
      header: '#',
      sortable: true,
      width: 64,
      // Standing is carried by type size, not by a medal colour: the top three
      // are set in the display serif, everyone else in the body scale.
      render: (row) => (
        <span
          className={cn(
            'font-display tabular-nums',
            row.rank <= 3 ? 'text-[22px] text-ink-950' : 'text-[15px] text-ink-400',
          )}
        >
          {row.rank}
        </span>
      ),
    },
    {
      key: 'full_name',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-950">{row.full_name}</p>
          <p className="mt-0.5 truncate font-mono text-meta uppercase text-ink-400">{branchLabel(row)}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="badge badge-neutral font-mono text-meta uppercase">
          {ROLE_LABELS[row.role] ?? row.role}
        </span>
      ),
    },
    {
      key: 'actual_customers',
      header: 'Customers',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">
          <span className="font-medium text-ink-950">{formatNumber(row.actual_customers)}</span>
          <span className="text-ink-400"> / {row.target_customers || '—'}</span>
        </span>
      ),
    },
    {
      key: 'actual_revenue',
      header: 'Revenue',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">
          <span className="font-medium text-ink-950">{formatCompactCurrency(row.actual_revenue)}</span>
          <span className="text-ink-400">
            {' / '}
            {Number(row.target_revenue) > 0 ? formatCompactCurrency(row.target_revenue) : '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'revenue_achievement_pct',
      header: 'Achievement',
      align: 'right',
      sortable: true,
      render: (row) => <AchievementBadge pct={row.revenue_achievement_pct} />,
    },
  ]

  const loading = status === 'loading'

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="mt-1 text-body text-ink-600">
            {loading ? 'Loading' : `${rows.length} ${rows.length === 1 ? 'employee' : 'employees'}`} ·{' '}
            {formatMonthYear(month, year)}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <Select
            label="Month"
            value={String(month)}
            onChange={(event) => setPeriod({ month: Number(event.target.value) })}
            options={MONTH_OPTIONS}
            wrapperClassName="w-40"
          />
          <Select
            label="Year"
            value={String(year)}
            onChange={(event) => setPeriod({ year: Number(event.target.value) })}
            options={yearOptions()}
            wrapperClassName="w-28"
          />
        </div>
      </header>

      {USING_MOCK_EMPLOYEES && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the employee and target endpoints are mocked in the service layer only.
        </p>
      )}

      {status === 'error' ? (
        <Card className="mt-6">
          <ErrorState description={error} onRetry={load} />
        </Card>
      ) : (
        <>
          {loading ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[228px] w-full" rounded="rounded-card" />
              ))}
            </div>
          ) : rows.length ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <EmployeeCard key={row.user_id} row={row} onOpen={() => openTracker(row)} />
              ))}
            </div>
          ) : (
            <Card className="mt-6">
              <EmptyState
                title="No employees for this period"
                description="No staff records came back for the selected month. Try another period."
              />
            </Card>
          )}

          <Card
            title="Leaderboard"
            description="Ranked by revenue booked this period. Sort any column — the rank stays with the employee."
            className="mt-8"
            padded={false}
            bodyClassName="p-0"
          >
            <Table
              columns={columns}
              data={sorted}
              loading={loading}
              sort={sort}
              onSort={setSort}
              rowKey={(row) => row.user_id}
              onRowClick={openTracker}
              emptyTitle="Nothing to rank yet"
              emptyDescription="Employee KPI rows will appear here once staff are registered."
            />
          </Card>
        </>
      )}
    </div>
  )
}



