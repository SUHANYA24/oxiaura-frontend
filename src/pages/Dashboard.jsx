import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, ErrorState, Skeleton, Table } from '@/components/ui'
import StatCard from '@/components/StatCard'
import FraudScoreBadge from '@/components/FraudScoreBadge'
import FraudScoreBar from '@/components/FraudScoreBar'
import reportService, { USING_MOCK_AGGREGATES } from '@/services/reportService'
import { CUSTOMER_STATUS } from '@/utils/constants'
import { formatCompactCurrency, formatDate, formatNumber, formatRelative } from '@/utils/formatters'
import { AXIS_TICK, CHART } from '@/utils/chartTokens'
import { cn } from '@/utils/cn'

/* ------------------------------------------------------------------ chart */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-2 shadow-float">
      <p className="font-mono text-meta uppercase text-ink-400">{label}</p>
      <p className="mt-1 text-body text-ink-950">
        <span className="font-medium tabular-nums">{payload[0].value}</span> agreements
      </p>
    </div>
  )
}

/**
 * Single series, so no legend — the card title says what is plotted. Gridlines
 * are solid hairlines rather than dashed, and only horizontal: vertical rules
 * on a categorical axis add ink without adding information.
 */
function VolumeChart({ data }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={4} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={44} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursor }} />
          <Bar dataKey="agreements" fill={CHART.series} barSize={24} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* The table twin: every plotted value stays reachable without the chart,
          so the tooltip enhances rather than gates. */}
      <table className="sr-only">
        <caption>Agreements generated per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Agreements</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.month}</th>
              <td>{row.agreements}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ------------------------------------------------------------- side panels */

const DOT = { ok: 'bg-state-ok', warn: 'bg-state-warn', danger: 'bg-state-danger', info: 'bg-state-info' }

function EngineStatus({ engines }) {
  return (
    <ul className="space-y-4">
      {engines.map((engine) => (
        <li key={engine.id} className="flex items-start gap-3">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[engine.state])} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body text-ink-950">{engine.name}</p>
            {/* The detail text carries the state in words, so the dot is a
                redundant cue rather than the only one. */}
            <p className="mt-0.5 text-[13px] text-ink-600">{engine.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function NotificationFeed({ notifications }) {
  return (
    <ul className="divide-y divide-ink-200">
      {notifications.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[item.severity])} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body text-ink-800">{item.message}</p>
            <p className="mt-0.5 font-mono text-meta uppercase text-ink-400">{formatRelative(item.at)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function FraudAlerts({ alerts }) {
  return (
    <ul className="divide-y divide-ink-200">
      {alerts.map((alert) => (
        <li key={alert.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-ink-950">{alert.customerName}</p>
              <p className="mt-0.5 font-mono text-meta uppercase text-ink-400">
                {alert.docType} · {formatRelative(alert.raisedAt)}
              </p>
            </div>
            <FraudScoreBadge score={alert.score} />
          </div>
          <FraudScoreBar
            score={alert.score}
            className="mt-3"
            label={`${alert.customerName}, ${alert.docType}: fraud score ${alert.score} of 100`}
          />
        </li>
      ))}
    </ul>
  )
}

/* ----------------------------------------------------------------- page */

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
      {USING_MOCK_AGGREGATES && (
        // Neutral, not state.info: this is a build-time notice, not a status,
        // and colour here would break the page's own greyscale test.
        <p className="mb-6 rounded-control border border-ink-200 bg-ink-100 px-3 py-2 text-[13px] text-ink-600">
          Customer count and recent registrations are live. Agreements, revenue, fraud alerts, notifications and
          engine status are placeholder data until the reports endpoint exists.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total customers"
          value={firstLoad ? null : formatNumber(stats.totalCustomers)}
          trend={data?.trends.customers}
          trendTone="ok"
          delta="+12%"
          loading={firstLoad}
        />
        <StatCard
          label="Active agreements"
          value={firstLoad ? null : formatNumber(stats.activeAgreements)}
          trend={data?.trends.agreements}
          trendTone="ok"
          delta="+8%"
          loading={firstLoad}
        />
        <StatCard
          label="Fraud flags"
          value={firstLoad ? null : formatNumber(stats.fraudFlags)}
          trend={data?.trends.fraudFlags}
          trendTone="danger"
          delta="+2"
          loading={firstLoad}
        />
        <StatCard
          label="Total revenue"
          value={firstLoad ? null : formatCompactCurrency(stats.totalRevenue)}
          trend={data?.trends.revenue}
          trendTone="ok"
          delta="+9%"
          loading={firstLoad}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Agreements per month" className="lg:col-span-2" bodyClassName="p-6 pt-4">
          {firstLoad ? <Skeleton className="h-[260px] w-full" /> : <VolumeChart data={data.monthlyVolume} />}
        </Card>

        <Card title="AI engine status">
          {firstLoad ? <Skeleton className="h-[200px] w-full" /> : <EngineStatus engines={data.engines} />}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Recent customers"
          className="lg:col-span-2"
          padded={false}
          bodyClassName="px-2 py-2"
        >
          <Table
            columns={customerColumns}
            data={data?.recentCustomers ?? []}
            loading={firstLoad}
            onRowClick={(row) => navigate(`/customers/${row.id}`)}
            emptyTitle="No customers yet"
            emptyDescription="Registered customers will appear here."
          />
        </Card>

        <Card title="Notifications">
          {firstLoad ? <Skeleton className="h-[200px] w-full" /> : <NotificationFeed notifications={data.notifications} />}
        </Card>
      </div>

      <Card title="Recent fraud alerts" className="mt-6">
        {firstLoad ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <FraudAlerts alerts={data.fraudAlerts} />
        )}
      </Card>
    </div>
  )
}
