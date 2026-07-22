import { cn } from '@/utils/cn'
import EmptyState, { ErrorState } from './EmptyState'
import { SkeletonTable } from './Skeleton'

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function SortIcon({ direction }) {
  return (
    <span className="ml-1.5 inline-flex flex-col leading-none" aria-hidden="true">
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path
          d="M4 0.5 7 4H1L4 0.5Z"
          className={direction === 'asc' ? 'fill-ink-950' : 'fill-ink-300'}
        />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="mt-0.5">
        <path
          d="M4 4.5 1 1h6L4 4.5Z"
          className={direction === 'desc' ? 'fill-ink-950' : 'fill-ink-300'}
        />
      </svg>
    </span>
  )
}

/**
 * Data table with sortable headers and built-in loading, empty and error states,
 * so no caller has to reimplement the three-state rule.
 *
 * Columns: [{ key, header, sortable, align, width, className, render(row, i) }]
 * Sorting is controlled — pass `sort` as { key, direction } and handle `onSort`.
 */
export default function Table({
  columns = [],
  data = [],
  loading = false,
  error = null,
  onRetry,
  sort,
  onSort,
  onRowClick,
  rowKey = (row, index) => row?.id ?? index,
  empty,
  emptyTitle = 'No records found',
  emptyDescription,
  className,
  wrapperClassName,
}) {
  const toggleSort = (key) => {
    if (!onSort) return
    const direction = sort?.key === key && sort?.direction === 'asc' ? 'desc' : 'asc'
    onSort({ key, direction })
  }

  if (error) {
    return (
      <div className={wrapperClassName}>
        <ErrorState onRetry={onRetry} description={typeof error === 'string' ? error : undefined} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className={wrapperClassName}>
        <SkeletonTable rows={5} columns={columns.length || 4} />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className={wrapperClassName}>
        {empty ?? <EmptyState title={emptyTitle} description={emptyDescription} />}
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', wrapperClassName)}>
      <table className={cn('data-table', className)}>
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(ALIGN[col.align] ?? ALIGN.left, col.headerClassName)}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'group inline-flex items-center rounded-sm font-mono text-meta uppercase transition-colors duration-150 ease-out',
                        isSorted ? 'text-ink-950' : 'text-ink-400 hover:text-ink-600',
                      )}
                    >
                      {col.header}
                      <SortIcon direction={isSorted ? sort.direction : null} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row, index)
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(ALIGN[col.align] ?? ALIGN.left, col.className)}
                >
                  {col.render ? col.render(row, index) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
