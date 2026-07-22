import api from './api'

/**
 * Customer CRUD.
 *
 * The one piece of translation this layer owes its callers: a duplicate NIC
 * comes back as a 409 conflict with a prose message, not as a Marshmallow field
 * error, so nothing would attach it to the NIC input. It is remapped into
 * `fieldErrors.nic_number` here — the API quirk belongs in the service, not in
 * every form that writes a customer.
 */
function withNicConflict(error) {
  if (error?.status === 409) {
    return {
      ...error,
      fieldErrors: { ...error.fieldErrors, nic_number: error.message },
    }
  }
  return error
}

/** GET /customers — paginated, filterable. Sales reps are scoped server-side. */
async function list({ page = 1, perPage = 10, search = '', status = '' } = {}) {
  const params = { page, per_page: perPage }
  if (search) params.search = search
  if (status) params.status = status

  const { data } = await api.get('/customers', { params })
  return { items: data.items, pagination: data.pagination }
}

/** GET /customers/:id — includes assigned_rep, documents and proposals. */
async function get(id) {
  const { data } = await api.get(`/customers/${id}`)
  return data
}

async function create(payload) {
  try {
    const { data } = await api.post('/customers', payload)
    return data
  } catch (error) {
    throw withNicConflict(error)
  }
}

async function update(id, payload) {
  try {
    const { data } = await api.put(`/customers/${id}`, payload)
    return data
  } catch (error) {
    throw withNicConflict(error)
  }
}

/** DELETE /customers/:id — soft delete, admin only. */
async function remove(id) {
  const { data } = await api.delete(`/customers/${id}`)
  return data
}

export default { list, get, create, update, remove }
