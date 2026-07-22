import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  SkeletonText,
  Spinner,
  Table,
  Textarea,
} from '@/components/ui'

/**
 * Temporary route: the living reference for the design system and the UI kit.
 * Every token comes from tailwind.config.js and every component from
 * components/ui — nothing on this page is one-off markup.
 */

/* -------------------------------------------------------------- token data */

const NEUTRALS = [
  { token: 'ink.950', value: '#0A0A0A', use: 'Primary text, primary buttons, active states', swatch: 'bg-ink-950' },
  { token: 'ink.800', value: '#262626', use: 'Headings on light, hover on primary button', swatch: 'bg-ink-800' },
  { token: 'ink.600', value: '#525252', use: 'Secondary text, icons', swatch: 'bg-ink-600' },
  { token: 'ink.400', value: '#A3A3A3', use: 'Placeholder, disabled text, muted meta', swatch: 'bg-ink-400' },
  { token: 'ink.300', value: '#D4D4D4', use: 'Strong borders, dividers on emphasis', swatch: 'bg-ink-300' },
  { token: 'ink.200', value: '#E5E5E5', use: 'Default borders, table rules', swatch: 'bg-ink-200' },
  { token: 'ink.100', value: '#F5F5F5', use: 'Subtle fills, hover rows, input backgrounds', swatch: 'bg-ink-100' },
  { token: 'ink.50', value: '#FAFAFA', use: 'Page background, sidebar background', swatch: 'bg-ink-50' },
  { token: 'white', value: '#FFFFFF', use: 'Cards, panels, elevated surfaces', swatch: 'bg-white' },
]

const ACCENTS = [
  { token: 'state.ok', value: '#2F6B48', meaning: 'Verified, safe, active, approved', variant: 'ok', label: 'Verified', dot: 'bg-state-ok' },
  { token: 'state.warn', value: '#9A6B12', meaning: 'Pending, review needed, low confidence', variant: 'warn', label: 'Pending', dot: 'bg-state-warn' },
  { token: 'state.danger', value: '#B4342F', meaning: 'Fraud flagged, rejected, destructive, field error', variant: 'danger', label: 'Flagged', dot: 'bg-state-danger' },
  { token: 'state.info', value: '#2B5C8A', meaning: 'Informational only', variant: 'info', label: 'Info', dot: 'bg-state-info' },
]

const TYPE_SCALE = [
  { role: 'Page title', spec: 'font-display · 28px · regular', className: 'font-display text-title', sample: 'Investment agreements' },
  { role: 'Stat figure', spec: 'font-display · 36–40px · regular', className: 'font-display text-stat-lg', sample: 'LKR 4,820,000' },
  { role: 'Section heading', spec: 'font-body · 15px · semibold', className: 'section-heading', sample: 'Recent fraud alerts' },
  { role: 'Body', spec: 'font-body · 14px · regular', className: 'font-body text-body', sample: 'The document was analysed across three detection stages.' },
  { role: 'Body medium', spec: 'font-body · 14px · 500', className: 'font-body text-body font-medium', sample: 'Nimal Perera — Kandy branch' },
  { role: 'Meta / label', spec: 'font-mono · 11px · uppercase · wide tracking', className: 'meta-label', sample: 'Total customers' },
  { role: 'Mono data', spec: 'font-mono · 13px · ink.950', className: 'font-mono text-[13px] text-ink-950', sample: '199834502V · AGR-2026-00417' },
]

const FRAUD_BANDS = [
  { range: '0 – 39', verdict: 'Safe', variant: 'ok', fill: 'bg-state-ok', score: 18 },
  { range: '40 – 69', verdict: 'Review', variant: 'warn', fill: 'bg-state-warn', score: 56 },
  { range: '70 – 100', verdict: 'Flagged', variant: 'danger', fill: 'bg-state-danger', score: 87 },
]

const CUSTOMERS = [
  { id: 1, name: 'Nimal Perera', nic: '199834502V', agreement: 'AGR-2026-00417', amount: 1250000, status: 'verified' },
  { id: 2, name: 'Kamala Silva', nic: '200145600812', agreement: 'AGR-2026-00418', amount: 640000, status: 'pending' },
  { id: 3, name: 'Sunil Fernando', nic: '198712345V', agreement: 'AGR-2026-00419', amount: 2100000, status: 'flagged' },
  { id: 4, name: 'Anoma Jayasuriya', nic: '199602311V', agreement: 'AGR-2026-00420', amount: 380000, status: 'cancelled' },
]

const STATUS_BADGE = {
  verified: { variant: 'ok', label: 'Verified' },
  pending: { variant: 'warn', label: 'Pending' },
  flagged: { variant: 'danger', label: 'Flagged' },
  cancelled: { variant: 'neutral', label: 'Cancelled' },
}

const SECTIONS = [
  ['tokens', 'Neutral scale'],
  ['accents', 'Semantic accents'],
  ['type', 'Typography'],
  ['buttons', 'Button'],
  ['badges', 'Badge'],
  ['forms', 'Form controls'],
  ['cards', 'Card'],
  ['table', 'Table'],
  ['pagination', 'Pagination'],
  ['feedback', 'Spinner & Skeleton'],
  ['states', 'Empty & error states'],
  ['modal', 'Modal'],
  ['rules', 'Semantic state rules'],
]

/* ----------------------------------------------------------------- icons */

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2.5v7m0 0L5 6.5m3 3 3-3M3 12.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.5 5.5a1 1 0 0 1 1-1h3l1.2 1.5h6.8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

/* ------------------------------------------------------------- scaffolding */

function Section({ id, title, caption, children }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-4">
        <h2 className="section-heading">{title}</h2>
        {caption ? <p className="mt-1 max-w-2xl text-body text-ink-600">{caption}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <p className="meta-label mb-3">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

const currency = (n) => `LKR ${n.toLocaleString('en-LK')}`

/* -------------------------------------------------------------------- page */

export default function StyleGuide() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [page, setPage] = useState(3)
  const [notes, setNotes] = useState('Flagged for a mismatched signature block.')
  const [nic, setNic] = useState('19983450')
  const [showPassword, setShowPassword] = useState(false)

  const sortedCustomers = [...CUSTOMERS].sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1
    const av = a[sort.key]
    const bv = b[sort.key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })

  const columns = [
    { key: 'name', header: 'Customer', sortable: true, className: 'font-medium text-ink-950' },
    { key: 'nic', header: 'NIC', sortable: true, className: 'font-mono text-[13px]' },
    { key: 'agreement', header: 'Agreement', className: 'font-mono text-[13px]' },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      className: 'font-display text-[18px] text-ink-950',
      render: (row) => currency(row.amount),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status].variant} dot>
          {STATUS_BADGE[row.status].label}
        </Badge>
      ),
    },
  ]

  const confirmDelete = () => {
    setConfirmLoading(true)
    window.setTimeout(() => {
      setConfirmLoading(false)
      setConfirmOpen(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen animate-page-enter bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-8">
          <span className="meta-label">Design system · Phases 1–2</span>
          <h1 className="page-title">PlantVest AI — Modern Monochrome</h1>
          <p className="max-w-2xl text-body text-ink-600">
            If a colour is not communicating a state, it should not be there. Everything else is
            black, white, or a grey in between.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-ink-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 py-2">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="whitespace-nowrap rounded-control px-2.5 py-1 text-[13px] text-ink-600 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-ink-950"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* ------------------------------------------------------ tokens */}
        <Section
          id="tokens"
          title="Neutral scale"
          caption="The entire base palette. Never use pure #000000 — ink.950 is the darkest value in the system."
        >
          <Card padded={false}>
            <Table
              columns={[
                {
                  key: 'swatch',
                  header: 'Swatch',
                  width: 96,
                  render: (r) => <div className={`h-8 w-16 rounded-control border border-ink-200 ${r.swatch}`} />,
                },
                { key: 'token', header: 'Token', width: 128, className: 'font-mono text-[13px] text-ink-950' },
                { key: 'value', header: 'Value', width: 112, className: 'font-mono text-[13px] text-ink-600' },
                { key: 'use', header: 'Used for', className: 'text-ink-600' },
              ]}
              data={NEUTRALS}
              rowKey={(r) => r.token}
            />
          </Card>
        </Section>

        {/* ----------------------------------------------------- accents */}
        <Section
          id="accents"
          title="Semantic accents"
          caption="The only colour permitted. Used exclusively for status, severity and validation."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {ACCENTS.map((a) => (
              <Card key={a.token}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[13px] text-ink-950">{a.token}</p>
                    <p className="mt-1 text-body text-ink-600">{a.meaning}</p>
                  </div>
                  <Badge variant={a.variant} dot>
                    {a.label}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-control ${a.dot}`} title={`${a.token} solid`} />
                  <div className={`h-8 w-8 rounded-control border badge-${a.variant}`} title={`${a.token} tint`} />
                  <span className="font-mono text-[13px] text-ink-400">{a.value}</span>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* -------------------------------------------------------- type */}
        <Section
          id="type"
          title="Typography"
          caption="The serif display against the grotesque body is the one deliberate contrast in the system. Body weights stop at 600."
        >
          <Card padded={false}>
            <div className="divide-y divide-ink-200">
              {TYPE_SCALE.map((t) => (
                <div key={t.role} className="grid gap-3 p-6 md:grid-cols-[220px_1fr] md:items-baseline">
                  <div>
                    <p className="text-body font-medium text-ink-950">{t.role}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-400">{t.spec}</p>
                  </div>
                  <p className={t.className}>{t.sample}</p>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ----------------------------------------------------- buttons */}
        <Section
          id="buttons"
          title="Button"
          caption="Four variants, two sizes, with loading, disabled and icon states. There is never more than one black button on screen at a time."
        >
          <Card className="space-y-6">
            <Row label="Variants · default 36px">
              <Button variant="primary">Generate agreement</Button>
              <Button variant="secondary">Export CSV</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Reject document</Button>
            </Row>

            <Row label="Small · 30px">
              <Button variant="primary" size="sm">Approve</Button>
              <Button variant="secondary" size="sm">Edit</Button>
              <Button variant="ghost" size="sm">View</Button>
              <Button variant="danger" size="sm">Delete</Button>
            </Row>

            <Row label="With icons">
              <Button variant="primary" iconLeft={<PlusIcon />}>New customer</Button>
              <Button variant="secondary" iconLeft={<DownloadIcon />}>Download PDF</Button>
              <Button variant="secondary" aria-label="Search" iconLeft={<SearchIcon />} />
              <Button variant="ghost" size="sm" aria-label="Add" iconLeft={<PlusIcon />} />
            </Row>

            <Row label="Loading">
              <Button variant="primary" loading>Generating</Button>
              <Button variant="secondary" loading>Exporting</Button>
              <Button variant="ghost" loading>Loading</Button>
              <Button variant="danger" loading>Rejecting</Button>
            </Row>

            <Row label="Disabled">
              <Button variant="primary" disabled>Generate agreement</Button>
              <Button variant="secondary" disabled>Export CSV</Button>
              <Button variant="ghost" disabled>Cancel</Button>
              <Button variant="danger" disabled>Reject document</Button>
            </Row>

            <Row label="Full width">
              <Button variant="primary" fullWidth>Sign in</Button>
            </Row>

            <p className="text-body text-ink-400">
              Tab through the rows above — the focus ring is a 2px ink.950 outline at 2px offset,
              applied globally so no control can opt out.
            </p>
          </Card>
        </Section>

        {/* ------------------------------------------------------ badges */}
        <Section
          id="badges"
          title="Badge"
          caption="A tinted background, a hairline border and coloured text. The label always renders, so state survives the greyscale test."
        >
          <Card className="space-y-6">
            <Row label="Variants">
              <Badge variant="neutral">Cancelled</Badge>
              <Badge variant="ok">Verified</Badge>
              <Badge variant="warn">Pending</Badge>
              <Badge variant="danger">Flagged</Badge>
              <Badge variant="info">Draft</Badge>
            </Row>

            <Row label="With status dot">
              <Badge variant="neutral" dot>Cancelled</Badge>
              <Badge variant="ok" dot>Verified</Badge>
              <Badge variant="warn" dot>Pending</Badge>
              <Badge variant="danger" dot>Flagged</Badge>
              <Badge variant="info" dot>Draft</Badge>
            </Row>
          </Card>
        </Section>

        {/* ------------------------------------------------------- forms */}
        <Section
          id="forms"
          title="Form controls"
          caption="Input, Select and Textarea share one label / control / message wrapper. Hover lifts the border to ink.300; focus takes it to ink.950."
        >
          <Card className="grid gap-4 md:grid-cols-2">
            <Input label="Full name" placeholder="Nimal Perera" hint="As printed on the national identity card." />

            <Input
              label="NIC number"
              required
              mono
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              error={nic.length < 10 ? 'NIC must be 9 digits followed by V, or 12 digits.' : undefined}
            />

            <Input label="Search customers" placeholder="Name, NIC or code" prefix={<SearchIcon />} />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              defaultValue="correct-horse"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded-sm px-1.5 py-0.5 font-mono text-[11px] uppercase text-ink-600 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-950"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />

            <Select
              label="Document type"
              defaultValue="nic"
              options={[
                { value: 'nic', label: 'National identity card' },
                { value: 'bank', label: 'Bank statement' },
                { value: 'deed', label: 'Land deed' },
              ]}
            />

            <Select
              label="Branch"
              placeholder="Select a branch"
              defaultValue=""
              error="Select a branch to continue."
              options={[
                { value: 'kandy', label: 'Kandy' },
                { value: 'galle', label: 'Galle' },
                { value: 'colombo', label: 'Colombo' },
              ]}
            />

            <Input label="Customer code" mono defaultValue="CUS-000412" disabled hint="Generated by the system." />

            <Select
              label="Assigned rep"
              disabled
              defaultValue="unassigned"
              options={[{ value: 'unassigned', label: 'Unassigned' }]}
            />

            <Textarea
              label="Review notes"
              wrapperClassName="md:col-span-2"
              maxLength={240}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              hint="Visible to head office reviewers only."
            />
          </Card>
        </Section>

        {/* ------------------------------------------------------- cards */}
        <Section
          id="cards"
          title="Card"
          caption="White surface, 1px ink.200, radius 12px, no shadow by default. Optional header, actions and footer."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="meta-label">Total customers</p>
              <p className="mt-2 font-display text-stat text-ink-950">1,284</p>
              <p className="mt-1 text-body text-state-ok">▲ 8.2% this month</p>
            </Card>

            <Card hoverable>
              <p className="meta-label">Fraud flags</p>
              <p className="mt-2 font-display text-stat text-ink-950">17</p>
              <p className="mt-1 text-body text-state-danger">▲ 3 since last week</p>
              <p className="mt-3 text-body text-ink-400">Hoverable — moves to ink.100.</p>
            </Card>

            <Card className="shadow-float">
              <p className="meta-label">Floating layer</p>
              <p className="mt-2 text-body text-ink-600">
                Shadows only on modals, dropdowns and toasts — 0 4px 16px rgba(10,10,10,0.06).
              </p>
            </Card>

            <Card
              className="md:col-span-3"
              title="With header and footer"
              description="Header rule and footer rule are both 1px ink.200."
              actions={<Button size="sm" variant="ghost">Manage</Button>}
              footer={
                <>
                  <Button variant="ghost" size="sm">Discard</Button>
                  <Button variant="primary" size="sm">Save changes</Button>
                </>
              }
            >
              <p className="text-body text-ink-600">
                Card body. Pass <code className="font-mono text-[13px] text-ink-950">padded={'{false}'}</code> when
                wrapping a table that supplies its own edge padding.
              </p>
            </Card>
          </div>
        </Section>

        {/* ------------------------------------------------------- table */}
        <Section
          id="table"
          title="Table"
          caption="Sortable headers, ink.100 row hover, and built-in loading, empty and error states. Sort direction reads from the arrow, not from colour."
        >
          <div className="space-y-4">
            <Card padded={false}>
              <Table
                columns={columns}
                data={sortedCustomers}
                sort={sort}
                onSort={setSort}
                onRowClick={() => {}}
              />
              <Pagination page={page} pageSize={4} total={48} onPageChange={setPage} />
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card padded={false} className="overflow-hidden">
                <p className="meta-label border-b border-ink-200 px-4 py-3">Loading</p>
                <Table columns={columns.slice(0, 3)} data={[]} loading />
              </Card>

              <Card padded={false} className="overflow-hidden">
                <p className="meta-label border-b border-ink-200 px-4 py-3">Empty</p>
                <Table
                  columns={columns.slice(0, 3)}
                  data={[]}
                  emptyTitle="No customers yet"
                  emptyDescription="Register the first customer to see them here."
                />
              </Card>

              <Card padded={false} className="overflow-hidden">
                <p className="meta-label border-b border-ink-200 px-4 py-3">Error</p>
                <Table columns={columns.slice(0, 3)} data={[]} error="Could not reach the server." onRetry={() => {}} />
              </Card>
            </div>
          </div>
        </Section>

        {/* -------------------------------------------------- pagination */}
        <Section
          id="pagination"
          title="Pagination"
          caption="Record summary in mono, first and last page always visible, ellipsis where the run breaks. The current page is the only filled element."
        >
          <Card padded={false} className="space-y-0">
            <Pagination page={page} pageSize={20} total={484} onPageChange={setPage} className="border-t-0" />
            <Pagination page={1} pageSize={20} total={60} onPageChange={() => {}} />
            <Pagination page={1} pageSize={20} total={12} onPageChange={() => {}} />
            <Pagination page={1} pageSize={20} total={0} onPageChange={() => {}} />
          </Card>
        </Section>

        {/* ---------------------------------------------------- feedback */}
        <Section
          id="feedback"
          title="Spinner & Skeleton"
          caption="Skeletons are flat ink.100 blocks with an opacity pulse — no shimmer gradient, which would be the only decorative motion in the system."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Spinner" description="Inherits currentColor.">
              <div className="flex items-center gap-6">
                <Spinner size="xs" />
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <span className="flex h-9 items-center rounded-control bg-ink-950 px-4 text-white">
                  <Spinner size="sm" />
                </span>
              </div>
            </Card>

            <Card title="Skeleton" description="Block, text stack and circle.">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10" rounded="rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <SkeletonText lines={3} />
                <Skeleton className="h-24 w-full" rounded="rounded-card" />
              </div>
            </Card>
          </div>
        </Section>

        {/* ------------------------------------------------------ states */}
        <Section
          id="states"
          title="Empty & error states"
          caption="Two of the three states every async view owes the user. An empty state without a next step is barely better than a blank screen."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card padded={false}>
              <EmptyState
                icon={<FolderIcon />}
                title="No documents uploaded"
                description="Upload a national identity card or bank statement to start verification."
                actionLabel="Upload document"
                onAction={() => {}}
              />
            </Card>

            <Card padded={false}>
              <ErrorState
                title="Could not load fraud reports"
                description="The analysis service did not respond. Your work has not been lost."
                onRetry={() => {}}
              />
            </Card>
          </div>
        </Section>

        {/* ------------------------------------------------------- modal */}
        <Section
          id="modal"
          title="Modal"
          caption="Portalled, backdrop-dismissable, Esc to close, body scroll locked, Tab kept inside, focus returned to the trigger on close."
        >
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open confirm modal</Button>
            </div>
          </Card>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Set monthly target"
            description="Applies to the selected employee from the current month onward."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>Save target</Button>
              </>
            }
          >
            <div className="space-y-4">
              <Input label="Revenue target (LKR)" mono defaultValue="1,500,000" />
              <Select
                label="Applies from"
                defaultValue="2026-08"
                options={[
                  { value: '2026-07', label: 'July 2026' },
                  { value: '2026-08', label: 'August 2026' },
                ]}
              />
            </div>
          </Modal>

          <ConfirmModal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={confirmDelete}
            loading={confirmLoading}
            title="Reject this document?"
            description="The customer will be notified and the agreement cannot proceed."
            confirmLabel="Reject document"
          >
            <Textarea label="Reason for rejection" required rows={3} placeholder="Explain what failed verification…" />
          </ConfirmModal>
        </Section>

        {/* ------------------------------------------------------- rules */}
        <Section
          id="rules"
          title="Semantic state rules"
          caption="The fraud bands, applied consistently everywhere. The bar track is ink.200; only the fill takes the severity colour."
        >
          <Card className="space-y-5">
            {FRAUD_BANDS.map((b) => (
              <div key={b.range} className="grid items-center gap-4 sm:grid-cols-[120px_1fr_150px]">
                <span className="font-mono text-[13px] text-ink-600">{b.range}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
                  <div className={`h-full rounded-full ${b.fill}`} style={{ width: `${b.score}%` }} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-[22px] text-ink-950">{b.score}</span>
                  <Badge variant={b.variant}>{b.verdict}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <footer className="border-t border-ink-200 pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
            Greyscale test — view this page desaturated. Status must still be readable from the
            label, not the hue.
          </p>
        </footer>
      </main>
    </div>
  )
}
