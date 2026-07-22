import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import authService from '@/services/authService'
import { getAccessToken, getRefreshToken, clearTokens } from '@/services/tokenStorage'

/**
 * Session state. Tokens live in localStorage (see services/tokenStorage) and are
 * mirrored here so the UI can react to them; the slice never writes storage
 * directly, authService owns that.
 *
 * `bootstrapped` is the flag the route guard waits on. On a page refresh we hold
 * a token but not yet a user, and rendering the guard in that gap would bounce a
 * signed-in user to /login for one frame.
 */
const initialState = {
  user: null,
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  fieldErrors: {},
  bootstrapped: !getAccessToken(), // no token means there is nothing to rehydrate
}

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials)
  } catch (error) {
    // api.js already normalized this to { message, fieldErrors, status }.
    return rejectWithValue(error)
  }
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout()
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    return await authService.me()
  } catch (error) {
    return rejectWithValue(error)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Torn-down session with no server round trip — used by the axios layer when
     * a refresh fails and the session is already gone.
     */
    sessionExpired(state) {
      clearTokens()
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.status = 'idle'
      state.bootstrapped = true
    },
    clearAuthError(state) {
      state.error = null
      state.fieldErrors = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
        state.fieldErrors = {}
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.bootstrapped = true
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Sign in failed.'
        state.fieldErrors = action.payload?.fieldErrors ?? {}
      })

      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
        state.bootstrapped = true
      })
      .addCase(fetchMe.rejected, (state) => {
        // The stored token is dead. Drop it rather than leaving a half session.
        clearTokens()
        state.status = 'failed'
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.bootstrapped = true
      })

      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.status = 'idle'
        state.error = null
        state.fieldErrors = {}
        state.bootstrapped = true
      })
  },
})

export const { sessionExpired, clearAuthError } = authSlice.actions

/* ---------------------------------------------------------------- selectors */

export const selectUser = (state) => state.auth.user
export const selectRole = (state) => state.auth.user?.role ?? null
export const selectIsAuthenticated = (state) => Boolean(state.auth.user && state.auth.accessToken)
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error
export const selectAuthFieldErrors = (state) => state.auth.fieldErrors
export const selectIsBootstrapped = (state) => state.auth.bootstrapped

export default authSlice.reducer
