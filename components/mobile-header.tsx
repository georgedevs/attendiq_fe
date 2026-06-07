'use client'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

export function MobileHeader() {
  return (
    <header className="lg:hidden flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <Logo />
      <ThemeToggle />
    </header>
  )
}
