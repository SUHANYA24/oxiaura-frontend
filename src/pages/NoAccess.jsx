import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ROLE_LABELS } from '@/utils/constants'

/**
 * The 403 dead end, rendered in place by ProtectedRoute rather than redirected
 * to. Redirecting would be a lie: the route exists and the user is signed in,
 * they simply are not allowed, and saying so is more useful than moving them
 * somewhere they did not ask to go.
 *
 * Shown inside the layout, so the sidebar stays available and the user keeps
 * their bearings. Display serif on ink.50, one action — the same language as
 * NotFound and the ErrorBoundary fallback.
 *
 * "Restricted" is stated in words, not signalled by colour: nothing on this page
 * is tinted, because a role boundary is not a fault condition.
 */
export default function NoAccess({ role }) {
  const navigate = useNavigate()

  // window.history.back() lands on a blank tab when this route was opened
  // directly from a bookmark or a pasted link, which is exactly how someone
  // finds a page they are not allowed to see. Fall back to the dashboard.
  const canGoBack = window.history.length > 1

  return (
    <div className="flex animate-page-enter flex-col items-center px-6 py-20 text-center">
      <p className="meta-label">403 — Restricted</p>
      <h1 className="mt-3 font-display text-title text-ink-950">You do not have access</h1>
      <p className="mt-2 max-w-md text-body text-ink-600">
        This area is not open to the{' '}
        <strong className="font-medium text-ink-800">{ROLE_LABELS[role] ?? role}</strong> role. If
        you believe you should be able to see it, ask an administrator to review your permissions.
      </p>

      {canGoBack ? (
        <Button variant="secondary" className="mt-6" onClick={() => navigate(-1)}>
          Go back
        </Button>
      ) : (
        <Link to="/" className="btn btn-secondary mt-6">
          Back to dashboard
        </Link>
      )}
    </div>
  )
}
