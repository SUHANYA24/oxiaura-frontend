import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import NoAccess from '@/pages/NoAccess'

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
      <div
        className="flex min-h-screen items-center justify-center bg-ink-50"
        role="status"
        aria-live="polite"
      >
        <Spinner size="lg" />
        <span className="sr-only">Restoring your session</span>
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

// Re-exported for the handful of callers that import it from here rather than
// from the page, so moving it did not become a rename.
export { NoAccess }
