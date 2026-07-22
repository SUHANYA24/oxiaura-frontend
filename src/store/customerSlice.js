import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import customerService from '@/services/customerService'

/**
 * The customer list cache, plus the filters and pagination that produced it.
 *
 * Filters live here rather than in the list component so that navigating to a
 * customer and back does not silently reset the search the user had typed.
 */
const initialState = {
  items: [],
  pagination: { page: 1, perPage: 10, total: 0, pages: 0 },
  filters: { search: '', status: '' },
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
}

export const fetchCustomers = createAsyncThunk(
  'customers/fetch',
  async (_, { getState, rejectWithValue }) => {
    const { filters, pagination } = getState().customers
    try {
      return await customerService.list({
        page: pagination.page,
        perPage: pagination.perPage,
        search: filters.search,
        status: filters.status,
      })
    } catch (error) {
      return rejectWithValue(error)
    }
  },
)

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // Changing what is being filtered invalidates the current page — page 4 of
    // an old result set is meaningless against a new one.
    setSearch(state, action) {
      state.filters.search = action.payload
      state.pagination.page = 1
    },
    setStatusFilter(state, action) {
      state.filters.status = action.payload
      state.pagination.page = 1
    },
    setPage(state, action) {
      state.pagination.page = action.payload
    },
    resetFilters(state) {
      state.filters = { search: '', status: '' }
      state.pagination.page = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload.items
        state.pagination = {
          ...state.pagination,
          page: action.payload.pagination.page,
          perPage: action.payload.pagination.per_page,
          total: action.payload.pagination.total,
          pages: action.payload.pagination.pages,
        }
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload?.message ?? 'Could not load customers.'
      })
  },
})

export const { setSearch, setStatusFilter, setPage, resetFilters } = customerSlice.actions

export const selectCustomers = (state) => state.customers.items
export const selectCustomerPagination = (state) => state.customers.pagination
export const selectCustomerFilters = (state) => state.customers.filters
export const selectCustomerStatus = (state) => state.customers.status
export const selectCustomerError = (state) => state.customers.error

export default customerSlice.reducer
