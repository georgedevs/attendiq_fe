'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, Home, BookOpen, CalendarDays, ClipboardList, GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { getStoredRole } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function DashboardHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const role = getStoredRole()

  const nav =
    role === 'lecturer'
      ? [
          { name: 'Overview', href: '/dashboard/lecturer', icon: Home, exact: true },
          { name: 'Courses', href: '/dashboard/lecturer/courses', icon: GraduationCap },
          { name: 'Sessions', href: '/dashboard/lecturer/sessions', icon: CalendarDays },
        ]
      : [
          { name: 'Overview', href: '/dashboard/student', icon: Home, exact: true },
          { name: 'My Courses', href: '/dashboard/student/courses', icon: BookOpen },
          { name: 'Attendance', href: '/dashboard/student/attendance', icon: ClipboardList },
        ]

  return (
    <header className="flex h-16 items-center border-b border-border bg-card px-4 md:px-6 lg:hidden">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 justify-center">
        <Logo />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="w-64 h-full bg-card border-r border-border flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 items-center border-b border-border px-4">
              <Logo />
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {nav.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-border p-4">
              <UserProfileMenu />
            </div>
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
    </header>
  )
}
