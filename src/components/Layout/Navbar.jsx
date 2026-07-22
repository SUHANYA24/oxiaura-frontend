import { matchPath, useLocation } from 'react-router-dom'
import { ROUTE_TITLES } from '@/utils/constants'

/**
 * White, bottom border only, page title in the display serif. Global search,
 * the notification bell, and the profile menu arrive in Phase 5.
 */
function usePageTitle() {
  const { pathname } = useLocation()

  // Most specific pattern wins, so walk the table from the end.
  for (let i = ROUTE_TITLES.length - 1; i >= 0; i -= 1) {
    const [pattern, title] = ROUTE_TITLES[i]
    if (matchPath({ path: pattern, end: true }, pathname)) return title
  }
  return ''
}

export default function Navbar({ onOpenSidebar }) {
  const title = usePageTitle()

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-ink-200 bg-white px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-control text-ink-600 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-ink-950 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <h1 className="truncate font-display text-[20px] leading-none text-ink-950">{title}</h1>
    </header>
  )
}
