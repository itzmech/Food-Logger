import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { SideNav } from '@/components/layout/SideNav'
import { TopBar } from '@/components/layout/TopBar'

/**
 * Application shell.
 *
 * Mobile: sticky top bar + fixed bottom tab bar.
 * Desktop (md+): persistent sidebar, content column centred.
 */
export function AppLayout() {
  const location = useLocation()

  // Each route starts at the top — important with a fixed bottom bar.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: location.pathname ? 'instant' : 'auto' })
  }, [location.pathname])

  return (
    <div className="min-h-dvh bg-base">
      <SideNav />

      <div className="md:pl-64">
        <TopBar />
        <main
          className="pb-nav mx-auto w-full max-w-3xl px-4 pt-4 md:max-w-4xl md:px-8 md:pt-8"
          style={{ minHeight: 'calc(100dvh - env(safe-area-inset-top))' }}
        >
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
