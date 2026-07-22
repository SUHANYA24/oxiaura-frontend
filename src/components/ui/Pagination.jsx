import { cn } from '@/utils/cn'

/**
 * Builds the page window: always the first and last page, the current page with
 * one neighbour either side, and an ellipsis wherever the run breaks.
 */
function buildPages(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)

  const pages = new Set([1, pageCount, page, page - 1, page + 1])
  const visible = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)

  return visible.reduce((acc, p, i) => {
    if (i > 0 && p - visible[i - 1] > 1) acc.push('…')
    acc.push(p)
    return acc
  }, [])
}

function ArrowIcon({ direction }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={direction === 'prev' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Page controls with a record-range summary. The active page is the only filled
 * element — an ink.950 square, matching the active-nav treatment.
 */
export default function Pagination({
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  className,
  showSummary = true,
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (pageCount <= 1 && !showSummary) return null

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const go = (next) => {
    if (next >= 1 && next <= pageCount && next !== page) onPageChange?.(next)
  }

  const cellBase =
    'flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-[13px] transition-colors duration-150 ease-out'

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-ink-200 px-4 py-3 sm:flex-row',
        className,
      )}
    >
      {showSummary && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
          {total === 0 ? 'No records' : `Showing ${from}–${to} of ${total}`}
        </p>
      )}

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={cn(cellBase, 'text-ink-600 hover:bg-ink-100 hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300')}
          >
            <ArrowIcon direction="prev" />
          </button>

          {buildPages(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className={cn(cellBase, 'text-ink-400')} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={cn(
                  cellBase,
                  p === page
                    ? 'bg-ink-950 font-medium text-white'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
                )}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className={cn(cellBase, 'text-ink-600 hover:bg-ink-100 hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300')}
          >
            <ArrowIcon direction="next" />
          </button>
        </div>
      )}
    </nav>
  )
}
