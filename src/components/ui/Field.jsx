import { cn } from '@/utils/cn'

/**
 * Shared label / control / message wrapper behind Input, Select and Textarea.
 * Not exported from the barrel — use one of those three instead.
 *
 * The error replaces the hint rather than stacking under it, so a field never
 * shows two competing messages at once.
 */
export default function Field({ id, label, required, error, hint, className, children }) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && (
            <span className="ml-0.5 text-state-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <span className="form-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="form-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
