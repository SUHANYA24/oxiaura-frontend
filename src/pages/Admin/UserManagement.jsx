import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
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
  Table,
} from '@/components/ui'
import useAuth from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import userService, { USING_MOCK_USERS } from '@/services/userService'
import {
  BRANCH_OPTIONS,
  PASSWORD_MIN_LENGTH,
  ROLE_LABELS,
  ROLE_OPTIONS,
  branchName,
  userStatus,
} from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import { email as validateEmail, password as validatePassword, required } from '@/utils/validators'
import { cn } from '@/utils/cn'

const PER_PAGE = 10

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
]

const ROLE_FILTER_OPTIONS = [{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]

const BRANCH_FIELD_OPTIONS = [{ value: '', label: 'Unassigned' }, ...BRANCH_OPTIONS]

/* --------------------------------------------------------------- form modal */

const EMPTY_FORM = { fullName: '', email: '', role: '', branchId: '', isActive: true, password: '' }

const toForm = (user) => ({
  fullName: user.full_name,
  email: user.email,
  role: user.role,
  branchId: user.branch_id == null ? '' : String(user.branch_id),
  isActive: user.is_active,
  password: '',
})

/**
 * The active state, as a switch rather than a checkbox: it takes effect the
 * moment the form is saved, so it reads as a setting and not as consent. There
 * is no Switch primitive in the design system yet, so it is built here from the
 * same ink.950-when-on treatment the segmented controls use.
 */
function ActiveSwitch({ checked, onChange, disabled, hint }) {
  return (
    <div>
      <span className="meta-label">Account</span>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ease-out',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-950',
            checked ? 'bg-ink-950' : 'bg-ink-300',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left] duration-150 ease-out',
              checked ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </button>
        <span className="text-body text-ink-950">{checked ? 'Active' : 'Inactive'}</span>
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-ink-400">{hint}</p>}
    </div>
  )
}

/**
 * Create and edit are the same form — the only differences are the password
 * field, which exists only on create, and whether the active switch can be
 * touched, which it cannot when the admin is editing themselves.
 */
function UserFormModal({ open, user, isSelf, saving, serverErrors, onClose, onSubmit }) {
  const editing = Boolean(user)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // Re-seed on open rather than on every render, so a half-typed edit is not
  // wiped by a background refresh of the row behind the dialog.
  useEffect(() => {
    if (!open) return
    setForm(user ? toForm(user) : EMPTY_FORM)
    setErrors({})
  }, [open, user])

  // Field errors the server raised land on the same inputs as the local ones.
  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) {
      setErrors((current) => ({
        ...current,
        fullName: serverErrors.full_name ?? current.fullName,
        email: serverErrors.email ?? current.email,
        role: serverErrors.role ?? current.role,
        password: serverErrors.password ?? current.password,
      }))
    }
  }, [serverErrors])

  const set = (field) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    // Clearing on change rather than re-validating: the message goes as soon as
    // the field is touched, and comes back on blur if it is still wrong.
    setErrors((current) => ({ ...current, [field]: null }))
  }

  const validateField = (field) => () =>
    setErrors((current) => ({ ...current, [field]: fieldError(field, form, editing) }))

  const submit = (event) => {
    event.preventDefault()

    const next = {
      fullName: fieldError('fullName', form, editing),
      email: fieldError('email', form, editing),
      role: fieldError('role', form, editing),
      password: fieldError('password', form, editing),
    }

    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    onSubmit(form)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit user' : 'New user'}
      description={
        editing
          ? 'Identity, role and access. Use “Reset password” on the row to issue new credentials.'
          : 'The account is created with the password you set here; the user can change it after signing in.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            {editing ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2" noValidate>
        <Input
          label="Full name"
          required
          value={form.fullName}
          onChange={set('fullName')}
          onBlur={validateField('fullName')}
          error={errors.fullName}
          autoComplete="off"
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={set('email')}
          onBlur={validateField('email')}
          error={errors.email}
          hint="This is the address they sign in with."
          autoComplete="off"
        />
        <Select
          label="Role"
          required
          value={form.role}
          onChange={set('role')}
          onBlur={validateField('role')}
          error={errors.role}
          options={ROLE_OPTIONS}
          placeholder="Choose a role"
        />
        <Select
          label="Branch"
          value={form.branchId}
          onChange={set('branchId')}
          options={BRANCH_FIELD_OPTIONS}
          hint="Head office accounts often have none."
        />

        {!editing && (
          <Input
            label="Initial password"
            type="password"
            required
            mono
            value={form.password}
            onChange={set('password')}
            onBlur={validateField('password')}
            error={errors.password}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            autoComplete="new-password"
          />
        )}

        <ActiveSwitch
          checked={form.isActive}
          disabled={isSelf}
          onChange={(next) => setForm((current) => ({ ...current, isActive: next }))}
          hint={
            isSelf
              ? 'You cannot deactivate your own account.'
              : 'An inactive account keeps its records but cannot sign in.'
          }
        />

        {/* Submitting with Enter, without a second visible button. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}

/** One rule table, used by blur validation and by submit, so they cannot drift. */
function fieldError(field, form, editing) {
  if (field === 'fullName') return required(form.fullName, 'Full name')
  if (field === 'email') return validateEmail(form.email)
  if (field === 'role') return required(form.role, 'Role')
  if (field === 'password' && !editing) return validatePassword(form.password, PASSWORD_MIN_LENGTH)
  return null
}

/* --------------------------------------------------------- password reveal */

/**
 * The temporary password, shown once. It is set in mono at a size that can be
 * read aloud over a phone, with a copy action, and the dialog has to be
 * dismissed deliberately — closing it is the last time this string exists.
 */
function PasswordModal({ result, onClose }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporary_password)
      setCopied(true)
      toast.success('Password copied.')
    } catch {
      toast.error('Could not copy — select the password and copy it manually.')
    }
  }

  return (
    <Modal
      open={Boolean(result)}
      onClose={onClose}
      title="Temporary password"
      description={`Hand this to ${result.full_name}. It is shown once and cannot be retrieved again.`}
      size="md"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <p
        className="select-all rounded-control border border-ink-200 bg-ink-50 px-4 py-3 font-mono text-[18px] tracking-[0.04em] text-ink-950"
        data-testid="temporary-password"
      >
        {result.temporary_password}
      </p>
      <p className="mt-3 text-[13px] text-ink-600">
        The user will be asked to change it after signing in.
      </p>
    </Modal>
  )
}

/* ------------------------------------------------------------------- page */

export default function UserManagement() {
  const { user: currentUser } = useAuth()

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search)

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 })
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState({})

  const [confirming, setConfirming] = useState(null) // { user, nextActive }
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [resetting, setResetting] = useState(null) // the user awaiting a reset
  const [passwordResult, setPasswordResult] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const result = await userService.list({
        page,
        perPage: PER_PAGE,
        search: debouncedSearch,
        role,
        isActive,
      })
      setRows(result.items)
      setPagination(result.pagination)
      // The service clamps a page a filter has emptied; follow it so the
      // controls and the rows agree.
      if (result.pagination.page !== page) setPage(result.pagination.page)
      setStatus('ready')
    } catch (err) {
      setError(err?.message ?? 'Could not load users.')
      setStatus('error')
    }
  }, [page, debouncedSearch, role, isActive])

  useEffect(() => {
    load()
  }, [load])

  // Any filter change starts from the first page — page 4 of the old result set
  // is meaningless against the new one.
  const onFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    setServerErrors({})
    setFormOpen(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setServerErrors({})
    setFormOpen(true)
  }

  const submitForm = async (form) => {
    setSaving(true)
    setServerErrors({})
    try {
      if (editing) {
        await userService.update(editing.id, form)
        toast.success(`${form.fullName} updated.`)
      } else {
        await userService.create(form)
        toast.success(`${form.fullName} added.`)
      }
      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      const fields = err?.fieldErrors ?? {}
      setServerErrors(fields)
      // A field-level failure is already visible on the input; only a
      // page-level one needs the toast.
      if (!Object.keys(fields).length) toast.error(err?.message ?? 'Could not save the user.')
    } finally {
      setSaving(false)
    }
  }

  const confirmSetActive = async () => {
    const { user, nextActive } = confirming
    setConfirmBusy(true)
    try {
      await userService.setActive(user.id, nextActive)
      toast.success(`${user.full_name} ${nextActive ? 'reactivated' : 'deactivated'}.`)
      setConfirming(null)
      await load()
    } catch (err) {
      toast.error(err?.message ?? 'Could not change the account state.')
    } finally {
      setConfirmBusy(false)
    }
  }

  const resetPassword = async (user) => {
    setResetting(user)
    try {
      const result = await userService.resetPassword(user.id)
      setPasswordResult({ ...result, full_name: user.full_name })
    } catch (err) {
      toast.error(err?.message ?? 'Could not reset the password.')
    } finally {
      setResetting(null)
    }
  }

  const isSelf = (user) => currentUser?.id != null && user.id === currentUser.id

  const columns = useMemo(
    () => [
      {
        key: 'full_name',
        header: 'User',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-950">
              {row.full_name}
              {isSelf(row) && <span className="ml-2 text-[13px] font-normal text-ink-400">You</span>}
            </p>
            <p className="mt-0.5 truncate font-mono text-meta text-ink-400">{row.email}</p>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        // A role is not a status, so it stays a neutral ink.100 mono chip. Colour
        // on this column would compete with the one thing that is a state.
        render: (row) => (
          <span className="badge badge-neutral font-mono text-meta uppercase">
            {ROLE_LABELS[row.role] ?? row.role}
          </span>
        ),
      },
      {
        key: 'branch_id',
        header: 'Branch',
        render: (row) => <span className="text-ink-600">{branchName(row.branch_id)}</span>,
      },
      {
        key: 'is_active',
        header: 'Status',
        render: (row) => {
          const state = userStatus(row.is_active)
          return <Badge variant={state.variant}>{state.label}</Badge>
        },
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (row) => <span className="tabular-nums text-ink-600">{formatDate(row.created_at)}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        width: 260,
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={resetting?.id === row.id}
              onClick={() => resetPassword(row)}
            >
              Reset password
            </Button>
            {/* Reactivation is not destructive, so only the deactivate
                direction reads as danger — and never for your own account. */}
            {isSelf(row) ? null : row.is_active ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-state-danger hover:bg-state-danger-bg"
                onClick={() => setConfirming({ user: row, nextActive: false })}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming({ user: row, nextActive: true })}
              >
                Activate
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.id, resetting?.id],
  )

  const filtered = Boolean(debouncedSearch || role || isActive)
  const loading = status === 'loading'

  return (
    <div className="animate-page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">User management</h1>
          <p className="mt-1 text-body text-ink-600">
            {loading
              ? 'Loading'
              : `${pagination.total} ${pagination.total === 1 ? 'account' : 'accounts'}`}
            {filtered && !loading ? ' matching the filters' : ''}
          </p>
        </div>

        <Button variant="primary" onClick={openCreate}>
          New user
        </Button>
      </header>

      {USING_MOCK_USERS && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-control border border-state-info-border bg-state-info-bg px-3 py-1.5 text-[13px] text-state-info">
          Sample data — the user endpoints are not in the API contract yet and are mocked in the
          service layer only.
        </p>
      )}

      <Card className="mt-6" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Name or email"
            value={search}
            onChange={(event) => onFilter(setSearch)(event.target.value)}
            wrapperClassName="lg:col-span-2"
          />
          <Select
            label="Role"
            value={role}
            onChange={(event) => onFilter(setRole)(event.target.value)}
            options={ROLE_FILTER_OPTIONS}
          />
          <Select
            label="Status"
            value={isActive}
            onChange={(event) => onFilter(setIsActive)(event.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </Card>

      {status === 'error' ? (
        <Card className="mt-6">
          <ErrorState description={error} onRetry={load} />
        </Card>
      ) : (
        <Card className="mt-6" padded={false} bodyClassName="p-0">
          <Table
            columns={columns}
            data={rows}
            loading={loading}
            rowKey={(row) => row.id}
            empty={
              <EmptyState
                title={filtered ? 'No matching users' : 'No users yet'}
                description={
                  filtered
                    ? 'Nothing matches these filters. Clear them, or search a different name.'
                    : 'Add the first account to get started.'
                }
                action={
                  filtered ? null : (
                    <Button variant="primary" className="mt-5" onClick={openCreate}>
                      New user
                    </Button>
                  )
                }
              />
            }
          />
          {!loading && rows.length > 0 && (
            <Pagination
              page={pagination.page}
              pageSize={PER_PAGE}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </Card>
      )}

      <UserFormModal
        open={formOpen}
        user={editing}
        isSelf={Boolean(editing && isSelf(editing))}
        saving={saving}
        serverErrors={serverErrors}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={submitForm}
      />

      <ConfirmModal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={confirmSetActive}
        loading={confirmBusy}
        variant={confirming?.nextActive ? 'primary' : 'danger'}
        title={confirming?.nextActive ? 'Reactivate this account?' : 'Deactivate this account?'}
        confirmLabel={confirming?.nextActive ? 'Reactivate' : 'Deactivate'}
        description={
          confirming?.nextActive
            ? `${confirming?.user?.full_name} will be able to sign in again.`
            : `${confirming?.user?.full_name} will not be able to sign in. Their customers, agreements and history are kept, and you can reactivate the account at any time.`
        }
      />

      {passwordResult && (
        <PasswordModal result={passwordResult} onClose={() => setPasswordResult(null)} />
      )}
    </div>
  )
}
