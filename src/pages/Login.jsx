import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { email as validateEmail, required } from '@/utils/validators'

/**
 * The authentication entry point. A centred card on an ink.50 field — the
 * whitespace and the serif wordmark carry it, so there is no illustration and
 * no gradient.
 *
 * Validation follows the house rule: errors appear under the field on blur
 * rather than only on submit, and submit stays disabled while the form is
 * invalid or in flight.
 */
/** Sized to sit inside the input's 36px suffix slot without crowding the value. */
function EyeIcon({ crossed }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8S4 3.75 8 3.75 14.5 8 14.5 8 12 12.25 8 12.25 1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.85" stroke="currentColor" strokeWidth="1.3" />
      {crossed && (
        <path d="m3 13 10-10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </svg>
  )
}

function validate(values) {
  return {
    email: validateEmail(values.email),
    password: required(values.password, 'Password'),
  }
}

export default function Login() {
  const { isAuthenticated, login, error, fieldErrors, isSubmitting, clearError } = useAuth()
  const location = useLocation()

  const [values, setValues] = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const clientErrors = validate(values)
  const isValid = !clientErrors.email && !clientErrors.password

  // Where the guard bounced them from, or the dashboard. This doubles as the
  // "already signed in" redirect — landing on /login with a session sends the
  // user straight back out.
  const from = location.state?.from?.pathname ?? '/'
  if (isAuthenticated) return <Navigate to={from} replace />

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }))
    // A stale "invalid credentials" banner under a field the user is actively
    // fixing is just noise.
    if (error) clearError()
  }

  const handleBlur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))

  const onSubmit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (!isValid) return
    await login({ email: values.email.trim(), password: values.password })
  }

  // Server-side field errors outrank client ones — they know things the regex
  // cannot, and they only arrive after a submit the user has already seen fail.
  const errorFor = (field) =>
    fieldErrors?.[field] ?? (touched[field] ? clientErrors[field] : null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-sm animate-page-enter">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[32px] leading-none text-ink-950">Plantvest</h1>
          <p className="mt-3 text-body text-ink-600">Sign in to continue</p>
        </div>

        <Card>
          <form onSubmit={onSubmit} noValidate>
            {error && (
              <p
                role="alert"
                className="mb-5 rounded-control border border-state-danger-border bg-state-danger-bg px-3 py-2.5 text-[13px] text-state-danger"
              >
                {error}
              </p>
            )}

            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              value={values.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              error={errorFor('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              wrapperClassName="mt-4"
              value={values.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              error={errorFor('password')}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="flex h-6 w-6 items-center justify-center rounded text-ink-400 transition-colors duration-150 ease-out hover:text-ink-950"
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="mt-6"
              loading={isSubmitting}
              disabled={!isValid}
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
