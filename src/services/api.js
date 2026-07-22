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
})

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
 */
let refreshPromise = null

function refreshAccessToken() {
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
    message = 'Cannot reach the server. Check your connection and try again.'
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
      toast.error('You do not have permission for this action.')
    }

    if (status >= 500) {
      toast.error('The server ran into a problem. Please try again.')
    }

    return Promise.reject(normalizeError(error))
  },
)

export default api
