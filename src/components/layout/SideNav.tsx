import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Logo } from '@/components/layout/Logo'
import { NAV_ITEMS, SETTINGS_ITEM } from '@/data/navigation'
import { DEFAULT_JOURNEY_WEEKS } from '@/lib/constants'
import { cn } from '@/utils/cn'

const ITEM_BASE =
  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150'

/** Persistent sidebar on tablets/desktop; hidden on phones. */
export function SideNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-base-raised md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo subtitle={`${DEFAULT_JOURNEY_WEEKS}-week journey tracker`} />
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                ITEM_BASE,
                isActive
                  ? 'bg-accent-dim text-accent-strong'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={19} strokeWidth={isActive ? 2 : 1.75} />
                <span className="flex-1">{item.label}</span>
                <span className="hidden text-[11px] text-ink-3 group-hover:block">
                  {item.description}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <NavLink
          to={SETTINGS_ITEM.path}
          className={({ isActive }) =>
            cn(
              ITEM_BASE,
              isActive
                ? 'bg-accent-dim text-accent-strong'
                : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <Icon name={SETTINGS_ITEM.icon} size={19} />
          <span>{SETTINGS_ITEM.label}</span>
        </NavLink>
        <p className="px-3 pt-2 text-[11px] leading-relaxed text-ink-3">
          v{__APP_VERSION__} · Offline-first, all data stays on this device
        </p>
      </div>
    </aside>
  )
}
