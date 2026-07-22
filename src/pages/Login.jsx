import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

/**
 * PHASE 3 TEST HARNESS — deliberately plain.
 *
 * This exists to prove the store and API layer work end to end: submit, the
 * user and tokens land in the store, a refresh keeps the session, sign out
 * clears it. Phase 4 replaces the body of this card with the real form —
 * inline validation, show/hide password, and a state.danger error banner.
 */
export default function Login() {
  const { isAuthenticated, login, logout, user, error, fieldErrors, isSubmitting } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from = location.state?.from?.pathname ?? '/'

  if (isAuthenticated) return <Navigate to={from} replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    const { ok } = await login({ email, password })
    if (ok) navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-sm animate-page-enter">
        <div className="mb-8 text-center">
          <p className="font-display text-[32px] leading-none text-ink-950">Plantvest</p>
          <p className="mt-3 text-body text-ink-600">Sign in to continue</p>
        </div>

        <Card>
          <form onSubmit={onSubmit} noValidate>
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors?.email}
            />

            <div className="mt-4">
              <Input
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={fieldErrors?.password}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-control border border-state-danger-border bg-state-danger-bg px-3 py-2 text-[13px] text-state-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="mt-6"
              loading={isSubmitting}
              disabled={!email || !password}
            >
              Sign in
            </Button>
          </form>

          {/* Phase 3 only: proves logout clears a session without needing the shell. */}
          {user && (
            <button type="button" onClick={logout} className="mt-4 text-[13px] text-ink-600 hover:text-ink-950">
              Sign out
            </button>
          )}
        </Card>
      </div>
    </div>
  )
}
