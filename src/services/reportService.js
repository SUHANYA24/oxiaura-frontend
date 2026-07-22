import api from './api'

/**
 * Dashboard aggregates.
 *
 * The API has no reports endpoint yet — only /auth, /customers and /health
 * exist. Per the build spec, the gap is mocked *in the service layer only*, so
 * every consumer above this file already talks to the real shape and swapping
 * to `GET /reports/dashboard` is a one-file change.
 *
 * What is REAL today: total customer count and the recent customers list, both
 * read from /customers. Everything under MOCK below is invented and must not be
 * read as backend truth.
 */

const MOCK = {
  activeAgreements: 18,
  fraudFlags: 4,
  totalRevenue: 14_650_000,

  trends: {
    // 12 points each, oldest → newest, for the stat card sparklines.
    customers: [6, 7, 7, 9, 8, 11, 12, 12, 14, 15, 17, 19],
    agreements: [3, 4, 6, 5, 8, 9, 11, 10, 13, 15, 16, 18],
    fraudFlags: [1, 0, 2, 1, 3, 2, 2, 4, 3, 5, 4, 4],
    revenue: [4.1, 4.9, 5.4, 6.2, 7.0, 8.1, 9.3, 10.2, 11.4, 12.6, 13.5, 14.65],
  },

  monthlyVolume: [
    { month: 'Aug', agreements: 6 },
    { month: 'Sep', agreements: 9 },
    { month: 'Oct', agreements: 7 },
    { month: 'Nov', agreements: 12 },
    { month: 'Dec', agreements: 15 },
    { month: 'Jan', agreements: 11 },
    { month: 'Feb', agreements: 14 },
    { month: 'Mar', agreements: 18 },
    { month: 'Apr', agreements: 16 },
    { month: 'May', agreements: 21 },
    { month: 'Jun', agreements: 19 },
    { month: 'Jul', agreements: 24 },
  ],

  fraudAlerts: [
    { id: 1, customerName: 'Sunil Fernando', docType: 'NIC', score: 87, raisedAt: '2026-07-21T09:14:00' },
    { id: 2, customerName: 'Rohan Jayasuriya', docType: 'Bank slip', score: 64, raisedAt: '2026-07-20T16:40:00' },
    { id: 3, customerName: 'Menaka Wickrama', docType: 'Bank book', score: 52, raisedAt: '2026-07-20T11:05:00' },
    { id: 4, customerName: 'Ishara Gunawardena', docType: 'NIC', score: 31, raisedAt: '2026-07-19T14:22:00' },
  ],

  notifications: [
    { id: 1, message: 'Agreement A-2043 was approved by head office.', at: '2026-07-22T08:30:00', severity: 'ok' },
    { id: 2, message: 'Document for Sunil Fernando flagged at 87.', at: '2026-07-21T09:14:00', severity: 'danger' },
    { id: 3, message: 'Three proposals are awaiting rep review.', at: '2026-07-21T07:55:00', severity: 'warn' },
    { id: 4, message: 'Monthly KPI targets published for August.', at: '2026-07-20T17:10:00', severity: 'info' },
  ],

  engines: [
    { id: 'ocr', name: 'OCR extraction', state: 'ok', detail: 'Operational' },
    { id: 'ela', name: 'ELA analysis', state: 'ok', detail: 'Operational' },
    { id: 'cnn', name: 'CNN forgery model', state: 'warn', detail: 'Degraded — elevated latency' },
    { id: 'siamese', name: 'Siamese duplicate match', state: 'ok', detail: 'Operational' },
  ],
}

/** True for anything the UI is showing that did not come from the API. */
export const USING_MOCK_AGGREGATES = true

async function dashboard() {
  // Real: the customer count and the most recent registrations.
  const { data } = await api.get('/customers', { params: { page: 1, per_page: 5 } })

  return {
    stats: {
      totalCustomers: data.pagination.total,
      activeAgreements: MOCK.activeAgreements,
      fraudFlags: MOCK.fraudFlags,
      totalRevenue: MOCK.totalRevenue,
    },
    trends: MOCK.trends,
    recentCustomers: data.items,
    monthlyVolume: MOCK.monthlyVolume,
    fraudAlerts: MOCK.fraudAlerts,
    notifications: MOCK.notifications,
    engines: MOCK.engines,
  }
}

export default { dashboard }
