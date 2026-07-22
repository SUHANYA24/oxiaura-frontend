import { cn } from '@/utils/cn'

/**
 * Loading placeholder: a flat ink.100 block with a subtle opacity pulse.
 * Deliberately no shimmer gradient — a moving highlight would be the one piece
 * of decorative motion in an otherwise restrained system.
 */
export default function Skeleton({ className, rounded = 'rounded-control', ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-ink-100', rounded, className)}
      {...props}
    />
  )
}

/** A stack of text-height bars. The last line is short, the way real text ends. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

/** Row placeholders sized to the data table, for use as a Table loading state. */
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-ink-200 px-4 py-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn('h-3.5 flex-1', c === 0 && 'max-w-[180px]')} />
          ))}
        </div>
      ))}
    </div>
  )
}
