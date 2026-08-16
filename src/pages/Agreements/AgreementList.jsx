import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, Pagination, Select, Skeleton } from '@/components/ui'
import agreementService, { computeMaturity, USING_MOCK_AGREEMENTS } from '@/services/agreementService'
import customerService from '@/services/customerService'
import { AGREEMENT_STATUS } from '@/utils/constants'
import { formatCurrency } from '@/utils/formatters'

const PER_PAGE = 8

/**
 * Agreement card. Hierarchy is carried by type, not by an accent colour or a
 * coloured bar: the number sits small in mono, the customer in the body font,
 * and the amount large in the display serif — the figure is the loudest thing
 * on the card. Term, rate, and the status badge sit on the right.
 */
function AgreementCard({ agreement, onClick }) {
  const meta = AGREEMENT_STATUS[agreement.status] ?? { label: agreement.status, variant: 'neutral' }
  const maturity = computeMaturity(
    agreement.investment_amount,
    agreement.duration_months,
    agreement.interest_rate,
  )

  return (
    <Card
      as="button"
      type="button"
      hoverable
      onClick={onClick}
      className="w-full text-left"
      bodyClassName="p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[13px] tabular-nums text-ink-600">{agreement.agreement_number}</p>
          <p className="mt-1 truncate text-body font-medium text-ink-950">
            {agreement.customer?.full_name ?? `Customer #${agreement.customer_id}`}
          </p>
          {agreement.product_type && (
            <p className="mt-0.5 truncate text-[13px] text-ink-400">{agreement.product_type}</p>
          )}
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <p className="mt-4 font-display text-stat leading-none tabular-nums text-ink-950">
        {formatCurrency(agreement.investment_amount)}
      </p>

      <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-ink-200 pt-3">
        <div className="flex items-center gap-1.5">
          <dt className="meta-label">Term</dt>
          <dd className="text-[13px] tabular-nums text-ink-950">{agreement.duration_months} mo</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="meta-label">Rate</dt>
          <dd className="text-[13px] tabular-nums text-ink-950">{agreement.interest_rate}%</dd>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <dt className="meta-label">Maturity</dt>
          <dd className="text-[13px] tabular-nums text-ink-600">{formatCurrency(maturity)}</dd>
        </div>
      </dl>
    </Card>
  )
}

const EMPTY_FORM = {
  customerId: '',
  productType: '',
  investmentAmount: '',
  durationMonths: '12',
  interestRate: '',
  signingDate: '',
}

/**
 * Generation form, in a modal. The maturity value recomputes live as the amount,
 * duration and rate change — the same simple-interest figure the detail view and
 * PDF show, so the number the user sees while typing is the number they get.
 */
function GenerationForm({ open, onClose, onGenerated }) {
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Load the customer list on open; reset the form when it closes.
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

  const amountNum = Number(form.investmentAmount) || 0
  const maturity = computeMaturity(form.investmentAmount, form.durationMonths, form.interestRate)
  const interestEarned = maturity - amountNum

  const validate = () => {
    const next = {}
    if (!form.customerId) next.customerId = 'Select a customer.'
    if (amountNum <= 0) next.investmentAmount = 'Enter an amount greater than zero.'
    const months = Number(form.durationMonths)
    if (!months || months < 1 || months > 600) next.durationMonths = 'Duration must be 1–600 months.'
    const rate = Number(form.interestRate)
    if (form.interestRate === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
      next.interestRate = 'Rate must be between 0 and 100.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const customer = customers.find((c) => String(c.id) === String(form.customerId))
      const created = await agreementService.generate({
        customerId: form.customerId,
        customer: customer
          ? { id: customer.id, customer_code: customer.customer_code, full_name: customer.full_name }
          : undefined,
        investmentAmount: form.investmentAmount,
        durationMonths: form.durationMonths,
        interestRate: form.interestRate,
        productType: form.productType,
        signingDate: form.signingDate,
      })
      toast.success(`Agreement ${created.agreement_number} generated.`)
      onGenerated(created)
    } catch (err) {
      toast.error(err?.message ?? 'Could not generate the agreement.')
      if (err?.fieldErrors) setErrors((prev) => ({ ...prev, ...err.fieldErrors }))
    } finally {
      setSubmitting(false)
    }
  }

  const customerOptions = customers.map((c) => ({
    value: String(c.id),
    label: `${c.customer_code} — ${c.full_name}`,
  }))

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Generate agreement"
      description="A signed PDF and a QR verification token are minted on generation."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="agreement-form" loading={submitting}>
            Generate agreement
          </Button>
        </>
      }
    >
      <form id="agreement-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            required
            placeholder={customers.length ? 'Select a customer' : 'Loading customers…'}
            options={customerOptions}
            value={form.customerId}
            onChange={set('customerId')}
            error={errors.customerId}
          />
          <Input
            label="Product"
            placeholder="e.g. Teak Plantation Unit"
            value={form.productType}
            onChange={set('productType')}
          />
          <Input
            label="Investment amount (LKR)"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="50000.00"
            value={form.investmentAmount}
            onChange={set('investmentAmount')}
            error={errors.investmentAmount}
          />
          <Input
            label="Duration (months)"
            type="number"
            min="1"
            max="600"
            required
            value={form.durationMonths}
            onChange={set('durationMonths')}
            error={errors.durationMonths}
          />
          <Input
            label="Interest rate (% p.a.)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            placeholder="8.5"
            value={form.interestRate}
            onChange={set('interestRate')}
            error={errors.interestRate}
          />
          <Input label="Signing date" type="date" value={form.signingDate} onChange={set('signingDate')} />
        </div>

        {/* Live maturity preview — the one figure in the serif, so it reads as
            the outcome of the numbers above it. */}
        <div className="flex items-center justify-between gap-4 rounded-control border border-ink-200 bg-ink-50 px-4 py-3">
          <div className="min-w-0">
            <p className="meta-label">Maturity value</p>
            <p className="mt-0.5 text-[13px] text-ink-400">
              {interestEarned > 0
                ? `${formatCurrency(interestEarned)} interest on simple terms`
                : 'Enter amount, duration and rate'}
            </p>
          </div>
          <p className="shrink-0 font-display text-[32px] leading-none tabular-nums text-ink-950">
            {amountNum > 0 ? formatCurrency(maturity) : '—'}
          </p>
        </div>
      </form>
    </Modal>
  )
}

export default function AgreementList() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, perPage: PER_PAGE, total: 0 })
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await agreementService.list({ page, perPage: PER_PAGE })
      setItems(res.items)
      setPagination({ page: res.pagination.page, perPage: res.pagination.per_page, total: res.pagination.total })
      setStatus('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not load agreements.')
      setStatus('error')
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const onGenerated = (created) => {
    setFormOpen(false)
    navigate(`/agreements/${created.id}`)
  }

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Agreements</h1>
          <p className="mt-1 text-body text-ink-600">
            {pagination.total} generated {pagination.total === 1 ? 'agreement' : 'agreements'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          Generate agreement
        </Button>
      </header>

      {USING_MOCK_AGREEMENTS && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — agreement generation, the PDF, and the QR token are mocked in the service layer only.
        </p>
      )}

      {status === 'loading' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" rounded="rounded-card" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6">
          <ErrorState description={error} onRetry={load} />
        </div>
      )}

      {status === 'ready' &&
        (items.length ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((agreement) => (
                <AgreementCard
                  key={agreement.id}
                  agreement={agreement}
                  onClick={() => navigate(`/agreements/${agreement.id}`)}
                />
              ))}
            </div>
            <div className="mt-2">
              <Pagination
                page={pagination.page}
                pageSize={pagination.perPage}
                total={pagination.total}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No agreements yet"
              description="Generate the first investment agreement to see it here."
              actionLabel="Generate agreement"
              onAction={() => setFormOpen(true)}
            />
          </div>
        ))}

      <GenerationForm open={formOpen} onClose={() => setFormOpen(false)} onGenerated={onGenerated} />
    </div>
  )
}

