import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import Spinner from './Spinner'

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

/**
 * The one primary action on a screen is the black button. Everything else is
 * secondary, ghost, or danger.
 *
 * While `loading` is true the button disables itself and swaps its leading slot
 * for a spinner — the label stays put so the button does not resize mid-action.
 */
const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    type = 'button',
    className,
    children,
    ...props
  },
  ref,
) {
  const isIconOnly = !children && (iconLeft || iconRight)

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'btn',
        VARIANTS[variant] ?? VARIANTS.secondary,
        size === 'sm' && 'btn-sm',
        isIconOnly && (size === 'sm' ? 'w-[30px] px-0' : 'w-9 px-0'),
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 'xs' : 'sm'} />
      ) : (
        iconLeft && <span className="shrink-0" aria-hidden="true">{iconLeft}</span>
      )}
      {children}
      {!loading && iconRight && <span className="shrink-0" aria-hidden="true">{iconRight}</span>}
    </button>
  )
})

export default Button
