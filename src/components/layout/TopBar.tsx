import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Logo } from '@/components/layout/Logo'
import { SETTINGS_ITEM } from '@/data/navigation'

/** Compact app bar shown on phones; the sidebar replaces it on desktop. */
export function TopBar() {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-base/85 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="rounded-xl" aria-label="Go to dashboard">
          <Logo size={28} />
        </Link>

        <Link
          to={SETTINGS_ITEM.path}
          aria-label={SETTINGS_ITEM.label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icon name={SETTINGS_ITEM.icon} size={20} />
        </Link>
      </div>
    </header>
  )
}
