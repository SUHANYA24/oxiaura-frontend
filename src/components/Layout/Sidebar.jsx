import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { navForRole, ROLE_LABELS } from '@/utils/constants'

/**
 * ink.50 field, one ink.200 right border, no shadow. The active item is ink.950
 * text on an ink.100 fill with a 2px ink.950 left bar — three redundant cues,
 * none of them colour.
 *
 * Phase 5 adds the collapse toggle (persisted to uiSlice) and item icons.
 */
export default function Sidebar({ onNavigate }) {
  const { user, role, logout } = useAuth()
  const sections = navForRole(role)

  return (
    <div className="flex h-full flex-col border-r border-ink-200 bg-ink-50">
      <div className="flex h-16 shrink-0 items-center border-b border-ink-200 px-6">
        <span className="font-display text-[22px] leading-none text-ink-950">Plantvest</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {sections.map((section) => (
          <div key={section.label} className="mb-6 last:mb-0">
            <p className="meta-label px-3 pb-2">{section.label}</p>

            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'relative block rounded-control px-3 py-2 text-body transition-colors duration-150 ease-out',
                    isActive
                      ? 'bg-ink-100 font-medium text-ink-950 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-ink-950'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="shrink-0 border-t border-ink-200 px-6 py-4">
          <p className="truncate text-body font-medium text-ink-950">{user.name}</p>
          <p className="mt-0.5 truncate font-mono text-meta uppercase text-ink-400">
            {ROLE_LABELS[role] ?? role}
            {user.branch ? ` · ${user.branch}` : ''}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 text-[13px] text-ink-600 transition-colors duration-150 ease-out hover:text-ink-950"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
