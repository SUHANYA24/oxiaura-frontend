import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { refreshAccessToken } from '@/services/api'
import { selectAccessToken, sessionRefreshed } from '@/store/authSlice'
import { getAccessToken } from '@/services/tokenStorage'
import { msUntilExpiry } from '@/utils/jwt'

/**
 * Keeps the session alive without the user noticing, and warns them when it
 * cannot.
 *
 * The axios layer already refreshes reactively, on a 401. That is correct but
 * late: the request that discovered the expiry has to be replayed, and anything
 * non-idempotent — a document upload, a submitted proposal — is a bad thing to
 * replay. Refreshing ahead of the deadline means the 401 path stays a backstop
 * rather than the normal course of events.
 *
 * Both paths share `refreshAccessToken`'s promise, so they can never race.
 *
 * The warning only ever appears when the silent refresh has actually failed —
 * the refresh token has lapsed too, or the network is down. A dialog on every
 * ordinary renewal would train the user to dismiss it.
 */

/** Renew this far ahead of expiry. Long enough to absorb a retry or two. */
const REFRESH_LEAD_MS = 120_000

/** Warn once the token is this close and still unrenewed. */
const WARN_LEAD_MS = 60_000

/** Never schedule a timer tighter than this; a 0ms timeout is a spin loop. */
const MIN_DELAY_MS = 1_000

/** Back off between failed attempts rather than hammering a dead endpoint. */
const RETRY_DELAY_MS = 15_000

export default function useSessionExpiry() {
  const dispatch = useDispatch()
  const storedToken = useSelector(selectAccessToken)

  const [warning, setWarning] = useState(false)
  const [msLeft, setMsLeft] = useState(null)
  const [retrying, setRetrying] = useState(false)

  const timerRef = useRef(null)
  const tickRef = useRef(null)
  // Guards against a refresh resolving after the component has gone, and against
  // two schedule passes both firing an attempt.
  const aliveRef = useRef(true)
  const inFlightRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  /**
   * Reads the token from storage rather than from Redux. The axios interceptor
   * writes storage directly on its own refresh, so storage is the value that is
   * always current — Redux is the mirror.
   */
  const attempt = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const accessToken = await refreshAccessToken()
      if (!aliveRef.current) return
      dispatch(sessionRefreshed(accessToken))
      setWarning(false)
    } catch {
      if (!aliveRef.current) return
      // Only here is the warning honest: the silent path has been tried and has
      // failed. Raising it in the schedule pass instead would flash a dialog at
      // anyone returning to a suspended tab whose token merely needs renewing —
      // the attempt would succeed a moment later and dismiss its own alarm.
      //
      // Nothing is toasted. A failed background renewal that still has runway
      // left is not news; the dialog below is what the user needs, and only
      // once there is no runway left.
      const remaining = msUntilExpiry(getAccessToken())
      if (remaining != null && remaining <= WARN_LEAD_MS) setWarning(true)
    } finally {
      inFlightRef.current = false
    }
  }, [dispatch])

  const retry = useCallback(async () => {
    setRetrying(true)
    await attempt()
    if (aliveRef.current) setRetrying(false)
  }, [attempt])

  /**
   * One pass: look at the live token, act if it is time to, and set a timer for
   * the next decision. Re-entered on every token change, so a successful refresh
   * naturally reschedules against the new deadline.
   */
  const schedule = useCallback(() => {
    clearTimer()

    const remaining = msUntilExpiry(getAccessToken())

    // No token, or one with no readable `exp` — an opaque dev token, say. There
    // is nothing to schedule against, and guessing would be worse than leaving
    // the 401 path to handle it.
    if (remaining == null) {
      setMsLeft(null)
      setWarning(false)
      return
    }

    setMsLeft(remaining)

    if (remaining <= REFRESH_LEAD_MS) {
      // Each failed attempt re-checks the runway and raises the warning itself,
      // so sliding from two minutes down to nothing over a series of failures
      // still ends in a dialog rather than a silent sign-out.
      attempt()
      // Come back regardless of how that attempt goes: on success the token
      // change re-runs this pass immediately, on failure this is the retry.
      timerRef.current = window.setTimeout(schedule, RETRY_DELAY_MS)
      return
    }

    timerRef.current = window.setTimeout(
      schedule,
      Math.max(MIN_DELAY_MS, remaining - REFRESH_LEAD_MS),
    )
  }, [attempt])

  useEffect(() => {
    aliveRef.current = true
    schedule()

    /**
     * A backgrounded tab gets its timers throttled and a sleeping machine stops
     * firing them altogether, so the scheduled renewal can be hours overdue by
     * the time the user comes back. Re-deciding on wake is what makes this
     * reliable rather than merely usually-right.
     */
    const onWake = () => {
      if (document.visibilityState === 'visible') schedule()
    }

    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)

    return () => {
      aliveRef.current = false
      clearTimer()
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [schedule, storedToken])

  /**
   * The countdown only runs while the warning is up. Outside of that there is
   * nothing on screen reading it, and a permanent 1Hz interval is a permanent
   * 1Hz re-render.
   */
  useEffect(() => {
    if (!warning) {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
      return undefined
    }

    tickRef.current = window.setInterval(() => {
      setMsLeft(msUntilExpiry(getAccessToken()))
    }, 1_000)

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [warning])

  return {
    /** True only when the silent renewal has failed and expiry is imminent. */
    warning,
    /** Milliseconds of session left; null when the token carries no expiry. */
    msLeft,
    retrying,
    retry,
  }
}
