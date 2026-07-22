import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  login as loginThunk,
  logout as logoutThunk,
  selectAuthError,
  selectAuthFieldErrors,
  selectAuthStatus,
  selectIsAuthenticated,
  selectIsBootstrapped,
  selectRole,
  selectUser,
} from '@/store/authSlice'

/**
 * The read/write surface for the session. Components use this rather than
 * reaching into the slice, so the store shape stays free to change.
 *
 * `login` resolves to `{ ok }` so a form can decide what to do next without
 * having to understand thunk actions — the error text is already in state.
 */
export function useAuth() {
  const dispatch = useDispatch()

  const user = useSelector(selectUser)
  const role = useSelector(selectRole)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const status = useSelector(selectAuthStatus)
  const error = useSelector(selectAuthError)
  const fieldErrors = useSelector(selectAuthFieldErrors)
  const bootstrapped = useSelector(selectIsBootstrapped)

  const login = useCallback(
    async (credentials) => {
      const result = await dispatch(loginThunk(credentials))
      return { ok: loginThunk.fulfilled.match(result) }
    },
    [dispatch],
  )

  const logout = useCallback(() => dispatch(logoutThunk()), [dispatch])

  return {
    user,
    role,
    isAuthenticated,
    login,
    logout,
    error,
    fieldErrors,
    isSubmitting: status === 'loading',
    // True only while a stored token is being exchanged for a user on load.
    isLoading: !bootstrapped,
  }
}

export default useAuth
