import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

/**
 * The persistent shell every authenticated page lives in: fixed sidebar,
 * navbar, and the routed page in the content column.
 *
 * Below lg the sidebar becomes an overlay drawer. Its open state is local for
 * now; Phase 5 moves it to uiSlice along with the desktop collapse toggle.
 */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Navigating away is the drawer's own dismissal — the user is done with it.
  useEffect(() => setDrawerOpen(false), [pathname])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKeyDown = (event) => event.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-950/20 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-float lg:hidden">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Navbar onOpenSidebar={() => setDrawerOpen(true)} />
        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
