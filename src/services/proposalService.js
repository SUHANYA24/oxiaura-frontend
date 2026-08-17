import api from './api'
import { attachCustomers } from './customerLookup'
import { PROPOSAL_TRANSITIONS, ROLES } from '@/utils/constants'

/**
 * Proposals — the linear approval workflow:
 *
 *   submitted ──(rep)──▶ rep_review ──(rep)──▶ ho_review ──(HO)──▶ approved
 *                                                          └──(HO)──▶ rejected
 *
 * Live against the API: POST /proposals, GET /proposals, GET /proposals/{id} and
 * PUT /proposals/{id}/advance all exist and enforce the state machine plus the
 * role allowed to perform each transition (403 otherwise, 422 on a terminal
 * state). The mock branch behind USING_MOCK_PROPOSALS is kept for working
 * offline.
 *
 * Three places where the contract is narrower than the screen, all handled here:
 *
 * - **`notes` is one optional string, not a thread.** `normalize()` wraps it into
 *   a one-entry thread so the panel renders one shape either way, and
 *   SUPPORTS_PROPOSAL_NOTES tells the page there is nothing to append to.
 * - **A rejection carries no reason.** `PUT /advance` accepts `decision` and
 *   nothing else (unknown fields are rejected outright), so the reason field is
 *   hidden rather than collected and dropped — see SUPPORTS_REJECTION_REASON.
 * - **No proposal → agreement link.** `agreement_id` is absent live, so the final
 *   stepper node stays pending until the backend records it.
 */

export const USING_MOCK_PROPOSALS = false

/** No POST /proposals/{id}/notes: the thread is read-only after submission. */
export const SUPPORTS_PROPOSAL_NOTES = USING_MOCK_PROPOSALS

/**
 * `ProposalAdvanceSchema` accepts `decision` alone and rejects unknown fields, so
 * a reason typed into a form could only be discarded. Better not to ask for it.
 */
export const SUPPORTS_REJECTION_REASON = USING_MOCK_PROPOSALS

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The error shape api.js normalises everything to, so callers need one path. */
const fail = (status, message) => ({ message, fieldErrors: {}, status })

/* --------------------------------------------------------------- mock state */

const store = new Map() // id -> proposal record
let seq = 0
let noteSeq = 0

function note({ body, author, role, stage, minutesAgo = 0, system = false }) {
  noteSeq += 1
  return {
    id: noteSeq,
    body,
    author,
    role,
    stage,
    system,
    at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  }
}

/** The detail shape from API.md, plus the two enrichments described above. */
function record({ customer, rep, amount, productType, status, minutesAgo, notes, agreementId, rejectionReason }) {
  seq += 1
  const submittedAt = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  return {
    id: seq,
    customer_id: customer.id,
    customer, // nested summary — present on detail, mock-enriched onto list rows
    sales_rep_id: rep.id,
    sales_rep: rep,
    proposed_amount: Number(amount).toFixed(2), // string decimal, like the API
    product_type: productType ?? null,
    workflow_status: status,
    submitted_at: submittedAt,
    updated_at: submittedAt,
    rejection_reason: rejectionReason ?? null,
    agreement_id: agreementId ?? null,
    notes: notes ?? [],
  }
}

function seed(config) {
  const rec = record(config)
  store.set(rec.id, rec)
  return rec
}

const REP = { id: 2, full_name: 'Sales Rep', role: ROLES.SALES_REP }
const HO = { id: 3, full_name: 'Head Office Staff', role: ROLES.HEAD_OFFICE }

// One proposal parked at each stage, so every stepper state and every role's
// action set is reachable on a cold load without submitting anything first.
seed({
  customer: { id: 1, customer_code: 'C-1001', full_name: 'Nimal Perera' },
  rep: REP,
  amount: 75000,
  productType: 'Teak Plantation Unit',
  status: 'submitted',
  minutesAgo: 90,
  notes: [note({ body: 'Customer walked in with NIC and bank book. Documents uploaded.', author: REP.full_name, role: REP.role, stage: 'submitted', minutesAgo: 88 })],
})

seed({
  customer: { id: 2, customer_code: 'C-1002', full_name: 'Kamala Silva' },
  rep: REP,
  amount: 120000,
  productType: 'Coconut Estate Share',
  status: 'rep_review',
  minutesAgo: 1440,
  notes: [
    note({ body: 'Second unit for an existing investor. Amount confirmed by phone.', author: REP.full_name, role: REP.role, stage: 'submitted', minutesAgo: 1438 }),
    note({ body: 'Advanced to rep review.', author: REP.full_name, role: REP.role, stage: 'rep_review', minutesAgo: 300, system: true }),
  ],
})

seed({
  customer: { id: 3, customer_code: 'C-1003', full_name: 'Rohan Jayasuriya' },
  rep: REP,
  amount: 240000,
  productType: 'Teak Plantation Unit',
  status: 'ho_review',
  minutesAgo: 4320,
  notes: [
    note({ body: 'Large ticket — flagging for head office attention on the source of funds.', author: REP.full_name, role: REP.role, stage: 'rep_review', minutesAgo: 4000 }),
    note({ body: 'Advanced to head office review.', author: REP.full_name, role: REP.role, stage: 'ho_review', minutesAgo: 2880, system: true }),
  ],
})

seed({
  customer: { id: 4, customer_code: 'C-1004', full_name: 'Anusha Fernando' },
  rep: REP,
  amount: 50000,
  productType: 'Coconut Estate Share',
  status: 'approved',
  minutesAgo: 10080,
  agreementId: 1, // links to the seeded agreement in agreementService — node 5 complete
  notes: [
    note({ body: 'Documents clean, fraud score 12. Approving.', author: HO.full_name, role: HO.role, stage: 'ho_review', minutesAgo: 8000 }),
    note({ body: 'Approved at head office review.', author: HO.full_name, role: HO.role, stage: 'approved', minutesAgo: 8000, system: true }),
  ],
})

seed({
  customer: { id: 5, customer_code: 'C-1005', full_name: 'Sunil Bandara' },
  rep: REP,
  amount: 310000,
  productType: 'Teak Plantation Unit',
  status: 'rejected',
  minutesAgo: 20160,
  rejectionReason: 'Bank slip did not match the declared account holder; duplicate of an earlier submission.',
  notes: [
    note({ body: 'Rejected at head office review: Bank slip did not match the declared account holder; duplicate of an earlier submission.', author: HO.full_name, role: HO.role, stage: 'rejected', minutesAgo: 19000, system: true }),
  ],
})

/**
 * The real GET /proposals returns a single optional `notes` string. Normalise it
 * into the thread shape the detail panel renders, so the page never branches on
 * whether it is talking to the mock or the live API.
 */
function normalize(proposal) {
  if (Array.isArray(proposal.notes)) return proposal
  return {
    ...proposal,
    notes: proposal.notes
      ? [{ id: 1, body: proposal.notes, author: proposal.sales_rep?.full_name ?? 'Sales rep', role: ROLES.SALES_REP, stage: 'submitted', at: proposal.submitted_at, system: false }]
      : [],
  }
}

/* -------------------------------------------------------------- operations */

/**
 * POST /proposals — `customer_id` required, `proposed_amount` > 0,
 * `product_type` and `notes` optional. `sales_rep_id` is derived server-side
 * from the customer's assigned rep, so it is never sent.
 */
async function create({ customerId, customer, proposedAmount, productType, note: body, author, authorId, role }) {
  if (!USING_MOCK_PROPOSALS) {
    const { data } = await api.post('/proposals', {
      customer_id: Number(customerId),
      proposed_amount: Number(proposedAmount).toFixed(2),
      ...(productType ? { product_type: productType } : {}),
      ...(body ? { notes: body } : {}),
    })
    return normalize(data)
  }

  await delay(600)
  const amount = Number(proposedAmount)
  if (!customerId) throw { message: 'Validation failed.', fieldErrors: { customer_id: 'Select a customer.' }, status: 422 }
  if (!(amount > 0)) throw { message: 'Validation failed.', fieldErrors: { proposed_amount: 'Amount must be greater than zero.' }, status: 422 }

  const rec = record({
    customer: customer ?? { id: Number(customerId), customer_code: '—', full_name: `Customer #${customerId}` },
    // The server derives the rep from the customer's assignment. In the mock the
    // closest stand-in is the submitting rep; other roles fall back to the seeded
    // rep, since they are submitting on someone else's behalf.
    rep: role === ROLES.SALES_REP && author ? { id: authorId ?? REP.id, full_name: author, role } : REP,
    amount,
    productType,
    status: 'submitted',
    minutesAgo: 0,
    notes: body ? [note({ body, author: author ?? REP.full_name, role: role ?? REP.role, stage: 'submitted' })] : [],
  })
  store.set(rec.id, rec)
  return { ...rec }
}

/**
 * GET /proposals — paginated, optional `status` filter, scoped to the caller.
 *
 * List rows carry `customer_id` but no nested customer (only detail does), so the
 * names are joined on from one `/customers` read — see customerLookup.
 */
async function list({ page = 1, perPage = 10, status = '' } = {}) {
  if (!USING_MOCK_PROPOSALS) {
    const { data } = await api.get('/proposals', {
      params: { page, per_page: perPage, ...(status ? { status } : {}) },
    })
    const items = await attachCustomers((data.items ?? []).map(normalize))
    return { items, pagination: data.pagination }
  }

  await delay(300)
  const all = Array.from(store.values())
    .filter((rec) => !status || rec.workflow_status === status)
    .sort((a, b) => b.id - a.id) // newest first
  const total = all.length
  const start = (page - 1) * perPage
  const items = all.slice(start, start + perPage).map((rec) => ({ ...rec }))
  return {
    items,
    pagination: {
      page,
      per_page: perPage,
      total,
      pages: Math.max(1, Math.ceil(total / perPage)),
      has_next: start + perPage < total,
      has_prev: page > 1,
    },
  }
}

/** GET /proposals/{id} — detail, with the nested customer summary. */
async function get(id) {
  if (!USING_MOCK_PROPOSALS) {
    const { data } = await api.get(`/proposals/${id}`)
    return normalize(data)
  }
  await delay(250)
  const rec = store.get(Number(id))
  if (!rec) throw fail(404, 'Proposal not found.')
  return { ...rec }
}

/**
 * PUT /proposals/{id}/advance — one stage per call. `decision`
 * (`approved`/`rejected`) is required only at `ho_review`; the linear stages
 * ignore it. A forbidden transition is a 403 and a terminal state is a 422.
 *
 * `role`, `author` and `reason` are mock-only: the server derives the actor from
 * the token, and API.md has no field for a rejection reason yet — it is kept in
 * the thread so the decision stays auditable in the UI.
 */
async function advance(id, { decision, reason, role, author } = {}) {
  if (!USING_MOCK_PROPOSALS) {
    const { data } = await api.put(`/proposals/${id}/advance`, decision ? { decision } : {})
    return normalize(data)
  }

  await delay(500)
  const rec = store.get(Number(id))
  if (!rec) throw fail(404, 'Proposal not found.')

  const transition = PROPOSAL_TRANSITIONS[rec.workflow_status]
  if (!transition) throw fail(422, 'This proposal has reached a terminal state and cannot be advanced.')
  if (!role || !transition.roles.includes(role)) {
    throw fail(403, 'Your role cannot advance this proposal from its current stage.')
  }

  let nextStatus = transition.to
  if (transition.decision) {
    if (decision !== 'approved' && decision !== 'rejected') {
      throw { message: 'Validation failed.', fieldErrors: { decision: 'A decision is required at head office review.' }, status: 422 }
    }
    nextStatus = decision
    if (decision === 'rejected' && !String(reason ?? '').trim()) {
      throw { message: 'Validation failed.', fieldErrors: { reason: 'A reason is required to reject.' }, status: 422 }
    }
  }

  const label =
    nextStatus === 'approved'
      ? 'Approved at head office review.'
      : nextStatus === 'rejected'
        ? `Rejected at head office review: ${String(reason).trim()}`
        : `Advanced to ${nextStatus.replace('_', ' ')}.`

  const updated = {
    ...rec,
    workflow_status: nextStatus,
    updated_at: new Date().toISOString(),
    rejection_reason: nextStatus === 'rejected' ? String(reason).trim() : rec.rejection_reason,
    notes: [...rec.notes, note({ body: label, author: author ?? 'System', role, stage: nextStatus, system: true })],
  }
  store.set(updated.id, updated)
  return { ...updated }
}

/**
 * Append a note to the thread. Mock-only — there is no
 * POST /proposals/{id}/notes, and the live proposal keeps one `notes` string that
 * was set at submission, so an append could only overwrite it. The page reads
 * SUPPORTS_PROPOSAL_NOTES and hides the composer; this throws rather than
 * reporting a save that never happened.
 */
async function addNote(id, { body, author, role }) {
  if (!USING_MOCK_PROPOSALS) {
    throw {
      message: 'Adding notes to a proposal is not supported by the API yet.',
      fieldErrors: {},
      status: 501,
    }
  }

  await delay(350)
  const rec = store.get(Number(id))
  if (!rec) throw fail(404, 'Proposal not found.')
  const text = String(body ?? '').trim()
  if (!text) throw { message: 'Validation failed.', fieldErrors: { note: 'Write something first.' }, status: 422 }

  const updated = {
    ...rec,
    notes: [...rec.notes, note({ body: text, author, role, stage: rec.workflow_status })],
  }
  store.set(updated.id, updated)
  return { ...updated }
}

export default { create, list, get, advance, addNote }
