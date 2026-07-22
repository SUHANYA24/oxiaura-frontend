import api from './api'
import { clearTokens, setTokens } from './tokenStorage'

/**
 * Wraps the four /auth endpoints and returns clean data. Token persistence is
 * this module's job too — the slice stays a pure state container.
 */

/** POST /auth/login → { access_token, refresh_token, user } */
async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })

  setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
  return { user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token }
}

/**
 * POST /auth/logout revokes the presented token via the backend blocklist.
 * A failure here is not worth blocking on: the local session is being torn
 * down either way, so the tokens are cleared regardless.
 */
async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Already expired or revoked — nothing left to do server-side.
  } finally {
    clearTokens()
  }
}

/** GET /auth/me → the user object directly. */
async function me() {
  const { data } = await api.get('/auth/me')
  return data
}

export default { login, logout, me }
