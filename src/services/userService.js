import api from './api'
import { PASSWORD_MIN_LENGTH, ROLES } from '@/utils/constants'

/**
 * User accounts — the admin directory behind /admin/users.
 *
 * **These endpoints are sample, not contract.** API.md documents no user
 * management surface at all: accounts exist only as the seeded logins behind
 * /auth. The paths below are the shape this screen needs and the shape a Flask
 * blueprint would most plausibly expose, written out so that swapping to the
 * real thing is a one-file change:
 *
 *   GET    /users                      list + search/role/status filters, paged
 *   POST   /users                      create (password set by the admin)
 *   PUT    /users/{id}                 update identity, role, branch, active
 *   POST   /users/{id}/reset-password  issue a temporary password
 *
 * All of it is admin-only, which is also how the route is guarded. When the
 * backend lands, confirm the paths, then flip USING_MOCK_USERS.
 *
 * The mock roster mirrors the seeded admin plus the seven staff the employee
 * mock reports on, so a name on /admin/users is the same person on /employees.
 * The two services stay independent — one screen must not break because the
 * other's fixtures moved — at the cost of the roster appearing in both.
 */

export const USING_MOCK_USERS = true

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The error shape api.js normalises everything to, so callers need one path. */
const fail = (status, message) => ({ message, fieldErrors: {}, status })

const invalid = (fieldErrors) => ({ message: 'Please correct the highlighted fields.', fieldErrors, status: 422 })

/* --------------------------------------------------------------- mock state */

const SEED = [
  { full_name: 'Admin User', email: 'admin@test.local', role: ROLES.ADMIN, branch_id: null, is_active: true },
  { full_name: 'Nadeesha Wickramasinghe', email: 'nadeesha@plantvest.lk', role: ROLES.SALES_REP, branch_id: 1, is_active: true },
  { full_name: 'Tharindu Rajapaksa', email: 'tharindu@plantvest.lk', role: ROLES.SALES_REP, branch_id: 1, is_active: true },
  { full_name: 'Ishara Gunawardena', email: 'ishara@plantvest.lk', role: ROLES.SALES_REP, branch_id: 2, is_active: true },
  { full_name: 'Chamath Dissanayake', email: 'chamath@plantvest.lk', role: ROLES.SALES_REP, branch_id: 2, is_active: true },
  { full_name: 'Sanduni Herath', email: 'sanduni@plantvest.lk', role: ROLES.SALES_REP, branch_id: 3, is_active: true },
  { full_name: 'Mahesh Ekanayake', email: 'mahesh@plantvest.lk', role: ROLES.SALES_REP, branch_id: 3, is_active: false },
  { full_name: 'Dilani Amarasinghe', email: 'dilani@plantvest.lk', role: ROLES.HEAD_OFFICE, branch_id: 3, is_active: true },
  { full_name: 'Ruwan Bandara', email: 'ruwan@plantvest.lk', role: ROLES.HEAD_OFFICE, branch_id: 4, is_active: true },
  { full_name: 'Priyanka Silva', email: 'priyanka@plantvest.lk', role: ROLES.SALES_REP, branch_id: 4, is_active: false },
]

// Registration dates walk backwards from a fixed point rather than from "now",
// so the list order and the Created column are stable across reloads.
const SEEDED_AT = new Date('2026-06-01T09:00:00')

const store = new Map()
let seq = 0

SEED.forEach((user, index) => {
  const id = (seq += 1)
  const createdAt = new Date(SEEDED_AT)
  createdAt.setDate(createdAt.getDate() - (SEED.length - index) * 9)

  store.set(id, { id, ...user, created_at: createdAt.toISOString() })
})

/* ----------------------------------------------------------------- helpers */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clone = (user) => ({ ...user })

/** Server-side validation, mirrored so the form's inline errors are exercised. */
function validate(payload, { requirePassword }) {
  const errors = {}

  if (!String(payload.full_name ?? '').trim()) errors.full_name = 'Full name is required.'
  if (!EMAIL_PATTERN.test(String(payload.email ?? '').trim())) errors.email = 'Enter a valid email address.'
  if (!Object.values(ROLES).includes(payload.role)) errors.role = 'Choose a role.'

  if (requirePassword || payload.password) {
    if (String(payload.password ?? '').length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    }
  }

  return errors
}

/**
 * Email is the login, so it is unique. A real Flask handler answers the clash
 * with 409 and a message rather than Marshmallow's field map — the same shape
 * customerService already translates for duplicate NICs, and for the same
 * reason: the form should light up the offending input, not a page-level banner.
 */
function assertEmailFree(email, exceptId = null) {
  const taken = [...store.values()].some(
    (user) => user.email.toLowerCase() === String(email).trim().toLowerCase() && user.id !== exceptId,
  )
  if (taken) throw invalid({ email: 'That email address is already registered.' })
}

/** 409 → the same field error the mock raises, so both paths land identically. */
function translateConflict(error, email) {
  if (error?.status === 409) {
    return { ...error, fieldErrors: { ...error.fieldErrors, email: `${email} is already registered.` } }
  }
  return error
}

/* -------------------------------------------------------------- operations */

/**
 * GET /users — paged, with `search` over name and email, plus role and active
 * filters. `is_active` is sent as a string ('true'/'false') because it travels
 * as a query param; blank means "either".
 */
async function list({ page = 1, perPage = 10, search = '', role = '', isActive = '' } = {}) {
  if (!USING_MOCK_USERS) {
    const params = { page, per_page: perPage }
    if (search) params.search = search
    if (role) params.role = role
    if (isActive !== '') params.is_active = isActive

    const { data } = await api.get('/users', { params })
    return { items: data.items, pagination: data.pagination }
  }

  await delay(300)

  const term = search.trim().toLowerCase()
  const matched = [...store.values()]
    .filter((user) => {
      if (term && !`${user.full_name} ${user.email}`.toLowerCase().includes(term)) return false
      if (role && user.role !== role) return false
      if (isActive !== '' && user.is_active !== (isActive === 'true')) return false
      return true
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  const total = matched.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  // A filter that empties the last page must not leave the caller stranded on
  // it; the server clamps the same way rather than answering an empty set.
  const current = Math.min(Math.max(1, Number(page)), pages)
  const start = (current - 1) * perPage

  return {
    items: matched.slice(start, start + perPage).map(clone),
    pagination: {
      page: current,
      per_page: perPage,
      total,
      pages,
      has_next: current < pages,
      has_prev: current > 1,
    },
  }
}

/** POST /users — the admin sets the initial password; the account starts active. */
async function create({ fullName, email, role, branchId, isActive = true, password }) {
  const payload = {
    full_name: String(fullName ?? '').trim(),
    email: String(email ?? '').trim(),
    role,
    branch_id: branchId === '' || branchId == null ? null : Number(branchId),
    is_active: Boolean(isActive),
    password,
  }

  if (!USING_MOCK_USERS) {
    try {
      const { data } = await api.post('/users', payload)
      return data
    } catch (error) {
      throw translateConflict(error, payload.email)
    }
  }

  await delay(500)

  const errors = validate(payload, { requirePassword: true })
  if (Object.keys(errors).length) throw invalid(errors)
  assertEmailFree(payload.email)

  const id = (seq += 1)
  const user = {
    id,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    branch_id: payload.branch_id,
    is_active: payload.is_active,
    created_at: new Date().toISOString(),
  }
  store.set(id, user)
  return clone(user)
}

/**
 * PUT /users/{id} — identity, role, branch and active state. The password is
 * deliberately not updatable here: changing someone's credentials is a separate,
 * auditable action, which is what resetPassword is for.
 */
async function update(id, { fullName, email, role, branchId, isActive }) {
  const payload = {
    full_name: String(fullName ?? '').trim(),
    email: String(email ?? '').trim(),
    role,
    branch_id: branchId === '' || branchId == null ? null : Number(branchId),
    is_active: Boolean(isActive),
  }

  if (!USING_MOCK_USERS) {
    try {
      const { data } = await api.put(`/users/${id}`, payload)
      return data
    } catch (error) {
      throw translateConflict(error, payload.email)
    }
  }

  await delay(450)

  const existing = store.get(Number(id))
  if (!existing) throw fail(404, 'That user no longer exists.')

  const errors = validate(payload, { requirePassword: false })
  if (Object.keys(errors).length) throw invalid(errors)
  assertEmailFree(payload.email, existing.id)

  const updated = { ...existing, ...payload }
  store.set(existing.id, updated)
  return clone(updated)
}

/**
 * Deactivation, as its own call because that is how the UI reaches it — a
 * confirm dialog on a row, not the edit form. It is a soft state: the account
 * keeps its history and can be switched back on.
 *
 * An admin cannot deactivate their own account; the server refuses it and the
 * page also hides the action, so the refusal is a backstop rather than the
 * first the user hears of it.
 */
async function setActive(id, isActive) {
  if (!USING_MOCK_USERS) {
    const { data } = await api.put(`/users/${id}`, { is_active: Boolean(isActive) })
    return data
  }

  await delay(400)

  const existing = store.get(Number(id))
  if (!existing) throw fail(404, 'That user no longer exists.')

  const updated = { ...existing, is_active: Boolean(isActive) }
  store.set(existing.id, updated)
  return clone(updated)
}

/**
 * POST /users/{id}/reset-password — the server generates the password and
 * returns it once, so the admin can hand it over. Nothing stores it: this
 * response is the only time it is legible, which is why the UI shows it in a
 * dialog the admin has to dismiss deliberately.
 */
async function resetPassword(id) {
  if (!USING_MOCK_USERS) {
    const { data } = await api.post(`/users/${id}/reset-password`)
    return { user_id: data.user_id ?? Number(id), temporary_password: data.temporary_password }
  }

  await delay(500)

  const existing = store.get(Number(id))
  if (!existing) throw fail(404, 'That user no longer exists.')

  // Readable but not guessable: mixed case, digits, one symbol. The real
  // generator lives server-side; this only has to look like its output.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const body = Array.from(
    { length: 10 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('')

  return { user_id: existing.id, temporary_password: `${body}@1` }
}

export default { list, create, update, setActive, resetPassword }
