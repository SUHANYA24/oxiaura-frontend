import { cn } from '@/utils/cn'
import { Skeleton } from '@/components/ui'

/**
 * White card, ink.200 border, mono uppercase label, the figure large in the
 * display serif. The trend is the only colour permitted here — no accent bar,
 * no tinted background.
 *
 * The figure uses proportional figures rather than tabular: equal-width digits
 * make a number look loose at display sizes. Tabular is for columns.
 */
function Sparkline({ points, tone }) {
  if (!points?.length) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const width = 72
  const height = 24

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      // SVG y grows downward, so invert; inset by 1px so the 2px stroke is not
      // clipped at the extremes.
      const y = height - 1 - ((point - min) / span) * (height - 2)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn('shrink-0', tone === 'danger' ? 'text-state-danger' : 'text-state-ok')}
      aria-hidden="true"
    >
      <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StatCard({ label, value, trend, trendTone = 'ok', delta, loading = false }) {
  if (loading) {
    return (
      <div className="rounded-card border border-ink-200 bg-white p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-9 w-32" />
        <Skeleton className="mt-4 h-3 w-20" />
      </div>
    )
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5">
      <p className="meta-label">{label}</p>

      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="font-display text-stat leading-none text-ink-950">{value}</p>
        <Sparkline points={trend} tone={trendTone} />
      </div>

      {delta && (
        <p className="mt-3 text-[13px] text-ink-600">
          <span className={cn('font-medium', trendTone === 'danger' ? 'text-state-danger' : 'text-state-ok')}>
            {delta}
          </span>{' '}
          vs last month
        </p>
      )}
    </div>
  )
}
