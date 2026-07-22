import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS, ROLES } from '@/utils/constants'

/**
 * STUB. Phase 4 replaces the body of this card with the real form — email and
 * password with inline validation, show/hide, loading state on submit, and a
 * state.danger error banner for bad credentials.
 *
 * Until the auth API is wired, the role switcher below stands in for it so the
 * route table and its guards can actually be walked.
 */
const DEV_USERS = [
  { name: 'Anoma Perera', email: 'admin@plantvest.lk', role: ROLES.ADMIN, branch: 'Head Office' },
  { name: 'Ruwan Silva', email: 'ho@plantvest.lk', role: ROLES.HEAD_OFFICE, branch: 'Head Office' },
  { name: 'Dilani Fernando', email: 'rep@plantvest.lk', role: ROLES.SALES_REP, branch: 'Kandy' },
]

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where the guard bounced them from, or the dashboard.
  const from = location.state?.from?.pathname ?? '/'

  if (isAuthenticated) return <Navigate to={from} replace />

  const signIn = (user) => {
    login(user)
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-sm animate-page-enter">
        <div className="mb-8 text-center">
          <p className="font-display text-[32px] leading-none text-ink-950">Plantvest</p>
          <p className="mt-3 text-body text-ink-600">Sign in to continue</p>
        </div>

        <Card>
          <p className="meta-label">Development sign-in</p>
          <p className="mt-3 text-body text-ink-600">
            The credential form lands in <span className="font-mono text-[13px] text-ink-950">Phase 4</span>. Pick a
            role to walk the app with that role&rsquo;s access.
          </p>

          <div className="mt-6 space-y-2">
            {DEV_USERS.map((user) => (
              <Button key={user.role} variant="secondary" fullWidth onClick={() => signIn(user)}>
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span>{user.name}</span>
                  <span className="font-mono text-meta uppercase text-ink-400">{ROLE_LABELS[user.role]}</span>
                </span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
