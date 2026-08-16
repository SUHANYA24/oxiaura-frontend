/**
 * Just enough JWT to know when the access token lapses.
 *
 * The payload of a JWT is base64url, not encrypted — reading `exp` client-side
 * is normal and safe. What is *not* safe is trusting anything in here for an
 * authorization decision: the signature is never checked on this side, so a
 * forged token would parse happily. Every claim below is used only to schedule a
 * refresh; the server remains the sole authority on whether a token is valid.
 */

function base64UrlDecode(segment) {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  const filled = padded + '='.repeat((4 - (padded.length % 4)) % 4)
  // decodeURIComponent/escape round-trip so a UTF-8 claim (a name with an
  // accent, say) survives atob's latin1 output.
  return decodeURIComponent(
    atob(filled)
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  )
}

/**
 * Returns the decoded payload, or null for anything that is not a readable JWT.
 * Null is a legitimate answer, not an error: the dev backend may hand out an
 * opaque token, and callers are expected to degrade rather than throw.
 */
export function decodeJwt(token) {
  if (typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

/**
 * `exp` in milliseconds, to match Date.now(). Flask-JWT-Extended emits it in
 * seconds, as the spec requires. Null when the token carries no usable expiry —
 * which the session watcher reads as "cannot schedule anything", not as
 * "expired", because treating an unreadable token as dead would sign out a
 * perfectly good session.
 */
export function tokenExpiresAt(token) {
  const exp = decodeJwt(token)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
}

/** Milliseconds until the token lapses; null when there is no expiry to read. */
export function msUntilExpiry(token, now = Date.now()) {
  const expiresAt = tokenExpiresAt(token)
  return expiresAt == null ? null : expiresAt - now
}
