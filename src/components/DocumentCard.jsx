import { Link } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { DOC_TYPES, VERIFICATION_STATUS } from '@/utils/constants'
import { formatRelative } from '@/utils/formatters'

const DOC_LABELS = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t.label]))

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 1.5h5L12.5 5v9.5h-8.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9 1.5V5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * One recent upload — doc type, file, verification state and OCR confidence.
 * Links through to the fraud report when the caller passes `to` (review roles
 * only); otherwise it is a plain row.
 */
export default function DocumentCard({ document, to, className }) {
  const status = VERIFICATION_STATUS[document.verification_status] ?? VERIFICATION_STATUS.pending
  const confidence =
    document.ocr_confidence != null ? `${Math.round(document.ocr_confidence * 100)}%` : '—'

  const body = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-ink-100 text-ink-600">
        <DocIcon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-body font-medium text-ink-950">
            {DOC_LABELS[document.doc_type] ?? document.doc_type}
          </p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-400">
          <span className="truncate font-mono">{document.file_name ?? `doc-${document.id}`}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">OCR {confidence}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{formatRelative(document.uploaded_at)}</span>
        </p>
      </div>
    </>
  )

  const base = 'flex items-center gap-3 rounded-control border border-ink-200 bg-white px-3 py-2.5'

  if (to) {
    return (
      <Link to={to} className={cn(base, 'transition-colors duration-150 ease-out hover:bg-ink-100', className)}>
        {body}
      </Link>
    )
  }

  return <div className={cn(base, className)}>{body}</div>
}
