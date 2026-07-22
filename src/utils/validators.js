/**
 * Field-level validators. Each returns an error string, or null when valid, so
 * a form can build its error map by calling them directly.
 *
 * The NIC, phone and amount rules land with the customer form, which is the
 * first screen that needs them.
 */

// Deliberately permissive: the server is the authority on whether an address
// exists. This only catches the obvious typo before a round trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function required(value, label = 'This field') {
  return String(value ?? '').trim() ? null : `${label} is required.`
}

export function email(value) {
  if (!String(value ?? '').trim()) return 'Email is required.'
  return EMAIL_PATTERN.test(value.trim()) ? null : 'Enter a valid email address.'
}

/** Optional email — blank passes, anything present must still be well formed. */
export function optionalEmail(value) {
  if (!String(value ?? '').trim()) return null
  return EMAIL_PATTERN.test(value.trim()) ? null : 'Enter a valid email address.'
}

// Sri Lankan NIC, both forms in circulation: the old 9 digits + V/X, and the
// 12-digit number issued since 2016.
const NIC_OLD = /^\d{9}[VXvx]$/
const NIC_NEW = /^\d{12}$/

export function nic(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'NIC number is required.'
  if (NIC_OLD.test(trimmed) || NIC_NEW.test(trimmed)) return null
  return 'Enter a valid NIC — 12 digits, or 9 digits followed by V.'
}

// Local mobile/land formats, with or without the leading zero, and the +94
// international form. Spaces and dashes are tolerated and stripped first.
const PHONE_PATTERN = /^(?:\+94|0)\d{9}$/

export function optionalPhone(value) {
  const trimmed = String(value ?? '').replace(/[\s-]/g, '')
  if (!trimmed) return null
  return PHONE_PATTERN.test(trimmed) ? null : 'Enter a valid phone number, e.g. 0771234567.'
}
