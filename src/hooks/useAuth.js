import { useSyncExternalStore } from 'react'

/**
 * TEMPORARY session source. Phase 3 replaces the internals of this hook with
 * `useSelector` against `authSlice` — the shape it returns is already the shape
 * the slice will expose, so the guards, layout, and pages that consume it do
 * not change when the store lands.
 *
 * Until then the session lives in localStorage and is written by the dev role
 * switcher on the login stub.
 */

const STORAGE_KEY = 'plantvest.auth'
const AUTH_EVENT = 'plantvest:auth'

const EMPTY = { user: null, accessToken: null }

let cachedRaw
let cachedValue = EMPTY

function getSnapshot() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedValue

  cachedRaw = raw
  try {
    cachedValue = raw ? JSON.parse(raw) : EMPTY
  } catch {
    cachedValue = EMPTY
  }
  return cachedValue
}

function subscribe(onChange) {
  window.addEventListener(AUTH_EVENT, onChange)
  window.addEventListener('storage', onChange) // other tabs
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

function commit(session) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

/** Stand-in for the `login` thunk. */
export function setSession(user, accessToken = 'dev-token') {
  commit({ user, accessToken })
}

/** Stand-in for the `logout` thunk. */
export function clearSession() {
  commit(null)
}

export function useAuth() {
  const session = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)

  return {
    user: session.user,
    role: session.user?.role ?? null,
    accessToken: session.accessToken,
    isAuthenticated: Boolean(session.user && session.accessToken),
    // Phase 3 flips this while `fetchMe` rehydrates a persisted token; the
    // guard already handles it so no route flashes a redirect on refresh.
    isLoading: false,
    login: setSession,
    logout: clearSession,
  }
}

export default useAuth
