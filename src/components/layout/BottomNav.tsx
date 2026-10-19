import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { PRIMARY_NAV_ITEMS } from '@/data/navigation'
import { cn } from '@/utils/cn'

/** Fixed bottom tab bar — the primary navigation on phones. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 backdrop-blur-xl md:hidden safe-bottom"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 min-h-[4rem]',
                  'transition-colors duration-150',
                  isActive
                    ? 'text-accent-strong'
                    : 'text-ink-3 hover:text-ink-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150',
                      isActive ? 'bg-accent-dim' : 'hover:bg-surface-2',
                    )}
                  >
                    <Icon name={item.icon} size={20} strokeWidth={isActive ? 2 : 1.75} />
                  </span>
                  <span className="text-[11px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
