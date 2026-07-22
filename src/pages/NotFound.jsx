import { Link } from 'react-router-dom'

/**
 * Rendered outside the layout, because a 404 can be reached while signed out.
 * Display serif on ink.50, one return action, nothing else.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <p className="meta-label">404 — Not found</p>
      <h1 className="mt-3 font-display text-title text-ink-950">This page does not exist</h1>
      <p className="mt-2 max-w-md text-body text-ink-600">
        The link may be out of date, or the record it pointed to has been removed.
      </p>
      <Link to="/" className="btn btn-secondary mt-6">
        Back to dashboard
      </Link>
    </div>
  )
}
