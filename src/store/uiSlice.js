import { createSlice } from '@reduxjs/toolkit'

const COLLAPSE_KEY = 'plantvest.sidebarCollapsed'

/**
 * UI-only state that more than one component needs to agree on. Anything a
 * single component owns stays in local useState.
 *
 * The desktop collapse preference outlives the session, so it persists; the
 * mobile drawer does not, because a drawer left open across a reload would be
 * a surprise rather than a restored preference.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: localStorage.getItem(COLLAPSE_KEY) === 'true',
    sidebarDrawerOpen: false,
    activeModal: null,
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
      localStorage.setItem(COLLAPSE_KEY, String(state.sidebarCollapsed))
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload
      localStorage.setItem(COLLAPSE_KEY, String(state.sidebarCollapsed))
    },
    openSidebarDrawer(state) {
      state.sidebarDrawerOpen = true
    },
    closeSidebarDrawer(state) {
      state.sidebarDrawerOpen = false
    },
    openModal(state, action) {
      state.activeModal = action.payload
    },
    closeModal(state) {
      state.activeModal = null
    },
  },
})

export const {
  toggleSidebar,
  setSidebarCollapsed,
  openSidebarDrawer,
  closeSidebarDrawer,
  openModal,
  closeModal,
} = uiSlice.actions

export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed
export const selectSidebarDrawerOpen = (state) => state.ui.sidebarDrawerOpen
export const selectActiveModal = (state) => state.ui.activeModal

export default uiSlice.reducer
