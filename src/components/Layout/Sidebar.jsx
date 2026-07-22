import { useDispatch, useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { navForRole, ROLE_LABELS } from '@/utils/constants'
import { selectSidebarCollapsed, toggleSidebar } from '@/store/uiSlice'
import NavIcon from './NavIcon'

/**
 * ink.50 field, one ink.200 right border, no shadow.
 *
 * The active item carries three redundant cues — ink.950 text, an ink.100 fill,
 * and a 2px ink.950 left bar — none of which is colour. That is deliberate: the
 * design has to survive the greyscale test, and "active" is not a status.
 *
 * `forceExpanded` is for the mobile drawer, which is always full width because
 * a collapsed overlay would be a strip of icons floating over the page.
 */
export default function Sidebar({ onNavigate, forceExpanded = false }) {
  const dispatch = useDispatch()
  const { user, role, logout } = useAuth()

  const storedCollapsed = useSelector(selectSidebarCollapsed)
  const collapsed = forceExpanded ? false : storedCollapsed

  const sections = navForRole(role)
  const initials = (user?.full_name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-full flex-col border-r border-ink-200 bg-ink-50">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-ink-200',
          collapsed ? 'justify-center px-2' : 'justify-between px-6',
        )}
      >
        {!collapsed && (
          <span className="font-display text-[22px] leading-none text-ink-950">Plantvest</span>
        )}

        {!forceExpanded && (
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 items-center justify-center rounded-control text-ink-400 transition-colors duration-150 ease-out hover:bg-ink-100 hover:text-ink-950"
          >
            <NavIcon name="chevronLeft" className={cn('transition-transform duration-150', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-6', collapsed ? 'px-2' : 'px-3')}>
        {sections.map((section, index) => (
          <div key={section.label} className="mb-6 last:mb-0">
            {collapsed ? (
              // A rule stands in for the section label, so the grouping survives
              // without the text that carries it when expanded. Nothing sits
              // above the first section, so it gets no rule.
              index > 0 && <div className="mx-2 mb-4 border-t border-ink-200" />
            ) : (
              <p className="meta-label px-3 pb-2">{section.label}</p>
            )}

            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center rounded-control text-body transition-colors duration-150 ease-out',
                    collapsed ? 'h-10 justify-center' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-ink-100 font-medium text-ink-950 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-ink-950'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
                  )
                }
              >
                <NavIcon name={item.icon} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className={cn('shrink-0 border-t border-ink-200 py-4', collapsed ? 'px-2' : 'px-6')}>
          {collapsed ? (
            <div
              title={`${user.full_name} · ${ROLE_LABELS[role] ?? role}`}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 font-mono text-[12px] text-ink-950"
            >
              {initials}
            </div>
          ) : (
            <>
              <p className="truncate text-body font-medium text-ink-950">{user.full_name}</p>
              {/* Branch would sit here, but /auth/me returns only branch_id and
                  the API has no endpoint to resolve it to a name yet. */}
              <p className="mt-0.5 truncate font-mono text-meta uppercase text-ink-400">
                {ROLE_LABELS[role] ?? role}
              </p>
            </>
          )}

          <button
            type="button"
            onClick={logout}
            title={collapsed ? 'Sign out' : undefined}
            aria-label={collapsed ? 'Sign out' : undefined}
            className={cn(
              'mt-3 flex items-center gap-2 text-[13px] text-ink-600 transition-colors duration-150 ease-out hover:text-ink-950',
              collapsed && 'mx-auto justify-center',
            )}
          >
            <NavIcon name="signOut" />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
