import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Badge, Button, Card, Input, Pagination, Table } from '@/components/ui'
import NavIcon from '@/components/Layout/NavIcon'
import useDebounce from '@/hooks/useDebounce'
import {
  fetchCustomers,
  selectCustomerError,
  selectCustomerFilters,
  selectCustomerPagination,
  selectCustomers,
  selectCustomerStatus,
  setPage,
  setSearch,
  setStatusFilter,
} from '@/store/customerSlice'
import { CUSTOMER_STATUS } from '@/utils/constants'
import { formatDate, maskNic } from '@/utils/formatters'
import { cn } from '@/utils/cn'

const STATUS_SEGMENTS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'flagged', label: 'Flagged' },
]

/**
 * Segmented control: the selected segment is an ink.950 fill with white text,
 * the same treatment as the active page in Pagination and the active nav item.
 * One filled element per group is how selection reads without colour.
 */
function StatusFilter({ value, onChange }) {
  return (
    <div role="group" aria-label="Filter by status" className="inline-flex rounded-control border border-ink-200 bg-white p-0.5">
      {STATUS_SEGMENTS.map((segment) => {
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

/** Client-side CSV of the current result page — the API has no export endpoint. */
function exportCsv(rows) {
  if (!rows.length) {
    toast.error('Nothing to export.')
    return
  }

  const headers = ['Code', 'Name', 'NIC', 'Phone', 'Email', 'Status', 'Registered']
  const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`
  const body = rows.map((row) =>
    [row.customer_code, row.full_name, row.nic_number, row.phone, row.email, row.status, row.registered_at]
      .map(escape)
      .join(','),
  )

  const blob = new Blob([[headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${rows.length} customers.`)
}

export default function CustomerList() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const customers = useSelector(selectCustomers)
  const pagination = useSelector(selectCustomerPagination)
  const filters = useSelector(selectCustomerFilters)
  const status = useSelector(selectCustomerStatus)
  const error = useSelector(selectCustomerError)

  // The navbar's global search lands here as ?search=, so a term typed up there
  // seeds this box rather than being dropped on arrival.
  const seeded = searchParams.get('search') ?? ''
  const [term, setTerm] = useState(seeded || filters.search)
  const debouncedTerm = useDebounce(term)

  // Runs on every arrival, not just the first mount — searching from the navbar
  // while already on this page must still update the box.
  useEffect(() => {
    if (!seeded) return
    setTerm(seeded)
    setSearchParams({}, { replace: true })
  }, [seeded, setSearchParams])

  useEffect(() => {
    if (debouncedTerm !== filters.search) dispatch(setSearch(debouncedTerm))
  }, [debouncedTerm, filters.search, dispatch])

  useEffect(() => {
    dispatch(fetchCustomers())
  }, [dispatch, filters.search, filters.status, pagination.page])

  const columns = [
    {
      key: 'customer_code',
      header: 'Code',
      render: (row) => <span className="font-mono text-[13px] tabular-nums text-ink-600">{row.customer_code}</span>,
    },
    {
      key: 'full_name',
      header: 'Customer',
      render: (row) => <span className="font-medium text-ink-950">{row.full_name}</span>,
    },
    {
      key: 'nic_number',
      header: 'NIC',
      render: (row) => <span className="font-mono text-[13px] tabular-nums">{maskNic(row.nic_number)}</span>,
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = CUSTOMER_STATUS[row.status]
        return <Badge variant={meta?.variant ?? 'neutral'}>{meta?.label ?? row.status}</Badge>
      },
    },
    {
      key: 'registered_at',
      header: 'Registered',
      align: 'right',
      render: (row) => <span className="tabular-nums text-ink-600">{formatDate(row.registered_at)}</span>,
    },
  ]

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="mt-1 text-body text-ink-600">
            {pagination.total} registered {pagination.total === 1 ? 'customer' : 'customers'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => exportCsv(customers)}>
            Export CSV
          </Button>
          <Button variant="primary" onClick={() => navigate('/customers/new')}>
            New customer
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusFilter value={filters.status} onChange={(next) => dispatch(setStatusFilter(next))} />

        <div className="ml-auto w-full sm:w-72">
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <Input
            id="customer-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search name, NIC or code"
            prefix={<NavIcon name="search" />}
          />
        </div>
      </div>

      <Card className="mt-4" padded={false} bodyClassName="p-0">
        <Table
          columns={columns}
          data={customers}
          loading={status === 'loading' && customers.length === 0}
          error={status === 'failed' ? error : null}
          onRetry={() => dispatch(fetchCustomers())}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          emptyTitle={filters.search || filters.status ? 'No matching customers' : 'No customers yet'}
          emptyDescription={
            filters.search || filters.status
              ? 'Try a different search term or clear the status filter.'
              : 'Register the first customer to see them here.'
          }
        />

        <Pagination
          page={pagination.page}
          pageSize={pagination.perPage}
          total={pagination.total}
          onPageChange={(next) => dispatch(setPage(next))}
        />
      </Card>
    </div>
  )
}
