import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { Badge, Button, Card, ErrorState, Input, Select, Skeleton, Table } from '@/components/ui'
import KPIRing from '@/components/KPIRing'
import employeeService, { CURRENT_PERIOD, USING_MOCK_EMPLOYEES } from '@/services/employeeService'
import { useAuth } from '@/hooks/useAuth'
import { MONTH_OPTIONS, ROLE_LABELS, ROLES, kpiBand, yearOptions } from '@/utils/constants'
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthShort,
  formatMonthYear,
  formatNumber,
  formatPercent,
} from '@/utils/formatters'
import { nonNegativeAmount, nonNegativeInteger } from '@/utils/validators'
import { AXIS_TICK, CHART, REFERENCE_DASH } from '@/utils/chartTokens'
import { cn } from '@/utils/cn'

/** Months of history behind the selected period, for the trend and breakdown. */
const HISTORY_WINDOW = 6

const METRICS = {
  revenue: {
    label: 'Revenue',
    actual: (row) => Number(row.actual_revenue),
    target: (row) => Number(row.target_revenue),
    pct: (row) => row.revenue_achievement_pct,
    format: formatCompactCurrency,
    formatFull: formatCurrency,
    axisWidth: 64,
  },
  customers: {
    label: 'Customers',
    actual: (row) => row.actual_customers,
    target: (row) => row.target_customers,
    pct: (row) => row.customer_achievement_pct,
    format: (value) => formatNumber(value),
    formatFull: (value) => formatNumber(value),
    axisWidth: 40,
  },
}

/** The API returns `branch_id` alone; the name is a mock-only enrichment. */
function branchLabel(row) {
  if (row?.branch) return row.branch
  return row?.branch_id ? `Branch ${row.branch_id}` : 'Unassigned'
}

/* ------------------------------------------------------------------ chart */

function TrendTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null
  const byKey = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry.value]))

  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-2 shadow-float">
      <p className="font-mono text-meta uppercase text-ink-400">{label}</p>
      <p className="mt-1 text-body text-ink-950">
        Actual <span className="font-medium tabular-nums">{metric.formatFull(byKey.actual)}</span>
      </p>
      <p className="text-body text-ink-600">
        Target{' '}
        <span className="tabular-nums">{byKey.target > 0 ? metric.formatFull(byKey.target) : 'not set'}</span>
      </p>
    </div>
  )
}

/**
 * Two series, so this one needs a key — but the distinction is the dash pattern,
 * not the tone, so it still reads in greyscale. The key is hand-built rather than
 * Recharts' <Legend/> to keep the mono meta type of the rest of the system.
 */
function ChartKey() {
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex items-center gap-2 font-mono text-meta uppercase text-ink-600">
        <svg width="18" height="2" aria-hidden="true">
          <line x1="0" y1="1" x2="18" y2="1" stroke={CHART.series} strokeWidth="2" />
        </svg>
        Actual
      </span>
      <span className="inline-flex items-center gap-2 font-mono text-meta uppercase text-ink-400">
        <svg width="18" height="2" aria-hidden="true">
          <line x1="0" y1="1" x2="18" y2="1" stroke={CHART.reference} strokeWidth="2" strokeDasharray={REFERENCE_DASH} />
        </svg>
        Target
      </span>
    </div>
  )
}

function TrendChart({ points, metric }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={4} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            width={metric.axisWidth}
            tickFormatter={metric.format}
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip metric={metric} />} cursor={{ stroke: CHART.grid }} />
          <Line
            type="monotone"
            dataKey="target"
            stroke={CHART.reference}
            strokeWidth={2}
            strokeDasharray={REFERENCE_DASH}
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={CHART.series}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 }}
            activeDot={{ r: 4, fill: CHART.series }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* The table twin: every plotted value stays reachable without the chart. */}
      <table className="sr-only">
        <caption>{metric.label} — actual against target, by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Actual</th>
            <th scope="col">Target</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{metric.formatFull(point.actual)}</td>
              <td>{point.target > 0 ? metric.formatFull(point.target) : 'not set'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Same segmented control as the customer status filter: one filled segment. */
function MetricToggle({ value, onChange }) {
  return (
    <div role="group" aria-label="Chart metric" className="inline-flex rounded-control border border-ink-200 bg-white p-0.5">
      {Object.entries(METRICS).map(([key, metric]) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={cn(
              'rounded-[6px] px-3 py-1.5 text-[13px] transition-colors duration-150 ease-out',
              active ? 'bg-ink-950 font-medium text-white' : 'text-ink-600 hover:text-ink-950',
            )}
          >
            {metric.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ ring panels */

function RingPanel({ title, row, metric }) {
  const actual = metric.actual(row)
  const target = metric.target(row)
  const pct = metric.pct(row)
  const band = kpiBand(pct)

  return (
    <Card title={title}>
      <div className="flex items-center gap-6">
        <KPIRing value={pct} label={`${title} achievement`} size={104} />

        <dl className="min-w-0 flex-1 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="meta-label">Actual</dt>
            <dd className="font-display text-[24px] leading-none text-ink-950">{metric.format(actual)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-ink-200 pt-3">
            <dt className="meta-label">Target</dt>
            <dd className="text-body tabular-nums text-ink-600">{target > 0 ? metric.format(target) : 'Not set'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-ink-200 pt-3">
            <dt className="meta-label">Status</dt>
            <dd>
              <Badge variant={band.variant}>{band.unset ? band.label : `${formatPercent(pct, 1)} · ${band.label}`}</Badge>
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------- target form */

/**
 * Monthly target setting — admin only, per API.md. A non-admin never sees the
 * form: the server would answer 403, and inviting a refusal is worse than
 * showing the figures read-only.
 *
 * The form always writes to the period being viewed. The page's month and year
 * selectors are the single control for "which month", so there is no second
 * period picker here that could disagree with the figures on screen.
 */
function TargetForm({ userId, month, year, row, onSaved }) {
  const [values, setValues] = useState({ customers: '', revenue: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Re-seed whenever the viewed period changes, or a save returns new figures.
  useEffect(() => {
    setValues({
      customers: String(row.target_customers ?? 0),
      revenue: String(Number(row.target_revenue) || 0),
    })
    setErrors({})
  }, [row.target_customers, row.target_revenue, month, year])

  const validate = (next) => ({
    target_customers: nonNegativeInteger(next.customers, 'Customer target'),
    target_revenue: nonNegativeAmount(next.revenue, 'Revenue target'),
  })

  const set = (field) => (event) => {
    const next = { ...values, [field]: event.target.value }
    setValues(next)
    // Clear an error as soon as the field becomes valid; do not raise a new one
    // mid-keystroke.
    setErrors((prev) => {
      const key = field === 'customers' ? 'target_customers' : 'target_revenue'
      if (!prev[key] || validate(next)[key]) return prev
      const { [key]: _cleared, ...rest } = prev
      return rest
    })
  }

  const blur = (field) => () => {
    const key = field === 'customers' ? 'target_customers' : 'target_revenue'
    const message = validate(values)[key]
    setErrors((prev) => ({ ...prev, ...(message ? { [key]: message } : {}) }))
  }

  const submit = async (event) => {
    event.preventDefault()

    const found = validate(values)
    const nextErrors = Object.fromEntries(Object.entries(found).filter(([, message]) => message))
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const target = await employeeService.setTarget(userId, {
        month,
        year,
        targetCustomers: values.customers,
        targetRevenue: values.revenue,
      })
      toast.success(`Targets saved for ${formatMonthYear(month, year)}.`)
      onSaved(target)
    } catch (err) {
      // Field errors land on the inputs; anything else is a toast.
      setErrors(err?.fieldErrors ?? {})
      if (!Object.keys(err?.fieldErrors ?? {}).length) {
        toast.error(err?.message ?? 'Could not save the targets.')
      }
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    values.customers !== String(row.target_customers ?? 0) ||
    Number(values.revenue) !== (Number(row.target_revenue) || 0)

  return (
    <Card title="Monthly targets" description={formatMonthYear(month, year)}>
      <form onSubmit={submit} noValidate>
        <div className="space-y-4">
          <Input
            label="Customer target"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={values.customers}
            onChange={set('customers')}
            onBlur={blur('customers')}
            error={errors.target_customers}
            hint={`${formatNumber(row.actual_customers)} booked so far this month.`}
          />

          <Input
            label="Revenue target"
            type="number"
            min="0"
            step="1000"
            inputMode="decimal"
            prefix={<span className="font-mono text-[11px]">Rs</span>}
            value={values.revenue}
            onChange={set('revenue')}
            onBlur={blur('revenue')}
            error={errors.target_revenue}
            hint={`${formatCurrency(row.actual_revenue)} booked so far this month.`}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-ink-200 pt-4">
          <p className="text-[13px] text-ink-600">
            Actuals already booked are preserved — a target upsert never rewrites them.
          </p>
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
            Save targets
          </Button>
        </div>
      </form>
    </Card>
  )
}

/** What a head-office reviewer sees instead of the form. */
function TargetSummary({ month, year, row }) {
  return (
    <Card title="Monthly targets" description={formatMonthYear(month, year)}>
      <dl className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="meta-label">Customer target</dt>
          <dd className="text-body tabular-nums text-ink-950">{row.target_customers || 'Not set'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-ink-200 pt-3">
          <dt className="meta-label">Revenue target</dt>
          <dd className="text-body tabular-nums text-ink-950">
            {Number(row.target_revenue) > 0 ? formatCurrency(row.target_revenue) : 'Not set'}
          </dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-ink-200 pt-4 text-[13px] text-ink-600">
        Only an administrator can change monthly targets.
      </p>
    </Card>
  )
}

/* ------------------------------------------------------------------- page */

const samePeriod = (a, b) => Number(a.month) === Number(b.month) && Number(a.year) === Number(b.year)

export default function KPITracker() {
  const { id } = useParams()
  const { role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Arriving from the employee list carries its period across, so the tracker
  // opens on the month that was being reviewed.
  const month = Number(searchParams.get('month')) || CURRENT_PERIOD.month
  const year = Number(searchParams.get('year')) || CURRENT_PERIOD.year

  const [row, setRow] = useState(null)
  const [series, setSeries] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [metricKey, setMetricKey] = useState('revenue')

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const [employee, history] = await Promise.all([
        employeeService.get(id, { month, year }),
        employeeService.history(id, { months: HISTORY_WINDOW, month, year }),
      ])
      setRow(employee)
      setSeries(history)
      setStatus('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not load this employee.')
      setStatus('error')
    }
  }, [id, month, year])

  useEffect(() => {
    load()
  }, [load])

  const setPeriod = (next) =>
    setSearchParams({ month: String(next.month ?? month), year: String(next.year ?? year) }, { replace: true })

  const metric = METRICS[metricKey]

  const points = useMemo(
    () =>
      series.map((point) => ({
        label: formatMonthShort(point.month, point.year),
        actual: metric.actual(point),
        target: metric.target(point),
      })),
    [series, metric],
  )

  /**
   * A saved target comes back as a target row, not an employee row. Folding its
   * figures into the row and the history point for the same period is what makes
   * the save reflect immediately — no refetch, no skeleton flash, and the ring
   * and the chart move together because they read the same state.
   */
  const applyTarget = useCallback((target) => {
    const patch = {
      target_customers: target.target_customers,
      actual_customers: target.actual_customers,
      target_revenue: target.target_revenue,
      actual_revenue: target.actual_revenue,
      customer_achievement_pct: target.customer_achievement_pct,
      revenue_achievement_pct: target.revenue_achievement_pct,
    }
    setRow((prev) => (prev && samePeriod(prev, target) ? { ...prev, ...patch } : prev))
    setSeries((prev) => prev.map((point) => (samePeriod(point, target) ? { ...point, ...patch } : point)))
  }, [])

  // The breakdown stays monochrome: the rings above carry the severity for the
  // period on screen, and a column of coloured percentages would drown them.
  const breakdownColumns = [
    {
      key: 'period',
      header: 'Period',
      render: (point) => (
        <span className={cn(samePeriod(point, { month, year }) && 'font-medium text-ink-950')}>
          {formatMonthYear(point.month, point.year)}
        </span>
      ),
    },
    {
      key: 'customers',
      header: 'Customers',
      align: 'right',
      render: (point) => (
        <span className="tabular-nums">
          <span className="text-ink-950">{formatNumber(point.actual_customers)}</span>
          <span className="text-ink-400"> / {point.target_customers || '—'}</span>
        </span>
      ),
    },
    {
      key: 'customer_achievement_pct',
      header: 'Cust. %',
      align: 'right',
      render: (point) => (
        <span className="tabular-nums text-ink-600">{formatPercent(point.customer_achievement_pct)}</span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (point) => (
        <span className="tabular-nums">
          <span className="text-ink-950">{formatCompactCurrency(point.actual_revenue)}</span>
          <span className="text-ink-400">
            {' / '}
            {Number(point.target_revenue) > 0 ? formatCompactCurrency(point.target_revenue) : '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'revenue_achievement_pct',
      header: 'Rev. %',
      align: 'right',
      render: (point) => (
        <span className="tabular-nums text-ink-600">{formatPercent(point.revenue_achievement_pct)}</span>
      ),
    },
  ]

  const loading = status === 'loading'
  const canSetTargets = role === ROLES.ADMIN

  const backLink = (
    <Link to="/employees" className="btn btn-ghost btn-sm">
      <span aria-hidden="true">←</span> Employees
    </Link>
  )

  const periodPicker = (
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
  )

  if (status === 'error') {
    return (
      <div className="animate-page-enter">
        {backLink}
        <Card className="mt-6">
          <ErrorState description={error} onRetry={load} />
        </Card>
      </div>
    )
  }

  if (loading || !row) {
    return (
      <div className="animate-page-enter">
        {backLink}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[196px] w-full" rounded="rounded-card" />
          <Skeleton className="h-[196px] w-full" rounded="rounded-card" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[380px] w-full lg:col-span-2" rounded="rounded-card" />
          <Skeleton className="h-[380px] w-full" rounded="rounded-card" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-page-enter">
      {backLink}

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">{row.full_name}</h1>
          <p className="mt-1 font-mono text-meta uppercase text-ink-400">
            {branchLabel(row)} · {ROLE_LABELS[row.role] ?? row.role} · {row.email}
          </p>
          {!row.is_active && (
            <Badge variant="neutral" className="mt-2">
              Inactive
            </Badge>
          )}
        </div>
        {periodPicker}
      </header>

      {USING_MOCK_EMPLOYEES && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the employee and target endpoints are mocked in the service layer only.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RingPanel title="Revenue" row={row} metric={METRICS.revenue} />
        <RingPanel title="Customers" row={row} metric={METRICS.customers} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Trend"
          description={`The ${HISTORY_WINDOW} months to ${formatMonthYear(month, year)}`}
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MetricToggle value={metricKey} onChange={setMetricKey} />
            <ChartKey />
          </div>
          <div className="mt-5">
            <TrendChart points={points} metric={metric} />
          </div>
        </Card>

        {canSetTargets ? (
          <TargetForm userId={id} month={month} year={year} row={row} onSaved={applyTarget} />
        ) : (
          <TargetSummary month={month} year={year} row={row} />
        )}
      </div>

      <Card
        title="Period breakdown"
        description="Newest first. The selected month is set in medium weight."
        className="mt-6"
        padded={false}
        bodyClassName="p-0"
      >
        <Table
          columns={breakdownColumns}
          data={[...series].reverse()}
          rowKey={(point) => `${point.year}-${point.month}`}
          emptyTitle="No history yet"
          emptyDescription="Monthly KPI rows will appear here once targets and actuals accumulate."
        />
      </Card>
    </div>
  )
}



