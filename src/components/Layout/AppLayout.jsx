import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import {
  closeSidebarDrawer,
  openSidebarDrawer,
  selectSidebarCollapsed,
  selectSidebarDrawerOpen,
} from '@/store/uiSlice'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

/**
 * The persistent shell every authenticated page lives in.
 *
 * Two independent pieces of sidebar state, because they answer different
 * questions: `collapsed` is a desktop preference that persists, `drawerOpen` is
 * a transient mobile overlay. Below lg the sidebar is a drawer rather than a
 * strip of icons — an icon rail on a phone is too small a target to be useful.
 */
export default function AppLayout() {
  const dispatch = useDispatch()
  const collapsed = useSelector(selectSidebarCollapsed)
  const drawerOpen = useSelector(selectSidebarDrawerOpen)
  const { pathname } = useLocation()

  // Navigating is the drawer's own dismissal — the user is done with it.
  useEffect(() => {
    dispatch(closeSidebarDrawer())
  }, [pathname, dispatch])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKeyDown = (event) => event.key === 'Escape' && dispatch(closeSidebarDrawer())
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen, dispatch])

  return (
    <div className="min-h-screen bg-ink-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 hidden transition-[width] duration-150 ease-out lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <Sidebar />
      </aside>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-950/20 lg:hidden"
            onClick={() => dispatch(closeSidebarDrawer())}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 shadow-float lg:hidden">
            <Sidebar forceExpanded onNavigate={() => dispatch(closeSidebarDrawer())} />
          </aside>
        </>
      )}

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-150 ease-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-64',
        )}
      >
        <Navbar onOpenSidebar={() => dispatch(openSidebarDrawer())} />
        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
