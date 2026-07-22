import { format, formatDistanceToNow, parseISO } from 'date-fns'

/**
 * Display formatting. Money is Sri Lankan rupees throughout.
 *
 * NIC masking lands with the customer module, which is the first screen that
 * shows a full identity number.
 */

const LKR = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return LKR.format(Number(value))
}

/**
 * Compact form for stat figures, where the exact rupee is noise: 14,650,000
 * reads as Rs 14.7M. The full value belongs in the detail view.
 */
export function formatCompactCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const amount = Number(value)
  if (Math.abs(amount) >= 1_000_000) return `Rs ${(amount / 1_000_000).toFixed(1)}M`
  if (Math.abs(amount) >= 1_000) return `Rs ${(amount / 1_000).toFixed(1)}K`
  return `Rs ${amount.toFixed(0)}`
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-LK').format(Number(value))
}

function toDate(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  return Number.isNaN(date?.getTime?.()) ? null : date
}

export function formatDate(value) {
  const date = toDate(value)
  return date ? format(date, 'd MMM yyyy') : '—'
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? format(date, 'd MMM yyyy, HH:mm') : '—'
}

/** "3 hours ago" — for feeds, where the gap matters more than the timestamp. */
export function formatRelative(value) {
  const date = toDate(value)
  return date ? `${formatDistanceToNow(date)} ago` : '—'
}
