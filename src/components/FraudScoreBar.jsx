import { cn } from '@/utils/cn'
import { fraudVerdict } from '@/utils/constants'

const FILL = {
  ok: 'bg-state-ok',
  warn: 'bg-state-warn',
  danger: 'bg-state-danger',
}

/**
 * Severity meter: an ink.200 track with the fill taking the severity colour.
 *
 * Carries its own ARIA values so the score is reachable without seeing the bar
 * — colour and length are both visual-only channels.
 */
export default function FraudScoreBar({ score = 0, className, label }) {
  const { variant, verdict } = fraudVerdict(score)
  const width = Math.max(0, Math.min(100, score))

  return (
    <div
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Fraud score ${score} of 100 — ${verdict}`}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-200', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-150 ease-out', FILL[variant])}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
