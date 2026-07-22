import { configureStore } from '@reduxjs/toolkit'
import { setSessionExpiredHandler } from '@/services/api'
import authReducer, { fetchMe, sessionExpired } from './authSlice'
import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
})

// Closes the loop between the axios layer and the store without an import cycle:
// api.js knows nothing about Redux, it just calls whatever handler is registered.
setSessionExpiredHandler(() => store.dispatch(sessionExpired()))

/**
 * Rehydrate on load. A token in storage proves only that we were signed in at
 * some point — /auth/me is what confirms it is still valid and gets the user
 * back. `bootstrapped` starts false in that case so the route guard waits.
 */
if (store.getState().auth.accessToken) {
  store.dispatch(fetchMe())
}

export default store
