import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { NAV_ITEMS } from '@/data/navigation'
import { cn } from '@/utils/cn'

/** Fixed bottom tab bar — the primary navigation on phones. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/92 backdrop-blur-xl md:hidden"
    >
      <ul className="safe-bottom mx-auto grid max-w-lg grid-cols-5 px-1.5">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2',
                  'text-[10.5px] font-medium tracking-tight transition-colors duration-150',
                  isActive ? 'text-accent-strong' : 'text-ink-3 hover:text-ink-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150',
                      isActive ? 'bg-accent-dim' : 'bg-transparent',
                    )}
                  >
                    <Icon name={item.icon} size={20} strokeWidth={isActive ? 2 : 1.75} />
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
