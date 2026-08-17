import axios from 'axios'
import toast from 'react-hot-toast'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage'

/**
 * The one axios instance. Every service wraps this; no component calls it.
 *
 * Errors leave here normalized to `{ message, fieldErrors, status }` so a form
 * can drop `fieldErrors` straight onto its inputs without knowing that the
 * backend speaks Marshmallow.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  // Without a timeout a request that never answers — the OCR upload when the
  // Celery broker is down, say — leaves the caller on an indefinite spinner with
  // nothing to retry. Slow calls set their own: see UPLOAD_TIMEOUT below.
  timeout: 20000,
})

/**
 * Multipart upload plus server-side hashing is legitimately slower than a JSON
 * round trip, so the document upload gets its own ceiling rather than raising
 * the default for everything.
 */
export const UPLOAD_TIMEOUT = 120000

/** Server-rendered PDFs (WeasyPrint) take longer than a JSON response. */
export const DOWNLOAD_TIMEOUT = 60000

/**
 * Called when the session cannot be recovered. The store registers a handler
 * that clears auth state; ProtectedRoute then redirects declaratively, which
 * beats a `window.location` assignment because it keeps the SPA alive and
 * preserves the intended destination.
 */
let onSessionExpired = null

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

/* ------------------------------------------------------------------ request */

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* ----------------------------------------------------------------- refresh */

/**
 * Shared across concurrent 401s. Without this, five in-flight requests failing
 * at once would fire five refreshes and four of them would race to write a
 * token that the fifth has already replaced.
 *
 * The proactive refresh in `useSessionExpiry` goes through the same promise, so
 * a scheduled refresh and a 401-triggered one can never both be in flight.
 */
let refreshPromise = null

/**
 * Exchanges the refresh token for a new access token and persists it.
 *
 * Resolves with the new access token; rejects with the raw axios error. It
 * deliberately does *not* tear the session down on failure — the response
 * interceptor does that when a real request has actually been refused, while the
 * session watcher would rather warn the user and let them retry. Both callers
 * want the same request, not the same consequence.
 */
export function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.reject(new Error('No refresh token'))

  // Bare axios, not the instance — the instance's interceptors would attach the
  // access token and recurse back into this handler on failure.
  refreshPromise = axios
    .post(
      `${api.defaults.baseURL}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    )
    .then((response) => {
      const accessToken = response.data.access_token
      setTokens({ accessToken })
      return accessToken
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

/* ----------------------------------------------------------------- response */

function normalizeError(error) {
  const status = error.response?.status
  const data = error.response?.data

  // A `responseType: 'blob'` request (PDF, CSV) hands back the error body as a
  // Blob, which cannot be read synchronously. Its own message is unavailable, so
  // say something true about the status instead of leaking axios's
  // "Request failed with status code 500".
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return {
      message:
        status >= 500
          ? 'The server could not produce that file. Please try again.'
          : (status === 404 ? 'That file is not available.' : 'The download was refused.'),
      fieldErrors: {},
      status,
    }
  }

  // Marshmallow: { error: "validation_error", messages: { field: [msg, ...] } }
  const fieldErrors = {}
  if (data?.messages && typeof data.messages === 'object') {
    for (const [field, messages] of Object.entries(data.messages)) {
      fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages)
    }
  }

  let message = data?.message ?? data?.error ?? error.message ?? 'Something went wrong.'
  if (status === 422 && Object.keys(fieldErrors).length > 0) {
    message = 'Please correct the highlighted fields.'
  }
  if (!error.response) {
    message =
      error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? 'The server did not respond in time. It may be busy — please try again.'
        : 'Cannot reach the server. Check your connection and try again.'
  }

  return { message, fieldErrors, status }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    /**
     * A 401 from the session-establishing endpoints is not an expired token:
     * /auth/login returns 401 for bad credentials, and a failed /auth/refresh
     * is terminal. Refreshing or retrying either one is wrong — and clearing
     * tokens on a login 401 would sign out a user who simply mistyped their
     * password while already signed in.
     */
    const isSessionCall =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')

    if (status === 401 && original && !original._retried && !isSessionCall) {
      original._retried = true
      try {
        const accessToken = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${accessToken}`
        return await api(original)
      } catch {
        clearTokens()
        onSessionExpired?.()
        return Promise.reject(normalizeError(error))
      }
    }

    // Reaching here with a 401 means the retry above already failed, or the
    // request was unauthenticated to begin with. Either way the session is gone.
    if (status === 401 && !isSessionCall) {
      clearTokens()
      onSessionExpired?.()
    }

    if (status === 403) {
      // A caller that has its own answer for "not allowed" — the dashboard falls
      // back to rep-visible figures rather than failing — sets `skipErrorToast`
      // so the user is not told off for a request they never made.
      if (!original?.skipErrorToast) toast.error('You do not have permission for this action.')
    }

    if (status >= 500 && !original?.skipErrorToast) {
      toast.error('The server ran into a problem. Please try again.')
    }

    return Promise.reject(normalizeError(error))
  },
)

export default api
