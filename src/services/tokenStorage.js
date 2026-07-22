/**
 * The single place tokens are read from and written to.
 *
 * The axios interceptors need the access token on every request and the store
 * needs it to rehydrate a session on load. Routing both through this module
 * keeps `services/api.js` from importing the store, which would close an import
 * cycle (store → authSlice → api → store).
 */

const ACCESS_KEY = 'plantvest.accessToken'
const REFRESH_KEY = 'plantvest.refreshToken'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
