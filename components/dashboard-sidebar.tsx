'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BookOpen, CalendarDays, ClipboardList,
  ChevronLeft, ChevronRight, GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { getStoredRole } from '@/lib/auth'

const studentNav = [
  { label: 'Overview',   href: '/dashboard/student',            icon: Home,         exact: true },
  { label: 'Attendance', href: '/dashboard/student/attendance', icon: ClipboardList },
]

const lecturerNav = [
  { label: 'Overview', href: '/dashboard/lecturer',          icon: Home,         exact: true },
  { label: 'Courses',  href: '/dashboard/lecturer/courses',  icon: GraduationCap },
  { label: 'Sessions', href: '/dashboard/lecturer/sessions', icon: CalendarDays },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(getStoredRole())
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) setCollapsed(JSON.parse(saved))
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(next))
  }

  const nav = role === 'lecturer' ? lecturerNav : studentNav

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-56'
      )}
    >
      {/* Logo row */}
      <div className="flex h- items-center justify-between border-b border-border px-3">
        {!collapsed && <Logo />}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 shrink-0 ml-auto text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg p-3 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                collapsed && 'justify-center px-0'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 1.75} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-0.5">
        <ThemeToggle showLabel={!collapsed} className={cn(collapsed && 'w-full justify-center')} />
        <UserProfileMenu isCollapsed={collapsed} />
      </div>
    </aside>
  )
}
