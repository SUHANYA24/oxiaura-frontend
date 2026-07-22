import { cn } from '@/utils/cn'

/**
 * White surface, 1px ink.200, radius 12px, no shadow. Separation from the
 * ink.50 page comes from the near-white/white pairing, not from depth.
 *
 * Pass `padded={false}` when the card wraps a table or list that supplies its
 * own edge-to-edge padding.
 */
export default function Card({
  title,
  description,
  actions,
  footer,
  padded = true,
  hoverable = false,
  as: Tag = 'div',
  className,
  bodyClassName,
  children,
  ...props
}) {
  const hasHeader = title || description || actions

  return (
    <Tag
      className={cn(
        'rounded-card border border-ink-200 bg-white',
        hoverable && 'cursor-pointer transition-colors duration-150 ease-out hover:bg-ink-100',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-6 py-4">
          <div className="min-w-0">
            {title && <h3 className="section-heading">{title}</h3>}
            {description && <p className="mt-1 text-body text-ink-600">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={cn(padded && 'p-6', bodyClassName)}>{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-ink-200 px-6 py-4">
          {footer}
        </div>
      )}
    </Tag>
  )
}
