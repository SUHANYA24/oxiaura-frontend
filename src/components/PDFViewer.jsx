import { Skeleton } from '@/components/ui'
import { cn } from '@/utils/cn'

/**
 * Inline PDF preview. Presentational only — the parent owns the blob and its
 * object URL (so the same bytes back download and print), and passes the URL in
 * as `src`. Three states, like every async view: a skeleton while the parent
 * loads, an error with retry, and the framed document once it is ready.
 */
export default function PDFViewer({
  src,
  loading = false,
  error = null,
  onRetry,
  title = 'Agreement document',
  height = 460,
  className,
}) {
  if (loading) {
    return <Skeleton className={cn('w-full', className)} style={{ height }} rounded="rounded-control" />
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-control border border-ink-200 bg-ink-50 px-6 text-center',
          className,
        )}
        style={{ height }}
      >
        <p className="text-body text-ink-600">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-body font-medium text-ink-950 underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-control border border-dashed border-ink-300 bg-ink-50 text-ink-400',
          className,
        )}
        style={{ height }}
      >
        <span className="text-[13px]">No document to preview</span>
      </div>
    )
  }

  return (
    <iframe
      src={src}
      title={title}
      className={cn('w-full rounded-control border border-ink-200 bg-white', className)}
      style={{ height }}
    />
  )
}
