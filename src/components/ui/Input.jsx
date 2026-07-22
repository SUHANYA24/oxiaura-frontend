import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'
import Field from './Field'

/**
 * Text input with label, inline error and helper text.
 *
 * `prefix` and `suffix` render inside the control's border — use them for a
 * search icon or a show/hide password toggle, not for standalone buttons.
 */
const Input = forwardRef(function Input(
  {
    id,
    label,
    error,
    hint,
    required,
    prefix,
    suffix,
    mono = false,
    className,
    wrapperClassName,
    ...props
  },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <Field
      id={inputId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={wrapperClassName}
    >
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'form-input',
            error && 'form-input-error',
            mono && 'font-mono text-[13px]',
            prefix && 'pl-9',
            suffix && 'pr-9',
            className,
          )}
          {...props}
        />

        {suffix && (
          <span className="absolute inset-y-0 right-2 flex items-center text-ink-400">{suffix}</span>
        )}
      </div>
    </Field>
  )
})

export default Input
