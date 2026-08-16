import { cn } from '@/utils/cn'
import { kpiBand } from '@/utils/constants'

/**
 * KPI progress ring: an ink.200 track with the progress arc in ink.950 and the
 * percentage centred in the display serif.
 *
 * The arc only takes a semantic colour when performance drops below the bands in
 * `kpiBand` — so a grid of rings is black until someone is behind, and the one
 * underperformer is the only coloured thing on the screen. The band label rides
 * along as visually hidden text, so the state is never colour alone.
 *
 * `value` is an achievement percentage, or `null` when no target is set: an
 * absence, not a zero, so the ring renders as an empty dashed track.
 */

const ARC = {
  neutral: 'stroke-ink-950',
  warn: 'stroke-state-warn',
  danger: 'stroke-state-danger',
}

const TEXT = {
  neutral: 'text-ink-950',
  warn: 'text-state-warn',
  danger: 'text-state-danger',
}

export default function KPIRing({
  value,
  label = 'Achievement',
  size = 96,
  thickness = 6,
  className,
}) {
  const band = kpiBand(value)
  const pct = band.unset ? null : Number(value)

  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  // The arc caps at a full circle, but the figure keeps the true number — 140%
  // should read as beating the target, not as exactly meeting it.
  const swept = Math.max(0, Math.min(100, pct ?? 0)) / 100

  return (
    <div
      role="meter"
      aria-valuenow={pct ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={pct == null ? 'No target set' : `${pct}% — ${band.label}`}
      aria-label={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Start at twelve o'clock rather than three. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`} fill="none" strokeWidth={thickness}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-ink-200"
            strokeDasharray={pct == null ? '3 4' : undefined}
          />

          {pct != null && swept > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className={cn(ARC[band.variant] ?? ARC.neutral, 'transition-[stroke-dashoffset] duration-150 ease-out')}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - swept)}
            />
          )}
        </g>
      </svg>

      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn('font-display leading-none', TEXT[band.variant] ?? TEXT.neutral)}
          style={{ fontSize: Math.round(size * 0.26) }}
        >
          {pct == null ? '—' : `${Math.round(pct)}%`}
        </span>
      </span>

      <span className="sr-only">{band.label}</span>
    </div>
  )
}
