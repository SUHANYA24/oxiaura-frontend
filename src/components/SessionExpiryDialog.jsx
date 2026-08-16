import { useDispatch } from 'react-redux'
import { Button, Modal } from '@/components/ui'
import useSessionExpiry from '@/hooks/useSessionExpiry'
import { logout } from '@/store/authSlice'

/**
 * The visible half of session-expiry handling.
 *
 * It shows nothing at all in the normal case: `useSessionExpiry` renews the
 * access token a couple of minutes ahead of the deadline and this component
 * never mounts a dialog. It appears only once that silent renewal has failed and
 * the token is inside the last minute — the refresh token has lapsed too, or the
 * network is down.
 *
 * Deliberately not dismissable: there is no backdrop click, no close button and
 * no Esc handler. Dismissing it would not buy the user any more session, and the
 * two actions below are the whole set of useful choices. Both are reachable by
 * keyboard, and Modal traps Tab between them.
 *
 * Nothing here navigates. The point of the phase's acceptance check is that a
 * forced expiry recovers *without losing the current page*, so a successful
 * retry just closes the dialog and leaves the user exactly where they were.
 */

/** m:ss, floored at zero — a negative countdown reads as a bug. */
function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function SessionExpiryDialog() {
  const dispatch = useDispatch()
  const { warning, msLeft, retrying, retry } = useSessionExpiry()

  if (!warning) return null

  return (
    <Modal
      open
      size="sm"
      closeOnBackdrop={false}
      showClose={false}
      title="Your session is about to expire"
      description="We could not renew it in the background."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => dispatch(logout())}
            disabled={retrying}
          >
            Sign out
          </Button>
          <Button variant="primary" onClick={retry} loading={retrying}>
            Stay signed in
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-700">
        You will be signed out{' '}
        {msLeft == null ? 'shortly' : <>in <span className="font-mono">{formatCountdown(msLeft)}</span></>}.
        Choosing <span className="font-medium text-ink-950">Stay signed in</span> keeps you on this
        page — nothing you have open will be lost.
      </p>
      {/*
        The countdown above updates once a second, which a screen reader would
        read out on every tick if it were live. The status line is announced
        once instead, politely, and the numbers are left to the sighted reading.
      */}
      <p className="sr-only" role="status">
        Your session expires soon. Choose Stay signed in to renew it, or Sign out to end it now.
      </p>
    </Modal>
  )
}
