import api from './api'
import { ROLES } from '@/utils/constants'

/**
 * Employees & KPIs.
 *
 * The contract (API.md) is two endpoints, both management-only:
 *   GET  /employees?month&year          → one KPI row per user for that month
 *   POST /employees/{user_id}/targets   → upsert a monthly target (admin only)
 *
 * Actuals are not writable: registering a customer bumps the assigned rep's
 * `actual_customers` and generating an agreement adds to `actual_revenue`, so
 * this module only ever writes targets.
 *
 * Those endpoints are not wired up in this environment yet, so the module runs
 * against an in-memory mock returning the exact shapes from the contract. Every
 * function keeps its real `api` call beside the mock behind USING_MOCK_EMPLOYEES
 * — flip the flag and the screens above keep working.
 *
 * Two things the contract does not give us, and what is done about each:
 *  - **No `GET /employees/{id}`.** `get()` pulls the month's list and picks the
 *    row, so the KPI tracker has one call to make and does not know the
 *    difference.
 *  - **No history endpoint.** `history()` walks back a month at a time. Against
 *    the real API that is N requests fired in parallel, which is wasteful but
 *    correct; a real `GET /employees/{id}/kpis?from&to` would replace the body
 *    of one function.
 *
 * `branch` (a name) is a mock-only enrichment — the API returns `branch_id`
 * alone. Callers fall back to the id, so the label degrades rather than breaks.
 */

export const USING_MOCK_EMPLOYEES = true

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The error shape api.js normalises everything to, so callers need one path. */
const fail = (status, message) => ({ message, fieldErrors: {}, status })

const invalid = (fieldErrors) => ({ message: 'Validation failed.', fieldErrors, status: 422 })

/* --------------------------------------------------------------- mock state */

const EMPLOYEES = [
  { user_id: 2, full_name: 'Nadeesha Wickramasinghe', email: 'nadeesha@plantvest.lk', role: ROLES.SALES_REP, branch_id: 1, branch: 'Kandy Main', is_active: true },
  { user_id: 3, full_name: 'Tharindu Rajapaksa', email: 'tharindu@plantvest.lk', role: ROLES.SALES_REP, branch_id: 1, branch: 'Kandy Main', is_active: true },
  { user_id: 4, full_name: 'Ishara Gunawardena', email: 'ishara@plantvest.lk', role: ROLES.SALES_REP, branch_id: 2, branch: 'Galle', is_active: true },
  { user_id: 5, full_name: 'Chamath Dissanayake', email: 'chamath@plantvest.lk', role: ROLES.SALES_REP, branch_id: 2, branch: 'Galle', is_active: true },
  { user_id: 6, full_name: 'Sanduni Herath', email: 'sanduni@plantvest.lk', role: ROLES.SALES_REP, branch_id: 3, branch: 'Colombo Head Office', is_active: true },
  { user_id: 7, full_name: 'Mahesh Ekanayake', email: 'mahesh@plantvest.lk', role: ROLES.SALES_REP, branch_id: 3, branch: 'Colombo Head Office', is_active: true },
  { user_id: 8, full_name: 'Dilani Amarasinghe', email: 'dilani@plantvest.lk', role: ROLES.HEAD_OFFICE, branch_id: 3, branch: 'Colombo Head Office', is_active: true },
]

/**
 * One profile per employee, chosen so every band in KPI_BANDS is reachable on a
 * cold load: two comfortably on track, one behind (warn ring), one at risk
 * (danger ring), and one with no target set for the current month, which is the
 * `null` achievement path. `performance` is achievement against target.
 */
const PROFILES = {
  2: { customers: 10, revenue: 1_000_000, performance: 1.14 },
  3: { customers: 8, revenue: 800_000, performance: 0.96 },
  4: { customers: 12, revenue: 1_200_000, performance: 0.64 },
  5: { customers: 10, revenue: 1_000_000, performance: 0.31 },
  6: { customers: 6, revenue: 750_000, performance: 0.88 },
  7: { customers: 6, revenue: 600_000, performance: 0.52, noTargetThisMonth: true },
  8: { customers: 4, revenue: 400_000, performance: 1.02 },
}

const HISTORY_MONTHS = 12

/** Deterministic jitter, so the figures are stable across reloads. */
function pseudo(seed) {
  const value = Math.sin(seed) * 10_000
  return value - Math.floor(value)
}

const now = new Date()
const CURRENT = { month: now.getMonth() + 1, year: now.getFullYear() }

/** Month arithmetic that rolls the year, without pulling in a date library. */
function shiftMonth({ month, year }, delta) {
  const date = new Date(year, month - 1 + delta, 1)
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

const key = (userId, month, year) => `${userId}:${year}-${String(month).padStart(2, '0')}`

const store = new Map() // key -> { target_customers, actual_customers, target_revenue, actual_revenue }

EMPLOYEES.forEach((employee) => {
  const profile = PROFILES[employee.user_id]

  for (let back = HISTORY_MONTHS - 1; back >= 0; back -= 1) {
    const period = shiftMonth(CURRENT, -back)
    // A gentle ramp plus jitter, so a trend line has a shape rather than a
    // flat run of the same number.
    const ramp = 0.82 + ((HISTORY_MONTHS - 1 - back) / (HISTORY_MONTHS - 1)) * 0.24
    const jitter = 0.9 + pseudo(employee.user_id * 37 + back) * 0.2
    const rate = profile.performance * ramp * jitter
    const hasTarget = !(profile.noTargetThisMonth && back === 0)

    store.set(key(employee.user_id, period.month, period.year), {
      target_customers: hasTarget ? profile.customers : 0,
      actual_customers: Math.round(profile.customers * rate),
      target_revenue: hasTarget ? profile.revenue : 0,
      // Rounded to the nearest thousand — real agreement values are not
      // arbitrary rupee amounts.
      actual_revenue: Math.round((profile.revenue * rate) / 1000) * 1000,
    })
  }
})

const EMPTY_KPI = { target_customers: 0, actual_customers: 0, target_revenue: 0, actual_revenue: 0 }

/** `null` when the target is 0, matching the API. One decimal, as it sends. */
function achievement(actual, target) {
  const goal = Number(target)
  if (!goal || goal <= 0) return null
  return Math.round((Number(actual) / goal) * 1000) / 10
}

/** The `GET /employees` row shape, built from the mock store. */
function buildRow(employee, month, year) {
  const kpi = store.get(key(employee.user_id, month, year)) ?? EMPTY_KPI

  return {
    user_id: employee.user_id,
    full_name: employee.full_name,
    email: employee.email,
    role: employee.role,
    branch_id: employee.branch_id,
    branch: employee.branch, // mock-only enrichment
    is_active: employee.is_active,
    month,
    year,
    target_customers: kpi.target_customers,
    actual_customers: kpi.actual_customers,
    customer_achievement_pct: achievement(kpi.actual_customers, kpi.target_customers),
    target_revenue: Number(kpi.target_revenue).toFixed(2), // string decimal, like the API
    actual_revenue: Number(kpi.actual_revenue).toFixed(2),
    revenue_achievement_pct: achievement(kpi.actual_revenue, kpi.target_revenue),
  }
}

/* -------------------------------------------------------------- operations */

/**
 * GET /employees — one KPI row per user for the given period. `month`/`year`
 * default to the current month server-side; they are sent explicitly so the
 * period selector and the response can never disagree.
 */
async function list({ month = CURRENT.month, year = CURRENT.year } = {}) {
  if (!USING_MOCK_EMPLOYEES) {
    const { data } = await api.get('/employees', { params: { month, year } })
    return { items: data.items, month: Number(month), year: Number(year) }
  }

  await delay(350)
  const items = EMPLOYEES.map((employee) => buildRow(employee, Number(month), Number(year))).sort((a, b) =>
    a.full_name.localeCompare(b.full_name),
  )
  return { items, month: Number(month), year: Number(year) }
}

/**
 * One employee's row for a period. There is no per-employee endpoint, so this
 * filters the month's list — the tracker page treats it as a fetch by id.
 */
async function get(userId, { month = CURRENT.month, year = CURRENT.year } = {}) {
  const { items } = await list({ month, year })
  const row = items.find((item) => String(item.user_id) === String(userId))
  if (!row) throw fail(404, 'Employee not found.')
  return row
}

/**
 * The trailing `months` periods for one employee, oldest first — the series the
 * trend chart and the period breakdown both read.
 *
 * Against the real API this is one request per month, in parallel. A dedicated
 * range endpoint would collapse it to one; until then this is the only honest
 * way to assemble the series.
 */
async function history(userId, { months = 6, month = CURRENT.month, year = CURRENT.year } = {}) {
  const periods = Array.from({ length: months }, (_, index) =>
    shiftMonth({ month: Number(month), year: Number(year) }, -(months - 1 - index)),
  )

  if (!USING_MOCK_EMPLOYEES) {
    const responses = await Promise.all(
      periods.map((period) => api.get('/employees', { params: { month: period.month, year: period.year } })),
    )
    return responses.map(({ data }, index) => {
      const row = data.items.find((item) => String(item.user_id) === String(userId))
      return row ?? { ...periods[index], ...EMPTY_KPI, target_revenue: '0.00', actual_revenue: '0.00', customer_achievement_pct: null, revenue_achievement_pct: null }
    })
  }

  await delay(400)
  const employee = EMPLOYEES.find((item) => String(item.user_id) === String(userId))
  if (!employee) throw fail(404, 'Employee not found.')
  return periods.map((period) => buildRow(employee, period.month, period.year))
}

/**
 * POST /employees/{user_id}/targets — upsert a monthly target, preserving the
 * actuals already accumulated against it. **Admin only**; a non-admin gets 403
 * from the server, and the page hides the form rather than inviting the refusal.
 *
 * The response is a target row: no identity fields and no achievement
 * percentages. Both branches normalise it the same way — percentages recomputed
 * from the returned figures — so the caller merges one predictable shape into
 * the employee row it already holds.
 */
async function setTarget(userId, { month, year, targetCustomers, targetRevenue }) {
  const payload = {
    month: Number(month),
    year: Number(year),
    target_customers: Number(targetCustomers),
    target_revenue: Number(targetRevenue).toFixed(2),
  }

  if (!USING_MOCK_EMPLOYEES) {
    const { data } = await api.post(`/employees/${userId}/targets`, payload)
    return normalizeTarget(data)
  }

  await delay(500)
  const employee = EMPLOYEES.find((item) => String(item.user_id) === String(userId))
  if (!employee) throw fail(404, 'Employee not found.')

  // Mirrors the server's validation, so the form's inline errors are exercised
  // by the mock exactly as they will be by the API.
  if (!(payload.month >= 1 && payload.month <= 12)) throw invalid({ month: 'Month must be between 1 and 12.' })
  if (!(payload.year >= 2000 && payload.year <= 2100)) throw invalid({ year: 'Year must be between 2000 and 2100.' })
  if (!Number.isInteger(payload.target_customers) || payload.target_customers < 0) {
    throw invalid({ target_customers: 'Customer target must be zero or more.' })
  }
  if (!(Number(payload.target_revenue) >= 0)) {
    throw invalid({ target_revenue: 'Revenue target must be zero or more.' })
  }

  const rowKey = key(userId, payload.month, payload.year)
  const existing = store.get(rowKey) ?? EMPTY_KPI
  const updated = {
    ...existing, // actuals survive the upsert
    target_customers: payload.target_customers,
    target_revenue: Number(payload.target_revenue),
  }
  store.set(rowKey, updated)

  return normalizeTarget({
    id: Number(`${userId}${payload.year}${payload.month}`),
    user_id: Number(userId),
    month: payload.month,
    year: payload.year,
    target_customers: updated.target_customers,
    actual_customers: updated.actual_customers,
    target_revenue: Number(updated.target_revenue).toFixed(2),
    actual_revenue: Number(updated.actual_revenue).toFixed(2),
  })
}

/** Adds the two achievement percentages the target response omits. */
function normalizeTarget(target) {
  return {
    ...target,
    customer_achievement_pct: achievement(target.actual_customers, target.target_customers),
    revenue_achievement_pct: achievement(target.actual_revenue, target.target_revenue),
  }
}

export const CURRENT_PERIOD = CURRENT

export default { list, get, history, setTarget }
