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
