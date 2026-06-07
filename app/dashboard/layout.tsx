import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { MobileNav } from '@/components/mobile-nav'
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <DashboardSidebar />

        {/* Main area */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {/* Mobile-only top bar */}
          <MobileHeader />

          {/* Scrollable content — pb-20 clears the mobile bottom nav */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 py-5 pb-24 lg:px-6 lg:py-6 lg:pb-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </ProtectedRoute>
  )
}
