import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Skeleton, Table } from '@/components/ui'
import customerService from '@/services/customerService'
import { useAuth } from '@/hooks/useAuth'
import {
  CUSTOMER_STATUS,
  DOC_TYPES,
  PROPOSAL_STAGES,
  ROLES,
  VERIFICATION_STATUS,
} from '@/utils/constants'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'

const labelFor = (list, value) => list.find((entry) => entry.value === value)?.label ?? value

const TABS = [
  { id: 'documents', label: 'Documents' },
  { id: 'agreements', label: 'Agreements' },
  { id: 'proposals', label: 'Proposals' },
]

/** Underline tabs: the active tab is ink.950 over a 2px ink.950 rule. */
function Tabs({ active, onChange, counts }) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-ink-200">
      {TABS.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px border-b-2 pb-3 text-body transition-colors duration-150 ease-out',
              selected
                ? 'border-ink-950 font-medium text-ink-950'
                : 'border-transparent text-ink-600 hover:text-ink-950',
            )}
          >
            {tab.label}
            {counts[tab.id] != null && (
              <span className="ml-2 font-mono text-[11px] tabular-nums text-ink-400">{counts[tab.id]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex justify-between gap-6 border-b border-ink-200 py-3 last:border-b-0">
      <span className="meta-label">{label}</span>
      <span className="text-right text-body text-ink-950">{children}</span>
    </div>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('documents')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCustomer(await customerService.get(id))
    } catch (err) {
      setError(err?.message ?? 'Could not load this customer.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const onDelete = async () => {
    setDeleting(true)
    try {
      await customerService.remove(id)
      toast.success('Customer deleted.')
      navigate('/customers', { replace: true })
    } catch (err) {
      toast.error(err?.message ?? 'Could not delete this customer.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-page-enter">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Card className="mt-8">
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-page-enter">
        <ErrorState description={error} onRetry={load} />
      </div>
    )
  }

  const statusMeta = CUSTOMER_STATUS[customer.status]
  const documents = customer.documents ?? []
  const proposals = customer.proposals ?? []

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-title text-ink-950">{customer.full_name}</h1>
            <Badge variant={statusMeta?.variant ?? 'neutral'}>{statusMeta?.label ?? customer.status}</Badge>
          </div>
          {/* Shown in full here: this is the screen you open deliberately, and
              the NIC is the thing staff cross-check against the document. */}
          <p className="mt-1.5 font-mono text-[13px] tabular-nums text-ink-600">{customer.nic_number}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/documents/upload')}>
            Upload document
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/customers/${id}/edit`)}>
            Edit
          </Button>
          {role === ROLES.ADMIN && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-1" bodyClassName="px-6 py-2">
          <DetailRow label="Code">
            <span className="font-mono text-[13px] tabular-nums">{customer.customer_code}</span>
          </DetailRow>
          <DetailRow label="Phone">{customer.phone || '—'}</DetailRow>
          <DetailRow label="Email">{customer.email || '—'}</DetailRow>
          <DetailRow label="Address">{customer.address || '—'}</DetailRow>
          <DetailRow label="Assigned rep">{customer.assigned_rep?.full_name ?? '—'}</DetailRow>
          <DetailRow label="Registered">{formatDate(customer.registered_at)}</DetailRow>
        </Card>

        <Card className="lg:col-span-2" bodyClassName="p-6 pt-4">
          <Tabs
            active={tab}
            onChange={setTab}
            counts={{ documents: documents.length, proposals: proposals.length }}
          />

          <div className="pt-2">
            {tab === 'documents' &&
              (documents.length ? (
                <Table
                  columns={[
                    { key: 'doc_type', header: 'Type', render: (row) => labelFor(DOC_TYPES, row.doc_type) },
                    {
                      key: 'verification_status',
                      header: 'Verification',
                      render: (row) => {
                        const meta = VERIFICATION_STATUS[row.verification_status]
                        return <Badge variant={meta?.variant ?? 'neutral'}>{meta?.label ?? row.verification_status}</Badge>
                      },
                    },
                    {
                      key: 'uploaded_at',
                      header: 'Uploaded',
                      align: 'right',
                      render: (row) => <span className="tabular-nums text-ink-600">{formatDateTime(row.uploaded_at)}</span>,
                    },
                  ]}
                  data={documents}
                  onRowClick={(row) => navigate(`/documents/${row.id}/fraud`)}
                />
              ) : (
                <EmptyState
                  title="No documents uploaded"
                  description="Upload an NIC or bank document to start verification."
                  actionLabel="Upload document"
                  onAction={() => navigate('/documents/upload')}
                />
              ))}

            {tab === 'agreements' && (
              <EmptyState
                title="No agreements yet"
                description="Agreements are not exposed by the API yet, so none can be listed here."
              />
            )}

            {tab === 'proposals' &&
              (proposals.length ? (
                <Table
                  columns={[
                    { key: 'product_type', header: 'Product', render: (row) => row.product_type || '—' },
                    {
                      key: 'workflow_status',
                      header: 'Stage',
                      render: (row) => (
                        <Badge variant="neutral">{labelFor(PROPOSAL_STAGES, row.workflow_status)}</Badge>
                      ),
                    },
                    {
                      key: 'submitted_at',
                      header: 'Submitted',
                      align: 'right',
                      render: (row) => <span className="tabular-nums text-ink-600">{formatDate(row.submitted_at)}</span>,
                    },
                  ]}
                  data={proposals}
                  onRowClick={() => navigate('/proposals')}
                />
              ) : (
                <EmptyState title="No proposals yet" description="Submitted proposals will appear here." />
              ))}
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        loading={deleting}
        title="Delete this customer?"
        description={`${customer.full_name} will be removed from the customer list. This cannot be undone from the interface.`}
        confirmLabel="Delete customer"
      />
    </div>
  )
}
