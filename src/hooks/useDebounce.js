import { useEffect, useState } from 'react'

/**
 * Trails `value` by `delay`, resetting the timer on every change — so a search
 * box fires one request when typing stops rather than one per keystroke.
 */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default useDebounce
