import { Component } from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * The last line of defence. A render-time throw anywhere below this point would
 * otherwise unmount the whole tree and leave a white page — the one failure mode
 * no amount of per-view error handling can catch, because it happens while React
 * is drawing rather than while a request is in flight.
 *
 * Deliberately a class: `getDerivedStateFromError` and `componentDidCatch` have
 * no hook equivalent.
 *
 * Async failures do not reach here — a rejected promise is not a render error.
 * Those are handled where they happen, which is why every view still owes the
 * user its own error state.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No error-reporting service is wired up yet, so the console is the audit
    // trail. When one is added, this is the single place it hooks in.
    console.error('Unhandled render error:', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    // Navigating away is the user's own retry. Without this the fallback would
    // outlive the broken route and follow them to every other page.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return <Fallback error={this.state.error} onRetry={() => this.setState({ error: null })} />
  }
}

/**
 * Display serif on ink.50, the same language as NotFound and NoAccess, so the
 * three dead ends in the app read as one family.
 *
 * Two ways out, because they fail differently: re-rendering fixes a transient
 * throw, and a full reload fixes a bad module or a stale bundle. The stack is
 * shown in dev only — in production it is noise the user cannot act on.
 */
function Fallback({ error, onRetry }) {
  return (
    <main className="flex min-h-screen animate-page-enter flex-col items-center justify-center bg-ink-50 px-6 py-16 text-center">
      <p className="meta-label">Something broke</p>
      <h1 className="mt-3 font-display text-title text-ink-950">This page stopped responding</h1>
      <p className="mt-2 max-w-md text-body text-ink-600">
        The error is on our side, not yours. Nothing you had already saved is affected — anything
        still on screen and unsaved will need to be entered again.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
          Reload the app
        </button>
        <Link to="/" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>

      {import.meta.env.DEV && (
        <details className="mt-10 w-full max-w-2xl text-left">
          <summary className="cursor-pointer font-mono text-meta uppercase text-ink-600">
            Error detail (development only)
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-card border border-ink-200 bg-white p-4 font-mono text-[12px] leading-5 text-state-danger">
            {error?.stack ?? String(error)}
          </pre>
        </details>
      )}
    </main>
  )
}

/**
 * Router-aware wrapper. Must sit inside the Router — it reads the location to
 * know when to clear itself — but outside <Routes>, so a throw in the route
 * table itself is still caught.
 */
export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

export { ErrorBoundary }
