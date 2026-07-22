import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button, Spinner } from '@/components/ui'
import { ROLE_LABELS } from '@/utils/constants'

/**
 * Route guard. Two failures, two different answers:
 *
 * - not signed in → redirect to /login carrying the intended destination in
 *   location state, so the login page can return the user to it.
 * - signed in, wrong role → render a "no access" state in place. Redirecting
 *   here would be a lie: the route exists and the user is authenticated, they
 *   simply are not allowed, and they should be told so.
 *
 * Usable either as a layout route (renders <Outlet/>) or as a wrapper around a
 * single element.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <NoAccess role={role} />
  }

  return children ?? <Outlet />
}

/**
 * Shown inside the layout, so the user keeps their bearings and the sidebar
 * stays available. Set in the display serif on ink.50 with a single action.
 */
export function NoAccess({ role }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <p className="meta-label">403 — Restricted</p>
      <h1 className="mt-3 font-display text-title text-ink-950">You do not have access</h1>
      <p className="mt-2 max-w-md text-body text-ink-600">
        This area is limited to roles above{' '}
        {ROLE_LABELS[role] ? <strong className="font-medium text-ink-800">{ROLE_LABELS[role]}</strong> : 'yours'}. If
        you believe you should be able to see it, ask an administrator to review your permissions.
      </p>
      <Button variant="secondary" className="mt-6" onClick={() => window.history.back()}>
        Go back
      </Button>
    </div>
  )
}
