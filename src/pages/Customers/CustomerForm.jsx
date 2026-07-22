import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, Card, ConfirmModal, ErrorState, Input, Select, Skeleton, Textarea } from '@/components/ui'
import customerService from '@/services/customerService'
import { CUSTOMER_STATUS } from '@/utils/constants'
import { nic as validateNic, optionalEmail, optionalPhone, required } from '@/utils/validators'

const BLANK = { nic_number: '', full_name: '', address: '', phone: '', email: '', status: 'pending' }

function validate(values) {
  return {
    nic_number: validateNic(values.nic_number),
    full_name: required(values.full_name, 'Full name'),
    phone: optionalPhone(values.phone),
    email: optionalEmail(values.email),
  }
}

/**
 * Create and edit in one component — the fields, rules and layout are identical
 * and keeping them in one place is what stops the two drifting apart.
 */
export default function CustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [values, setValues] = useState(BLANK)
  const [initial, setInitial] = useState(BLANK)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const clientErrors = validate(values)
  const isValid = !Object.values(clientErrors).some(Boolean)
  const isDirty = useMemo(
    () => Object.keys(values).some((key) => (values[key] ?? '') !== (initial[key] ?? '')),
    [values, initial],
  )

  const load = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    setLoadError(null)
    try {
      const customer = await customerService.get(id)
      const next = {
        nic_number: customer.nic_number ?? '',
        full_name: customer.full_name ?? '',
        address: customer.address ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        status: customer.status ?? 'pending',
      }
      setValues(next)
      setInitial(next)
    } catch (error) {
      setLoadError(error?.message ?? 'Could not load this customer.')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Catches a tab close or reload. In-app navigation cannot be blocked here —
   * that needs a data router (createBrowserRouter), which the app does not use
   * yet — so the Cancel action confirms explicitly instead.
   */
  useEffect(() => {
    if (!isDirty) return undefined
    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }))
    // A server error is about the value that was submitted; the moment the user
    // changes that value it no longer applies.
    setServerErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const markTouched = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))

  const errorFor = (field) => serverErrors[field] ?? (touched[field] ? clientErrors[field] : null)

  const onSubmit = async (event) => {
    event.preventDefault()
    setTouched({ nic_number: true, full_name: true, phone: true, email: true })
    if (!isValid) return

    // The API rejects unknown fields and will not accept empty strings where it
    // expects null, so blanks are dropped rather than sent through.
    const payload = {
      nic_number: values.nic_number.trim(),
      full_name: values.full_name.trim(),
      address: values.address.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
    }
    if (isEdit) payload.status = values.status

    setSaving(true)
    setServerErrors({})
    try {
      const saved = isEdit
        ? await customerService.update(id, payload)
        : await customerService.create(payload)

      setInitial(values) // clears the dirty guard before we navigate away
      toast.success(isEdit ? 'Customer updated.' : 'Customer registered.')
      navigate(`/customers/${saved.id}`, { replace: true })
    } catch (error) {
      setServerErrors(error?.fieldErrors ?? {})
      if (!Object.keys(error?.fieldErrors ?? {}).length) {
        toast.error(error?.message ?? 'Could not save this customer.')
      }
    } finally {
      setSaving(false)
    }
  }

  const leave = () => navigate(isEdit ? `/customers/${id}` : '/customers')

  const onCancel = () => {
    if (isDirty) setConfirmDiscard(true)
    else leave()
  }

  if (loadError) {
    return (
      <div className="animate-page-enter">
        <ErrorState description={loadError} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="animate-page-enter max-w-2xl">
      <header>
        <h1 className="page-title">{isEdit ? 'Edit customer' : 'New customer'}</h1>
        <p className="mt-1 text-body text-ink-600">
          {isEdit
            ? 'Update the registered details for this customer.'
            : 'Register a customer before uploading their identity documents.'}
        </p>
      </header>

      <Card className="mt-6">
        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="NIC number"
                name="nic_number"
                required
                mono
                value={values.nic_number}
                onChange={setField('nic_number')}
                onBlur={markTouched('nic_number')}
                error={errorFor('nic_number')}
                hint="12 digits, or 9 digits followed by V"
              />

              <Input
                label="Full name"
                name="full_name"
                required
                value={values.full_name}
                onChange={setField('full_name')}
                onBlur={markTouched('full_name')}
                error={errorFor('full_name')}
              />

              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={values.phone}
                onChange={setField('phone')}
                onBlur={markTouched('phone')}
                error={errorFor('phone')}
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={values.email}
                onChange={setField('email')}
                onBlur={markTouched('email')}
                error={errorFor('email')}
              />

              {isEdit && (
                <Select
                  label="Status"
                  name="status"
                  value={values.status}
                  onChange={setField('status')}
                  error={errorFor('status')}
                >
                  {Object.entries(CUSTOMER_STATUS).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <Textarea
              label="Address"
              name="address"
              wrapperClassName="mt-4"
              value={values.address}
              onChange={setField('address')}
              error={errorFor('address')}
            />

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-ink-200 pt-5">
              <Button variant="ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!isValid}>
                {isEdit ? 'Save changes' : 'Register customer'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <ConfirmModal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={leave}
        title="Discard changes?"
        description="This customer has unsaved edits. Leaving now loses them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
      />
    </div>
  )
}
