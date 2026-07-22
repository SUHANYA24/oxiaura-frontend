import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'
import Field from './Field'

/**
 * Multi-line input. Set `maxLength` to get a character counter under the field;
 * the counter turns ink.950 once the remaining budget drops below 10%.
 */
const Textarea = forwardRef(function Textarea(
  {
    id,
    label,
    error,
    hint,
    required,
    rows = 4,
    maxLength,
    value,
    className,
    wrapperClassName,
    ...props
  },
  ref,
) {
  const autoId = useId()
  const textareaId = id ?? autoId
  const used = typeof value === 'string' ? value.length : 0
  const nearLimit = maxLength ? used > maxLength * 0.9 : false

  return (
    <Field
      id={textareaId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        className={cn('form-textarea', error && 'form-input-error', className)}
        {...props}
      />

      {maxLength && (
        <span
          className={cn(
            'mt-1.5 block text-right font-mono text-[11px]',
            nearLimit ? 'text-ink-950' : 'text-ink-400',
          )}
        >
          {used} / {maxLength}
        </span>
      )}
    </Field>
  )
})

export default Textarea
