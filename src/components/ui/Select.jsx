import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'
import Field from './Field'

/**
 * Native select styled to match Input. Pass `options` as
 * [{ value, label, disabled }] or supply <option> children directly.
 */
const Select = forwardRef(function Select(
  {
    id,
    label,
    error,
    hint,
    required,
    options,
    placeholder,
    className,
    wrapperClassName,
    children,
    ...props
  },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId

  return (
    <Field
      id={selectId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={cn('form-select', error && 'form-input-error', className)}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </Field>
  )
})

export default Select
