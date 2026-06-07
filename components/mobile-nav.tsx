'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, CalendarDays, ClipboardList, GraduationCap, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStoredRole } from '@/lib/auth'
import { useEffect, useState } from 'react'

const studentItems = [
  { label: 'Home',       href: '/dashboard/student',            icon: Home,         exact: true },
  { label: 'Attendance', href: '/dashboard/student/attendance', icon: ClipboardList },
  { label: 'Profile',    href: '/profile',                      icon: User },
]

const lecturerItems = [
  { label: 'Home',     href: '/dashboard/lecturer',          icon: Home,         exact: true },
  { label: 'Courses',  href: '/dashboard/lecturer/courses',  icon: GraduationCap },
  { label: 'Sessions', href: '/dashboard/lecturer/sessions', icon: CalendarDays },
  { label: 'Profile',  href: '/profile',                     icon: User },
]

export function MobileNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => { setRole(getStoredRole()) }, [])

  const items = role === 'lecturer' ? lecturerItems : studentItems

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border">
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon
                className={cn('h-5 w-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={active ? 2.5 : 1.75}
              />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
