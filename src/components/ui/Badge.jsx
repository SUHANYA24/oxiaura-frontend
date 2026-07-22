import { cn } from '@/utils/cn'

const VARIANTS = {
  neutral: 'badge-neutral',
  ok: 'badge-ok',
  warn: 'badge-warn',
  danger: 'badge-danger',
  info: 'badge-info',
}

const DOTS = {
  neutral: 'bg-ink-400',
  ok: 'bg-state-ok',
  warn: 'bg-state-warn',
  danger: 'bg-state-danger',
  info: 'bg-state-info',
}

/**
 * A tinted background, a hairline border, and coloured text — never a solid
 * saturated fill.
 *
 * The badge always renders its label, so the state survives the greyscale test;
 * the dot is a redundant cue, not the message.
 */
export default function Badge({ variant = 'neutral', dot = false, icon, className, children, ...props }) {
  return (
    <span className={cn('badge', VARIANTS[variant] ?? VARIANTS.neutral, className)} {...props}>
      {dot && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[variant])} aria-hidden="true" />
      )}
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}
