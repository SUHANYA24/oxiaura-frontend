import { useEffect, useRef, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS, ROUTE_TITLES } from '@/utils/constants'
import NavIcon from './NavIcon'

/** White, bottom border only. The title is the one serif element up here. */
function usePageTitle() {
  const { pathname } = useLocation()

  // Most specific pattern wins, so walk the table from the end.
  for (let i = ROUTE_TITLES.length - 1; i >= 0; i -= 1) {
    const [pattern, title] = ROUTE_TITLES[i]
    if (matchPath({ path: pattern, end: true }, pathname)) return title
  }
  return ''
}

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-control text-ink-600 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-ink-950'

export default function Navbar({ onOpenSidebar }) {
  const title = usePageTitle()
  const navigate = useNavigate()
  const { user, role, logout } = useAuth()

  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  // Wired to the notifications feed when that endpoint exists. Held at zero
  // rather than faked, so the dot never claims unread items that aren't there.
  const unreadCount = 0

  // The menu is owned entirely by this component, so its state stays local —
  // uiSlice is for state more than one component has to agree on.
  useEffect(() => {
    if (!profileOpen) return undefined

    const onPointerDown = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    const onKeyDown = (event) => event.key === 'Escape' && setProfileOpen(false)

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  const onSearch = (event) => {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    // The customer list is the only searchable collection today; it reads this
    // param when that screen is built.
    navigate(`/customers?search=${encodeURIComponent(term)}`)
  }

  const initials = (user?.full_name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-6">
      <button type="button" onClick={onOpenSidebar} aria-label="Open navigation" className={cn(iconButton, '-ml-2 lg:hidden')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <h1 className="truncate font-display text-[20px] leading-none text-ink-950">{title}</h1>

      <form onSubmit={onSearch} className="ml-auto hidden md:block" role="search">
        <label htmlFor="global-search" className="sr-only">
          Search customers
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
            <NavIcon name="search" />
          </span>
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customers"
            className="form-input w-56 pl-9 lg:w-72"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <button
          type="button"
          className={cn(iconButton, 'relative')}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <NavIcon name="bell" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-state-danger" aria-hidden="true" />
          )}
        </button>

        <button type="button" className={iconButton} aria-label="Help">
          <NavIcon name="help" />
        </button>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Account menu"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 font-mono text-[12px] text-ink-950 transition-colors duration-150 ease-out hover:bg-ink-200"
          >
            {initials}
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 rounded-card border border-ink-200 bg-white py-1 shadow-float"
            >
              <div className="border-b border-ink-200 px-4 py-3">
                <p className="truncate text-body font-medium text-ink-950">{user?.full_name}</p>
                <p className="mt-0.5 truncate text-[13px] text-ink-600">{user?.email}</p>
                <p className="mt-1.5 font-mono text-meta uppercase text-ink-400">{ROLE_LABELS[role] ?? role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-body text-ink-600 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-ink-950"
              >
                <NavIcon name="signOut" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
