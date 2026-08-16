/**
 * Roles, the nav config, and the route title table — the three things that have
 * to agree with Section 4 of the spec. A link never appears for a route the
 * user cannot open, so `roles` here is the same list the route guard checks.
 */

export const ROLES = {
  ADMIN: 'admin',
  HEAD_OFFICE: 'head_office_staff',
  SALES_REP: 'sales_rep',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.HEAD_OFFICE]: 'Head Office',
  [ROLES.SALES_REP]: 'Sales Rep',
}

/** Every authenticated role. Use for routes marked "all" in the access map. */
export const ALL_ROLES = [ROLES.ADMIN, ROLES.HEAD_OFFICE, ROLES.SALES_REP]

/** Admin + head office — the reviewing roles. */
export const REVIEW_ROLES = [ROLES.ADMIN, ROLES.HEAD_OFFICE]

/** Role as a form option. Order follows ALL_ROLES, so it reads most senior first. */
export const ROLE_OPTIONS = ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))

/* --------------------------------------------------------------- branches */

/**
 * Branch reference data.
 *
 * The contract has no `/branches` endpoint — a user carries a bare `branch_id`
 * — so this is both the id → name lookup and the option list every branch
 * selector and filter reads. The ids are the ones the employee and user mocks
 * assign, so a filter can never offer a branch the data does not use.
 *
 * When the API grows a branches endpoint this becomes a fetch; callers already
 * ask for `branchName(id)` rather than indexing the array, so nothing above
 * this file changes.
 */
export const BRANCHES = [
  { id: 1, name: 'Kandy Main' },
  { id: 2, name: 'Galle' },
  { id: 3, name: 'Colombo Head Office' },
  { id: 4, name: 'Kurunegala' },
]

export const BRANCH_OPTIONS = BRANCHES.map((branch) => ({
  value: String(branch.id),
  label: branch.name,
}))

/**
 * `branch_id` is nullable — head office accounts often have none — so an absent
 * id is "Unassigned" rather than an error. An id with no matching branch still
 * renders as itself: a stale reference should be visible, not swallowed.
 */
export function branchName(id) {
  if (id == null || id === '') return 'Unassigned'
  return BRANCHES.find((branch) => String(branch.id) === String(id))?.name ?? `Branch ${id}`
}

/* ------------------------------------------------------------- navigation */

export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'dashboard', end: true, roles: ALL_ROLES }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/customers', label: 'Customers', icon: 'customers', roles: ALL_ROLES },
      { to: '/documents/upload', label: 'Upload document', icon: 'upload', roles: ALL_ROLES },
      { to: '/agreements', label: 'Agreements', icon: 'agreements', roles: ALL_ROLES },
      { to: '/proposals', label: 'Proposals', icon: 'proposals', roles: ALL_ROLES },
    ],
  },
  {
    label: 'Oversight',
    items: [
      { to: '/employees', label: 'Employees', icon: 'employees', roles: REVIEW_ROLES },
      { to: '/admin/reports', label: 'Reports', icon: 'reports', roles: REVIEW_ROLES },
    ],
  },
  {
    label: 'Administration',
    items: [{ to: '/admin/users', label: 'Users', icon: 'admin', roles: [ROLES.ADMIN] }],
  },
]

/** Drops items the role cannot open, then drops any section left empty. */
export function navForRole(role) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0)
}

/* ---------------------------------------------------------------- statuses */

/**
 * Mirrors the backend enums. The `variant` on each entry is the Badge variant
 * from the design system, so status colour is decided once here rather than
 * re-derived in every table and detail panel.
 */
export const CUSTOMER_STATUS = {
  pending: { label: 'Pending', variant: 'warn' },
  verified: { label: 'Verified', variant: 'ok' },
  flagged: { label: 'Flagged', variant: 'danger' },
}

export const AGREEMENT_STATUS = {
  pending: { label: 'Pending', variant: 'warn' },
  active: { label: 'Active', variant: 'ok' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
}

export const VERIFICATION_STATUS = {
  pending: { label: 'Pending', variant: 'warn' },
  verified: { label: 'Verified', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'danger' },
}

/**
 * A user account is active or it is not. Deactivation is an administrative
 * decision rather than a failure, so it reads neutral — the same treatment a
 * cancelled agreement gets. Nothing about a person's account is `danger`.
 */
export const USER_STATUS = {
  active: { label: 'Active', variant: 'ok' },
  inactive: { label: 'Inactive', variant: 'neutral' },
}

export function userStatus(isActive) {
  return isActive ? USER_STATUS.active : USER_STATUS.inactive
}

export const PROPOSAL_STAGES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'rep_review', label: 'Rep review' },
  { value: 'ho_review', label: 'Head office review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/** Badge variant per workflow state. In-flight stages read as pending. */
export const PROPOSAL_STATUS = {
  submitted: { label: 'Submitted', variant: 'warn' },
  rep_review: { label: 'Rep review', variant: 'warn' },
  ho_review: { label: 'Head office review', variant: 'warn' },
  approved: { label: 'Approved', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'danger' },
}

/**
 * The five stepper nodes from Phase 11: the four linear workflow states plus the
 * agreement that follows approval. `rejected` is deliberately not a node — it is
 * an exit from whichever stage the proposal was sitting in, so the stepper marks
 * that node as the stopping point rather than adding a sixth column.
 *
 * `agreement` is not a backend workflow_status; it is complete once the proposal
 * carries an `agreement_id`.
 */
export const PROPOSAL_FLOW = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'rep_review', label: 'Rep review' },
  { key: 'ho_review', label: 'HO review' },
  { key: 'approved', label: 'Approved' },
  { key: 'agreement', label: 'Agreement' },
]

/**
 * Who may perform each transition, mirroring the state machine in API.md.
 * Terminal states (`approved`, `rejected`) have no entry — the API answers a
 * further advance with 422. `admin` may perform any transition.
 *
 * The page reads this to decide which action buttons exist and the mock service
 * reads it to answer a forbidden transition with 403, so the UI gate and the
 * server rule can never drift apart.
 */
export const PROPOSAL_TRANSITIONS = {
  submitted: {
    to: 'rep_review',
    label: 'Send to rep review',
    roles: [ROLES.SALES_REP, ROLES.ADMIN],
    waitingOn: 'the assigned sales rep',
  },
  rep_review: {
    to: 'ho_review',
    label: 'Send to head office',
    roles: [ROLES.SALES_REP, ROLES.ADMIN],
    waitingOn: 'the assigned sales rep',
  },
  ho_review: {
    decision: true, // approve / reject, and `decision` is required on the request
    label: 'Approve',
    roles: [ROLES.HEAD_OFFICE, ROLES.ADMIN],
    waitingOn: 'head office',
  },
}

/** True when this role may advance a proposal sitting in this stage. */
export function canAdvanceProposal(status, role) {
  const transition = PROPOSAL_TRANSITIONS[status]
  return Boolean(transition && role && transition.roles.includes(role))
}

export const DOC_TYPES = [
  { value: 'nic', label: 'NIC' },
  { value: 'bank_slip', label: 'Bank slip' },
  { value: 'bank_book', label: 'Bank book' },
  { value: 'proposal_form', label: 'Proposal form' },
]

/**
 * Fraud severity bands from the design system. One definition, so a score never
 * reads as "Review" on one screen and "Flagged" on another.
 */
export const FRAUD_BANDS = [
  { max: 39, verdict: 'Safe', variant: 'ok' },
  { max: 69, verdict: 'Review', variant: 'warn' },
  { max: 100, verdict: 'Flagged', variant: 'danger' },
]

export function fraudVerdict(score) {
  return FRAUD_BANDS.find((band) => score <= band.max) ?? FRAUD_BANDS[FRAUD_BANDS.length - 1]
}

/**
 * OCR per-field confidence bands. High reads as neutral — nothing to check;
 * medium and low escalate the colour, and a low-confidence field is the one the
 * upload screen turns into an editable input so staff can correct it. One
 * definition, so a 0.71 never reads "Medium" on one panel and "Low" on another.
 */
export const CONFIDENCE_BANDS = [
  { min: 0.9, label: 'High', variant: 'neutral' },
  { min: 0.75, label: 'Medium', variant: 'warn' },
  { min: 0, label: 'Low', variant: 'danger' },
]

export function confidenceBand(confidence) {
  const value = Number(confidence)
  const pct = Number.isFinite(value) ? value : 0
  return CONFIDENCE_BANDS.find((band) => pct >= band.min) ?? CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1]
}

/* ------------------------------------------------------------------- KPIs */

/**
 * Achievement bands for the KPI ring. A ring stays ink.950 while an employee is
 * on track, so a grid of rings reads as monochrome and only an underperformer
 * carries colour — that is what makes them findable at a glance.
 *
 * Thresholds are on achievement percentage (actual ÷ target), which the backend
 * already computes as `customer_achievement_pct` / `revenue_achievement_pct`.
 */
export const KPI_BANDS = [
  { min: 80, label: 'On track', variant: 'neutral' },
  { min: 50, label: 'Behind', variant: 'warn' },
  { min: 0, label: 'At risk', variant: 'danger' },
]

/**
 * No target set is not a performance state — the API answers `null` for the
 * percentage when the target is 0, and rendering that as failure would blame an
 * employee for an admin's omission. It reads neutral.
 */
export const KPI_NO_TARGET = { label: 'No target', variant: 'neutral', unset: true }

export function kpiBand(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return KPI_NO_TARGET
  const value = Number(pct)
  return KPI_BANDS.find((band) => value >= band.min) ?? KPI_BANDS[KPI_BANDS.length - 1]
}

/* ----------------------------------------------------------------- periods */

const MONTH_FORMAT = new Intl.DateTimeFormat('en', { month: 'long' })

/** Month options for the KPI period selector. `value` is the API's 1–12 month. */
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: MONTH_FORMAT.format(new Date(2000, index, 1)),
}))

/**
 * A window around the current year, wide enough to review last year's figures
 * and set next year's targets. The API accepts 2000–2100; there is no value in
 * offering a century of empty months in a select.
 */
export function yearOptions(reference = new Date().getFullYear()) {
  return [reference - 2, reference - 1, reference, reference + 1].map((year) => ({
    value: String(year),
    label: String(year),
  }))
}

/* ---------------------------------------------------------------- reports */

/**
 * The report set the Reports screen can run.
 *
 * Each entry names the record type and the status vocabulary that applies to it,
 * so the status filter re-populates when the report type changes instead of
 * offering, say, "cancelled" against a document. `statuses` points at the maps
 * above rather than restating them — a status colour is still decided once.
 */
export const REPORT_TYPES = [
  {
    value: 'customers',
    label: 'Customer registrations',
    noun: 'customer',
    statuses: CUSTOMER_STATUS,
  },
  {
    value: 'agreements',
    label: 'Agreements issued',
    noun: 'agreement',
    statuses: AGREEMENT_STATUS,
  },
  {
    value: 'proposals',
    label: 'Proposals',
    noun: 'proposal',
    statuses: PROPOSAL_STATUS,
  },
  {
    value: 'documents',
    label: 'Document verifications',
    noun: 'document',
    statuses: VERIFICATION_STATUS,
  },
]

export const REPORT_TYPE_OPTIONS = REPORT_TYPES.map(({ value, label }) => ({ value, label }))

export function reportType(value) {
  return REPORT_TYPES.find((type) => type.value === value) ?? REPORT_TYPES[0]
}

/** Status options for a report type, with "All" first — the unfiltered default. */
export function statusOptionsFor(value) {
  const { statuses } = reportType(value)
  return [
    { value: '', label: 'All statuses' },
    ...Object.entries(statuses).map(([key, meta]) => ({ value: key, label: meta.label })),
  ]
}

/** Shortest password the user form will submit; the server is the authority. */
export const PASSWORD_MIN_LENGTH = 8

/* ------------------------------------------------------------ page titles */

/**
 * Path pattern → navbar title, most specific first. Patterns are matched with
 * react-router's `matchPath`, so `:id` segments work as written.
 */
export const ROUTE_TITLES = [
  ['/', 'Dashboard'],
  ['/customers', 'Customers'],
  ['/customers/new', 'New customer'],
  ['/customers/:id', 'Customer'],
  ['/customers/:id/edit', 'Edit customer'],
  ['/documents/upload', 'Upload document'],
  ['/documents/:id/fraud', 'Fraud report'],
  ['/agreements', 'Agreements'],
  ['/agreements/:id', 'Agreement'],
  ['/proposals', 'Proposals'],
  ['/employees', 'Employees'],
  ['/employees/:id/kpi', 'KPI tracker'],
  ['/admin/users', 'User management'],
  ['/admin/reports', 'Reports'],
]
