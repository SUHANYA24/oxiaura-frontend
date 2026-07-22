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

/* ------------------------------------------------------------- navigation */

export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', end: true, roles: ALL_ROLES }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/customers', label: 'Customers', roles: ALL_ROLES },
      { to: '/documents/upload', label: 'Upload document', roles: ALL_ROLES },
      { to: '/agreements', label: 'Agreements', roles: ALL_ROLES },
      { to: '/proposals', label: 'Proposals', roles: ALL_ROLES },
    ],
  },
  {
    label: 'Oversight',
    items: [
      { to: '/employees', label: 'Employees', roles: REVIEW_ROLES },
      { to: '/admin/reports', label: 'Reports', roles: REVIEW_ROLES },
    ],
  },
  {
    label: 'Administration',
    items: [{ to: '/admin/users', label: 'Users', roles: [ROLES.ADMIN] }],
  },
]

/** Drops items the role cannot open, then drops any section left empty. */
export function navForRole(role) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0)
}

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
