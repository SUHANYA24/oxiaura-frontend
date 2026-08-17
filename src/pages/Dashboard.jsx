import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, EmptyState, ErrorState, Skeleton, Table } from '@/components/ui'
import StatCard from '@/components/StatCard'
import reportService from '@/services/reportService'
import { AGREEMENT_STATUS, CUSTOMER_STATUS } from '@/utils/constants'
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from '@/utils/formatters'
import { AXIS_TICK, CHART } from '@/utils/chartTokens'
import { cn } from '@/utils/cn'

/**
 * Everything on this page is a figure `GET /reports/dashboard` actually returns:
 * the two status breakdowns, the fraud screening counts, and investment booked
 * per branch. There are no sparklines and no month-on-month deltas because the
 * endpoint reports no history — a trend line here would be decoration.
 *
 * The aggregate is management-only, so a sales rep sees their own customer count
 * and dashes elsewhere (`scope: 'own'`), not an error.
 */

/* ------------------------------------------------------------------ chart */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-2 shadow-float">
      <p className="font-mono text-meta uppercase text-ink-400">{label}</p>
      <p className="mt-1 text-body text-ink-950">
        <span className="font-medium tabular-nums">{formatCurrency(payload[0].value)}</span> booked
      </p>
    </div>
  )
}

/**
 * Single series, so no legend — the card title says what is plotted. Gridlines
 * are solid hairlines rather than dashed, and only horizontal: vertical rules
 * on a categorical axis add ink without adding information.
 */
function RevenueChart({ data }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="branch" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={4} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            width={64}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursor }} />
          <Bar dataKey="revenue" fill={CHART.series} barSize={40} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* The table twin: every plotted value stays reachable without the chart,
          so the tooltip enhances rather than gates. */}
      <table className="sr-only">
        <caption>Investment booked per branch</caption>
        <thead>
          <tr>
            <th scope="col">Branch</th>
            <th scope="col">Booked</th>
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
    </>
  )
}

/* ------------------------------------------------------------- side panels */

/**
 * A status breakdown, rendered from the map the endpoint sends rather than from a
 * fixed list of keys — a status the backend adds shows up here without a change,
 * and one it drops does not leave a phantom row.
 */
function StatusBreakdown({ counts, labels, total }) {
  const rows = Object.entries(counts ?? {})

  return (
    <div>
      <p className="font-display text-stat leading-none text-ink-950">{formatNumber(total ?? 0)}</p>
      <p className="mt-1 text-[13px] text-ink-600">in total</p>

      <ul className="mt-5 space-y-3">
        {rows.map(([status, count]) => {
          const meta = labels[status]
          return (
            <li key={status} className="flex items-center justify-between gap-3">
              <Badge variant={meta?.variant ?? 'neutral'}>{meta?.label ?? status}</Badge>
              <span className="text-body tabular-nums text-ink-950">{formatNumber(count)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** documents_total / checked / flagged, as the endpoint counts them. */
function FraudScreening({ fraud }) {
  const rows = [
    { label: 'Documents uploaded', value: fraud.documents_total },
    { label: 'Passed through the engines', value: fraud.checked },
    { label: 'Flagged for review', value: fraud.flagged, tone: fraud.flagged > 0 },
  ]

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.label} className="flex items-baseline justify-between gap-3">
          <span className="text-body text-ink-800">{row.label}</span>
          <span
            className={cn(
              'font-display text-title leading-none tabular-nums',
              row.tone ? 'text-state-danger' : 'text-ink-950',
            )}
          >
            {formatNumber(row.value ?? 0)}
          </span>
        </li>
      ))}

      {fraud.documents_total > 0 && fraud.checked < fraud.documents_total && (
        <li className="pt-1 text-[13px] text-ink-600">
          {formatNumber(fraud.documents_total - fraud.checked)} still awaiting analysis.
        </li>
      )}
    </ul>
  )
}

/* ----------------------------------------------------------------- page */

/** Dashes rather than a zero: an unavailable figure is not a figure of nothing. */
const NOT_AVAILABLE = '—'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await reportService.dashboard())
    } catch (err) {
      setError(err?.message ?? 'Could not load the dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Skeletons only on the first load. A refetch holds the previous render at
  // reduced opacity instead, so the layout never jumps.
  const firstLoad = loading && !data
  const refetching = loading && Boolean(data)

  if (error && !data) {
    return (
      <div className="animate-page-enter">
        <ErrorState description={error} onRetry={load} />
      </div>
    )
  }

  const stats = data?.stats
  const scoped = data?.scope === 'own'
  const money = (value) => (value == null ? NOT_AVAILABLE : formatCompactCurrency(value))
  const count = (value) => (value == null ? NOT_AVAILABLE : formatNumber(value))

  const customerColumns = [
    { key: 'full_name', header: 'Customer' },
    {
      key: 'customer_code',
      header: 'Code',
      render: (row) => <span className="font-mono text-[13px] tabular-nums">{row.customer_code}</span>,
    },
    {
      key: 'nic_number',
      header: 'NIC',
      render: (row) => <span className="font-mono text-[13px] tabular-nums">{row.nic_number}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const status = CUSTOMER_STATUS[row.status]
        return <Badge variant={status?.variant ?? 'neutral'}>{status?.label ?? row.status}</Badge>
      },
    },
    {
      key: 'registered_at',
      header: 'Registered',
      align: 'right',
      render: (row) => <span className="tabular-nums text-ink-600">{formatDate(row.registered_at)}</span>,
    },
  ]

  return (
    <div className={cn('animate-page-enter', refetching && 'opacity-60 transition-opacity duration-150')}>
      {/* Neutral, not state.info: this is a scope notice, not a status, and colour
          here would break the page's own greyscale test. */}
      {!firstLoad && scoped && (
        <p className="mb-6 rounded-control border border-ink-200 bg-ink-100 px-3 py-2 text-[13px] text-ink-600">
          Company-wide figures are limited to head office. Your own customers are counted below.
        </p>
      )}

      {!firstLoad && data?.unavailable && (
        <p className="mb-6 rounded-control border border-state-warn-border bg-state-warn-bg px-3 py-2 text-[13px] text-ink-800">
          {data.unavailable}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total customers"
          value={firstLoad ? null : count(stats.totalCustomers)}
          loading={firstLoad}
        />
        <StatCard
          label="Active agreements"
          value={firstLoad ? null : count(stats.activeAgreements)}
          loading={firstLoad}
        />
        <StatCard
          label="Documents flagged"
          value={firstLoad ? null : count(stats.fraudFlags)}
          loading={firstLoad}
        />
        <StatCard
          label="Investment booked"
          value={firstLoad ? null : money(stats.totalRevenue)}
          loading={firstLoad}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Investment by branch" className="lg:col-span-2" bodyClassName="p-6 pt-4">
          {firstLoad ? (
            <Skeleton className="h-[260px] w-full" />
          ) : data.revenueByBranch.length > 0 ? (
            <RevenueChart data={data.revenueByBranch} />
          ) : (
            <EmptyState
              title={scoped ? 'Not available for your role' : 'Nothing booked yet'}
              description={
                scoped
                  ? 'Investment totals across branches are reported to head office.'
                  : 'A branch appears here once one of its reps has an agreement recorded against it.'
              }
            />
          )}
        </Card>

        <Card title="Fraud screening">
          {firstLoad ? (
            <Skeleton className="h-[200px] w-full" />
          ) : data.fraud ? (
            <FraudScreening fraud={data.fraud} />
          ) : (
            <EmptyState
              title="Not available for your role"
              description="Document screening totals are reported to head office."
            />
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Recent customers" className="lg:col-span-2" padded={false} bodyClassName="px-2 py-2">
          <Table
            columns={customerColumns}
            data={data?.recentCustomers ?? []}
            loading={firstLoad}
            onRowClick={(row) => navigate(`/customers/${row.id}`)}
            emptyTitle="No customers yet"
            emptyDescription="Registered customers will appear here."
          />
        </Card>

        <Card title="Customers by status">
          {firstLoad ? (
            <Skeleton className="h-[200px] w-full" />
          ) : data.customersByStatus ? (
            <StatusBreakdown
              counts={data.customersByStatus}
              labels={CUSTOMER_STATUS}
              total={stats.totalCustomers}
            />
          ) : (
            <EmptyState
              title="Not available for your role"
              description="The status breakdown is reported to head office."
            />
          )}
        </Card>
      </div>

      {!firstLoad && data.agreements && (
        <Card title="Agreements by status" className="mt-6">
          <StatusBreakdown
            counts={data.agreements.by_status}
            labels={AGREEMENT_STATUS}
            total={data.agreements.total}
          />
        </Card>
      )}
    </div>
  )
}
