import { cn } from '@/utils/cn'
import Button from './Button'

/**
 * The "nothing here yet" state — one of the three states every async view owes
 * the user. Always give it a call to action if one exists; a dead end with no
 * next step is barely better than a blank screen.
 */
export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && (
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-600"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <p className="font-display text-[20px] text-ink-950">{title}</p>

      {description && <p className="mt-1.5 max-w-sm text-body text-ink-600">{description}</p>}

      {action ??
        (actionLabel && onAction ? (
          <Button variant="primary" className="mt-5" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null)}
    </div>
  )
}

/**
 * The error sibling of EmptyState. Same shape, danger-tinted mark, retry action.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'The request could not be completed. Try again in a moment.',
  onRetry,
  retryLabel = 'Try again',
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-state-danger-border bg-state-danger-bg text-state-danger"
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="13" r="0.9" fill="currentColor" />
        </svg>
      </div>

      <p className="font-display text-[20px] text-ink-950">{title}</p>
      <p className="mt-1.5 max-w-sm text-body text-ink-600">{description}</p>

      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
