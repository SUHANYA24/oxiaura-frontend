import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import WorkflowStepper from '@/components/WorkflowStepper'
import proposalService, {
  SUPPORTS_PROPOSAL_NOTES,
  SUPPORTS_REJECTION_REASON,
  USING_MOCK_PROPOSALS,
} from '@/services/proposalService'
import customerService from '@/services/customerService'
import { useAuth } from '@/hooks/useAuth'
import {
  canAdvanceProposal,
  PROPOSAL_FLOW,
  PROPOSAL_STAGES,
  PROPOSAL_STATUS,
  PROPOSAL_TRANSITIONS,
  ROLE_LABELS,
} from '@/utils/constants'
import { formatCurrency, formatDateTime, formatRelative } from '@/utils/formatters'
import { cn } from '@/utils/cn'

const PER_PAGE = 8

const STAGE_SEGMENTS = [{ value: '', label: 'All' }, ...PROPOSAL_STAGES]

/** The linear states, in order. `rejected` is an exit, not a position. */
const ORDER = ['submitted', 'rep_review', 'ho_review', 'approved']

/**
 * Segmented control: the selected segment is an ink.950 fill with white text,
 * the same treatment as the active nav item and the active page in Pagination.
 */
function StageFilter({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Filter by stage"
      className="inline-flex flex-wrap rounded-control border border-ink-200 bg-white p-0.5"
    >
      {STAGE_SEGMENTS.map((segment) => {
        const active = segment.value === value
        return (
          <button
            key={segment.value || 'all'}
            type="button"
            onClick={() => onChange(segment.value)}
            aria-pressed={active}
            className={cn(
              'rounded-[6px] px-3 py-1.5 text-[13px] transition-colors duration-150 ease-out',
              active ? 'bg-ink-950 font-medium text-white' : 'text-ink-600 hover:text-ink-950',
            )}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Derives the five stepper node states from a proposal.
 *
 * `workflow_status` names the stage the proposal is *sitting in*, awaiting
 * action, so that node is the current one rather than a completed one. Approval
 * is different: once approved, the four workflow nodes are all behind us and the
 * outstanding work is the agreement. Rejection can only happen at head office
 * review, so that is the node marked as the stopping point.
 */
function stepsFor(proposal) {
  const status = proposal.workflow_status
  const rejected = status === 'rejected'
  const activeIndex = rejected ? ORDER.indexOf('ho_review') : ORDER.indexOf(status)
  const hasAgreement = Boolean(proposal.agreement_id)

  return PROPOSAL_FLOW.map((node, index) => {
    if (node.key === 'agreement') {
      if (hasAgreement) return { ...node, state: 'complete' }
      return { ...node, state: status === 'approved' ? 'current' : 'pending' }
    }
    if (rejected) {
      if (index < activeIndex) return { ...node, state: 'complete' }
      return { ...node, state: index === activeIndex ? 'stopped' : 'pending' }
    }
    if (status === 'approved') return { ...node, state: 'complete' }
    if (index < activeIndex) return { ...node, state: 'complete' }
    return { ...node, state: index === activeIndex ? 'current' : 'pending' }
  })
}

const statusMeta = (status) =>
  PROPOSAL_STATUS[status] ?? { label: String(status ?? '—'), variant: 'neutral' }

/** Row in the list column. Selection reads as the active-nav treatment: an
 *  ink.100 fill with a 2px ink.950 left bar — no colour. */
function ProposalRow({ proposal, selected, onSelect }) {
  const meta = statusMeta(proposal.workflow_status)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'relative w-full border-b border-ink-200 px-4 py-3.5 text-left transition-colors duration-150 ease-out last:border-b-0',
        selected ? 'bg-ink-100' : 'hover:bg-ink-100',
      )}
    >
      {selected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-ink-950" />}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-ink-950">{proposal.customer?.full_name}</p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-400">
            {proposal.customer?.customer_code} · PRP-{String(proposal.id).padStart(4, '0')}
          </p>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="font-display text-[22px] leading-none tabular-nums text-ink-950">
          {formatCurrency(proposal.proposed_amount)}
        </p>
        <p className="shrink-0 text-[13px] text-ink-400">{formatRelative(proposal.submitted_at)}</p>
      </div>
    </button>
  )
}

const initials = (name) =>
  String(name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'

/**
 * The notes thread. Stage transitions write a system entry, so the thread doubles
 * as the audit trail for the proposal — the reason a rejection was given sits in
 * the same column as the comment that preceded it. System entries are set in the
 * body font at ink.600 with a mono stage tag, so they read as record rather than
 * conversation.
 */
function NoteThread({ notes }) {
  if (!notes.length) {
    return (
      <p className="py-2 text-body text-ink-400">
        {SUPPORTS_PROPOSAL_NOTES
          ? 'No notes yet. Add one to record context for whoever reviews this next.'
          : 'No note was recorded when this proposal was submitted.'}
      </p>
    )
  }

  return (
    <ol className="space-y-4">
      {notes.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 font-mono text-[11px] text-ink-950"
          >
            {initials(entry.author)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[13px] font-medium text-ink-950">{entry.author}</span>
              {entry.role && (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[11px] uppercase text-ink-600">
                  {ROLE_LABELS[entry.role] ?? entry.role}
                </span>
              )}
              <span className="font-mono text-[11px] text-ink-400">{formatDateTime(entry.at)}</span>
            </div>
            <p className={cn('mt-1 text-body', entry.system ? 'text-ink-600' : 'text-ink-800')}>
              {entry.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * Stage actions. A button exists only for the role permitted to make that
 * specific transition — everyone else gets a line naming who the stage is
 * waiting on, so the workflow stays legible without offering an action that
 * would only come back as a 403.
 *
 * The two terminal decisions go behind a confirm modal (approval mints the
 * agreement path, rejection ends the proposal); the linear hand-offs advance on
 * a single click, since the next reviewer can still send it onward.
 */
function StageActions({ proposal, role, advancing, onAdvance, onDecide }) {
  const navigate = useNavigate()
  const status = proposal.workflow_status
  const transition = PROPOSAL_TRANSITIONS[status]

  if (!transition) {
    if (status !== 'approved') return null // rejected — the notice above says it
    return proposal.agreement_id ? (
      <Button variant="secondary" onClick={() => navigate(`/agreements/${proposal.agreement_id}`)}>
        View agreement
      </Button>
    ) : (
      <Button variant="primary" onClick={() => navigate('/agreements')}>
        Generate agreement
      </Button>
    )
  }

  if (!canAdvanceProposal(status, role)) {
    return (
      <p className="text-[13px] text-ink-400">
        Awaiting {transition.waitingOn}. Your role cannot advance this stage.
      </p>
    )
  }

  if (transition.decision) {
    return (
      <>
        <Button variant="danger" onClick={() => onDecide('rejected')} disabled={advancing}>
          Reject
        </Button>
        <Button variant="primary" onClick={() => onDecide('approved')} disabled={advancing}>
          Approve
        </Button>
      </>
    )
  }

  return (
    <Button variant="primary" loading={advancing} onClick={onAdvance}>
      {transition.label}
    </Button>
  )
}

function MetaRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-200 py-2.5 last:border-b-0">
      <dt className="meta-label">{label}</dt>
      <dd className="text-right text-body text-ink-950">{children}</dd>
    </div>
  )
}

/** Detail panel: stepper, record, notes thread, and the stage actions. */
function ProposalDetail({ proposalId, role, user, onUpdated }) {
  const [proposal, setProposal] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [advancing, setAdvancing] = useState(false)
  const [decision, setDecision] = useState(null) // 'approved' | 'rejected' | null
  const [reason, setReason] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      setProposal(await proposalService.get(proposalId))
      setStatus('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not load the proposal.')
      setStatus('error')
    }
  }, [proposalId])

  useEffect(() => {
    load()
  }, [load])

  const actor = { role, author: user?.full_name ?? 'You' }

  const apply = (updated) => {
    setProposal(updated)
    onUpdated?.(updated)
  }

  const advance = async (payload = {}) => {
    setAdvancing(true)
    try {
      const updated = await proposalService.advance(proposal.id, { ...actor, ...payload })
      apply(updated)
      toast.success(
        updated.workflow_status === 'rejected'
          ? 'Proposal rejected.'
          : `Moved to ${statusMeta(updated.workflow_status).label.toLowerCase()}.`,
      )
      setDecision(null)
      setReason('')
    } catch (err) {
      toast.error(err?.message ?? 'Could not advance the proposal.')
    } finally {
      setAdvancing(false)
    }
  }

  const addNote = async () => {
    const body = noteBody.trim()
    if (!body) return
    setSavingNote(true)
    try {
      apply(await proposalService.addNote(proposal.id, { body, ...actor }))
      setNoteBody('')
      toast.success('Note added.')
    } catch (err) {
      toast.error(err?.message ?? 'Could not add the note.')
    } finally {
      setSavingNote(false)
    }
  }

  if (status === 'loading') {
    return (
      <Card padded={false}>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card>
        <ErrorState description={error} onRetry={load} />
      </Card>
    )
  }

  const meta = statusMeta(proposal.workflow_status)

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 px-6 py-5">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] leading-tight text-ink-950">
            {proposal.customer?.full_name}
          </h2>
          <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-600">
            PRP-{String(proposal.id).padStart(4, '0')} ·{' '}
            <Link to={`/customers/${proposal.customer_id}`} className="underline decoration-ink-300 underline-offset-2 hover:text-ink-950">
              {proposal.customer?.customer_code}
            </Link>
          </p>
          <div className="mt-2.5">
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="meta-label">Proposed amount</p>
          <p className="mt-1 font-display text-stat leading-none tabular-nums text-ink-950">
            {formatCurrency(proposal.proposed_amount)}
          </p>
        </div>
      </div>

      <div className="border-b border-ink-200 px-6 py-6">
        <WorkflowStepper steps={stepsFor(proposal)} label="Proposal workflow progress" />
      </div>

      {proposal.workflow_status === 'rejected' && (
        <div className="border-b border-ink-200 px-6 py-5">
          <div className="rounded-control border border-state-danger-border bg-state-danger-bg px-4 py-3">
            <p className="font-mono text-meta uppercase text-state-danger">Rejected at head office review</p>
            <p className="mt-1.5 text-body text-ink-800">
              {proposal.rejection_reason ?? 'No reason was recorded.'}
            </p>
          </div>
        </div>
      )}

      <div className="border-b border-ink-200 px-6 py-4">
        <dl>
          <MetaRow label="Product">{proposal.product_type ?? '—'}</MetaRow>
          <MetaRow label="Sales rep">{proposal.sales_rep?.full_name ?? `#${proposal.sales_rep_id}`}</MetaRow>
          <MetaRow label="Submitted">{formatDateTime(proposal.submitted_at)}</MetaRow>
          <MetaRow label="Last updated">{formatDateTime(proposal.updated_at)}</MetaRow>
        </dl>
      </div>

      <div className="px-6 py-5">
        <h3 className="section-heading">Notes</h3>
        <div className="mt-4">
          <NoteThread notes={proposal.notes} />
        </div>

        {SUPPORTS_PROPOSAL_NOTES ? (
          <div className="mt-5 border-t border-ink-200 pt-4">
            <Textarea
              label="Add a note"
              rows={3}
              maxLength={500}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Context for whoever reviews this next…"
            />
            <div className="mt-1 flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                loading={savingNote}
                disabled={!noteBody.trim()}
                onClick={addNote}
              >
                Add note
              </Button>
            </div>
          </div>
        ) : (
          // No POST /proposals/{id}/notes: the note is written once, at
          // submission. Saying so beats a composer that could only fail.
          <p className="mt-5 border-t border-ink-200 pt-4 text-[13px] text-ink-600">
            Notes are recorded when the proposal is submitted and cannot be added afterwards.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink-200 bg-ink-50 px-6 py-4">
        <StageActions
          proposal={proposal}
          role={role}
          advancing={advancing}
          onAdvance={() => advance()}
          onDecide={setDecision}
        />
      </div>

      <Modal
        open={Boolean(decision)}
        onClose={() => {
          if (advancing) return
          setDecision(null)
          setReason('')
        }}
        title={decision === 'rejected' ? 'Reject proposal' : 'Approve proposal'}
        description={
          decision === 'rejected'
            ? SUPPORTS_REJECTION_REASON
              ? 'A reason is required and is recorded in the notes thread.'
              : 'Rejection is final. The proposal cannot be advanced again.'
            : 'Approving clears the proposal for agreement generation.'
        }
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={advancing}
              onClick={() => {
                setDecision(null)
                setReason('')
              }}
            >
              Cancel
            </Button>
            {decision === 'rejected' ? (
              <Button
                variant="danger"
                loading={advancing}
                disabled={SUPPORTS_REJECTION_REASON && !reason.trim()}
                onClick={() =>
                  advance({
                    decision: 'rejected',
                    ...(SUPPORTS_REJECTION_REASON ? { reason: reason.trim() } : {}),
                  })
                }
              >
                Reject proposal
              </Button>
            ) : (
              <Button variant="primary" loading={advancing} onClick={() => advance({ decision: 'approved' })}>
                Approve proposal
              </Button>
            )}
          </>
        }
      >
        {decision === 'rejected' ? (
          SUPPORTS_REJECTION_REASON ? (
            <Textarea
              label="Reason for rejection"
              required
              rows={4}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What failed review, and what would need to change?"
            />
          ) : (
            // `PUT /advance` takes `decision` and rejects unknown fields, so a
            // reason typed here could only be discarded. Not asking is honest.
            <p className="text-body text-ink-600">
              {proposal.customer?.full_name} · {formatCurrency(proposal.proposed_amount)}. The API records
              the decision without a reason, so note anything the customer needs to be told separately.
            </p>
          )
        ) : (
          <p className="text-body text-ink-600">
            {proposal.customer?.full_name} · {formatCurrency(proposal.proposed_amount)}. This is the
            final review stage and cannot be undone from here.
          </p>
        )}
      </Modal>
    </Card>
  )

}

const EMPTY_FORM = { customerId: '', productType: '', proposedAmount: '', note: '' }

/**
 * Submission form — the entry point to the workflow, so node 1 is reachable for
 * a new record rather than only for the seeded ones. `sales_rep_id` is derived
 * server-side from the customer's assigned rep, so it is not a field here.
 */
function SubmissionForm({ open, onClose, onCreated, actor }) {
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setErrors({})
      return
    }
    customerService
      .list({ perPage: 100 })
      .then(({ items }) => setCustomers(items))
      .catch(() => setCustomers([]))
  }, [open])

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.customerId) next.customer_id = 'Select a customer.'
    if (!(Number(form.proposedAmount) > 0)) next.proposed_amount = 'Enter an amount greater than zero.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      const customer = customers.find((c) => String(c.id) === String(form.customerId))
      const created = await proposalService.create({
        customerId: form.customerId,
        customer: customer
          ? { id: customer.id, customer_code: customer.customer_code, full_name: customer.full_name }
          : undefined,
        proposedAmount: form.proposedAmount,
        productType: form.productType,
        note: form.note,
        ...actor,
      })
      toast.success('Proposal submitted.')
      onCreated(created)
    } catch (err) {
      toast.error(err?.message ?? 'Could not submit the proposal.')
      if (err?.fieldErrors) setErrors((prev) => ({ ...prev, ...err.fieldErrors }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="New proposal"
      description="Submitting places the proposal at the first stage of the approval workflow."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="proposal-form" loading={submitting}>
            Submit proposal
          </Button>
        </>
      }
    >
      <form id="proposal-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            required
            placeholder={customers.length ? 'Select a customer' : 'Loading customers…'}
            options={customers.map((c) => ({
              value: String(c.id),
              label: `${c.customer_code} — ${c.full_name}`,
            }))}
            value={form.customerId}
            onChange={set('customerId')}
            error={errors.customer_id}
          />
          <Input
            label="Product"
            placeholder="e.g. Teak Plantation Unit"
            value={form.productType}
            onChange={set('productType')}
            error={errors.product_type}
          />
        </div>
        <Input
          label="Proposed amount (LKR)"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="75000.00"
          value={form.proposedAmount}
          onChange={set('proposedAmount')}
          error={errors.proposed_amount}
        />
        <Textarea
          label="Opening note"
          rows={3}
          maxLength={500}
          hint="Optional. Starts the notes thread for the reviewers."
          value={form.note}
          onChange={set('note')}
        />
      </form>
    </Modal>
  )
}

export default function ProposalWorkflow() {
  const { user, role } = useAuth()

  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, perPage: PER_PAGE, total: 0 })
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [stage, setStage] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)

  const actor = useMemo(
    () => ({ role, author: user?.full_name, authorId: user?.id }),
    [role, user?.full_name, user?.id],
  )

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await proposalService.list({ page, perPage: PER_PAGE, status: stage })
      setItems(res.items)
      setPagination({ page: res.pagination.page, perPage: res.pagination.per_page, total: res.pagination.total })
      setStatus('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not load proposals.')
      setStatus('error')
    }
  }, [page, stage])

  useEffect(() => {
    load()
  }, [load])

  // Keep a selection that exists in the current result set: open the first row
  // on load, and follow the filter when the selected proposal drops out of it.
  useEffect(() => {
    if (status !== 'ready') return
    setSelectedId((current) =>
      current && items.some((item) => item.id === current) ? current : (items[0]?.id ?? null),
    )
  }, [items, status])

  /** Fold an advanced/annotated proposal back into the list row it came from. */
  const onUpdated = useCallback((updated) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
  }, [])

  // Show the new proposal wherever the list currently is: clearing the filter
  // reloads through the effect, so only an already-unfiltered first page needs a
  // manual refetch.
  const onCreated = (created) => {
    setFormOpen(false)
    setSelectedId(created.id)
    if (stage === '' && page === 1) load()
    else {
      setStage('')
      setPage(1)
    }
  }

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Proposals</h1>
          <p className="mt-1 text-body text-ink-600">
            {pagination.total} {pagination.total === 1 ? 'proposal' : 'proposals'}
            {stage ? ` at ${statusMeta(stage).label.toLowerCase()}` : ' in the approval workflow'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          New proposal
        </Button>
      </header>

      {USING_MOCK_PROPOSALS && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the proposal endpoints are mocked in the service layer only.
        </p>
      )}

      <div className="mt-6">
        <StageFilter
          value={stage}
          onChange={(next) => {
            setStage(next)
            setPage(1)
          }}
        />
      </div>

      {status === 'error' ? (
        <Card className="mt-6">
          <ErrorState description={error} onRetry={load} />
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Card padded={false}>
              {status === 'loading' ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" rounded="rounded-control" />
                  ))}
                </div>
              ) : items.length ? (
                items.map((proposal) => (
                  <ProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    selected={proposal.id === selectedId}
                    onSelect={() => setSelectedId(proposal.id)}
                  />
                ))
              ) : (
                <EmptyState
                  title="No proposals here"
                  description={
                    stage
                      ? 'Nothing is sitting at this stage right now.'
                      : 'Submit the first proposal to start the approval workflow.'
                  }
                  actionLabel={stage ? undefined : 'New proposal'}
                  onAction={stage ? undefined : () => setFormOpen(true)}
                />
              )}

              {/* Inside the card, so the summary rule reads as its footer. */}
              {items.length > 0 && (
                <Pagination
                  page={pagination.page}
                  pageSize={pagination.perPage}
                  total={pagination.total}
                  onPageChange={setPage}
                />
              )}
            </Card>
          </div>

          <div className="lg:col-span-7">
            {selectedId ? (
              <ProposalDetail
                key={selectedId}
                proposalId={selectedId}
                role={role}
                user={user}
                onUpdated={onUpdated}
              />
            ) : (
              <Card>
                <EmptyState
                  title="No proposal selected"
                  description="Pick a proposal from the list to see its stage, notes, and available actions."
                />
              </Card>
            )}
          </div>
        </div>
      )}

      <SubmissionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={onCreated}
        actor={actor}
      />
    </div>
  )
}

