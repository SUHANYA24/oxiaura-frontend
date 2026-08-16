import { useEffect, useRef, useState } from 'react'

/**
 * Polls an async `fetcher` on a fixed interval until `isDone(result)` returns
 * true, a timeout elapses, or the fetcher throws. Built for the document
 * pipeline: upload hands back a job reference and the OCR/fraud result lands a
 * few seconds later, so the screen polls rather than waits on one long request.
 *
 * Controlled by `enabled` — flip it true once a job id exists and the hook runs
 * itself, self-scheduling each tick and cleaning up on unmount. `key` restarts
 * a fresh run (new timeout clock, cleared state) when it changes, so uploading
 * a second document does not inherit the first one's timer.
 *
 * status: 'idle' | 'polling' | 'success' | 'timeout' | 'error'
 */
export function usePolling(
  fetcher,
  { interval = 2000, timeout = 60000, isDone = () => true, enabled = false, key } = {},
) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle')

  // Held in refs so a changing fetcher/predicate does not tear down and restart
  // the polling loop — only `enabled` and `key` are meant to do that.
  const fetcherRef = useRef(fetcher)
  const isDoneRef = useRef(isDone)
  fetcherRef.current = fetcher
  isDoneRef.current = isDone

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setData(null)
      setError(null)
      return undefined
    }

    let cancelled = false
    let timer = null
    const startedAt = Date.now()
    setStatus('polling')
    setError(null)

    const tick = async () => {
      try {
        const result = await fetcherRef.current()
        if (cancelled) return

        setData(result)

        if (isDoneRef.current?.(result)) {
          setStatus('success')
          return
        }
        if (Date.now() - startedAt >= timeout) {
          setStatus('timeout')
          return
        }
        timer = setTimeout(tick, interval)
      } catch (err) {
        if (cancelled) return
        setError(err)
        setStatus('error')
      }
    }

    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, interval, timeout, key])

  return { data, error, status }
}

export default usePolling
