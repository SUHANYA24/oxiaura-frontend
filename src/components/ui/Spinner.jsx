import { cn } from '@/utils/cn'

const SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
}

/**
 * Monochrome loading spinner. Inherits `currentColor`, so it takes the colour
 * of whatever it sits inside — white on a primary button, ink.600 in a panel.
 */
export default function Spinner({ size = 'sm', className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <svg
        className={cn('animate-spin', SIZES[size], className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
