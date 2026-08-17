import customerService from './customerService'

/**
 * Join customer summaries onto rows that carry only a `customer_id`.
 *
 * The agreement and proposal **list** endpoints return the foreign key alone;
 * only their detail endpoints nest a `{ id, customer_code, full_name }` summary.
 * Rather than have two services each grow their own join — or have every card
 * render "Customer #4" — both call this.
 *
 * One `/customers` read covers a whole page of rows. It is deliberately a single
 * page rather than a per-row fetch: a table of ten must not become eleven
 * requests, and the customer book a caller can see is scoped server-side anyway.
 * Rows whose id is not in that page keep no `customer` key, which is the case the
 * cards already fall back on.
 *
 * A failed lookup is never fatal — the rows are the answer, the names are a
 * courtesy — so the original items are returned unchanged.
 */
const LOOKUP_PAGE_SIZE = 100

export async function attachCustomers(items, { perPage = LOOKUP_PAGE_SIZE } = {}) {
  const rows = items ?? []
  const ids = new Set(rows.map((row) => row.customer_id).filter((id) => id != null))
  if (!ids.size) return rows

  let byId
  try {
    const { items: customers } = await customerService.list({ page: 1, perPage })
    byId = new Map(
      customers.map((customer) => [
        customer.id,
        { id: customer.id, customer_code: customer.customer_code, full_name: customer.full_name },
      ]),
    )
  } catch {
    return rows
  }

  return rows.map((row) =>
    byId.has(row.customer_id) ? { ...row, customer: byId.get(row.customer_id) } : row,
  )
}

export default { attachCustomers }
